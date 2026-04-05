import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

async function ensureBucket(): Promise<string | null> {
  const BUCKET = "patient-photos";

  const { error: checkError } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!checkError) {
    // Bucket exists — make sure it's public
    await supabaseAdmin.storage.updateBucket(BUCKET, { public: true });
    return null;
  }

  // Bucket doesn't exist — create it
  console.log("[save-patient-media] bucket not found, creating...");
  const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10485760, // 10 MB
  });
  if (createError) {
    console.error("[save-patient-media] failed to create bucket:", createError);
    return createError.message;
  }

  console.log("[save-patient-media] bucket created successfully");
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const patientId = formData.get("patient_id") as string;
    const doctorId = formData.get("doctor_id") as string;
    const bodyLocation = formData.get("body_location") as string | null;

    if (!patientId || !doctorId) {
      return NextResponse.json({ error: "Missing patient_id or doctor_id" }, { status: 400 });
    }

    // Ensure bucket is ready before any uploads
    const bucketError = await ensureBucket();
    if (bucketError) {
      return NextResponse.json(
        { error: `Storage bucket setup failed: ${bucketError}`, photoCount: 0, recordCount: 0, failedPhotos: 0 },
        { status: 500 }
      );
    }

    const photoRows: {
      patient_id: string;
      doctor_id: string;
      photo_url: string;
      photo_type: string;
      body_location: string | null;
      notes: string;
    }[] = [];

    let failedPhotos = 0;
    let savedRecordCount = 0;

    // ── Upload skin-scan photos ───────────────────────────────────────────────
    const photoFiles = formData.getAll("photos") as File[];
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const path = `${doctorId}/${patientId}/${Date.now()}_photo_${i + 1}.jpg`;
        console.log(`[save-patient-media] uploading photo ${i + 1}: ${path} (${buffer.length} bytes)`);

        const { error: uploadError } = await supabaseAdmin.storage
          .from("patient-photos")
          .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

        if (uploadError) {
          console.error(`[save-patient-media] photo ${i + 1} upload error:`, uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from("patient-photos")
          .getPublicUrl(path);

        photoRows.push({
          patient_id: patientId,
          doctor_id: doctorId,
          photo_url: publicUrl,
          photo_type: "skin_scan",
          body_location: bodyLocation,
          notes: `Intake photo ${i + 1} of ${photoFiles.length}`,
        });
        console.log(`[save-patient-media] photo ${i + 1} uploaded OK → ${publicUrl}`);
      } catch (err) {
        console.error("[save-patient-media] photo upload failed:", err);
        failedPhotos++;
      }
    }

    // ── Upload medical records ────────────────────────────────────────────────
    const recordFiles = formData.getAll("records") as File[];
    for (const file of recordFiles) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const path = `${doctorId}/${patientId}/records/${Date.now()}_${file.name}`;
        console.log(`[save-patient-media] uploading record: ${path} (${buffer.length} bytes)`);

        const { error: uploadError } = await supabaseAdmin.storage
          .from("patient-photos")
          .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true });

        if (uploadError) {
          console.error(`[save-patient-media] record upload error:`, uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from("patient-photos")
          .getPublicUrl(path);

        photoRows.push({
          patient_id: patientId,
          doctor_id: doctorId,
          photo_url: publicUrl,
          photo_type: "medical_record",
          body_location: null,
          notes: file.name,
        });
        savedRecordCount++;
        console.log(`[save-patient-media] record uploaded OK → ${publicUrl}`);
      } catch (err) {
        console.error("[save-patient-media] record upload failed:", err);
      }
    }

    // ── Insert metadata rows into photos table ────────────────────────────────
    if (photoRows.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("photos").insert(photoRows);
      if (insertError) {
        console.error("[save-patient-media] photos table insert error:", insertError);
        return NextResponse.json(
          {
            error: `Files uploaded to storage but failed to save metadata: ${insertError.message}`,
            photoCount: photoFiles.length - failedPhotos,
            recordCount: savedRecordCount,
            failedPhotos,
          },
          { status: 500 }
        );
      }
    }

    const skinScanUrls = photoRows
      .filter((r) => r.photo_type === "skin_scan")
      .map((r) => r.photo_url);

    return NextResponse.json({
      photoCount: photoFiles.length - failedPhotos,
      recordCount: savedRecordCount,
      failedPhotos,
      photoUrls: skinScanUrls,
    });
  } catch (err) {
    console.error("[save-patient-media] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
