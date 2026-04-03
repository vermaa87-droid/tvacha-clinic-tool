import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const patientId = formData.get("patient_id") as string;
    const doctorId = formData.get("doctor_id") as string;
    const bodyLocation = formData.get("body_location") as string | null;

    if (!patientId || !doctorId) {
      return NextResponse.json({ error: "Missing patient_id or doctor_id" }, { status: 400 });
    }

    // Ensure the bucket exists (create it if not)
    const { error: bucketCheckError } = await supabaseAdmin.storage.getBucket("patient-photos");
    if (bucketCheckError) {
      await supabaseAdmin.storage.createBucket("patient-photos", {
        public: true,
        fileSizeLimit: 10485760, // 10 MB
      });
    } else {
      // Ensure it stays public so URLs work
      await supabaseAdmin.storage.updateBucket("patient-photos", { public: true });
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
        const { error: uploadError } = await supabaseAdmin.storage
          .from("patient-photos")
          .upload(path, buffer, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
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
        const { error: uploadError } = await supabaseAdmin.storage
          .from("patient-photos")
          .upload(path, buffer, { contentType: file.type || "application/octet-stream" });
        if (uploadError) throw uploadError;
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

    return NextResponse.json({
      photoCount: photoFiles.length - failedPhotos,
      recordCount: savedRecordCount,
      failedPhotos,
    });
  } catch (err) {
    console.error("[save-patient-media] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
