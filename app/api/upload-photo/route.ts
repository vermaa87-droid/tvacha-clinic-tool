import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const patientId = formData.get("patient_id") as string;
    const doctorId = formData.get("doctor_id") as string;
    const bodyLocation = formData.get("body_location") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!file || !patientId || !doctorId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Upload to Supabase Storage
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${patientId}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("patient-photos")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      // If bucket doesn't exist, create it and retry
      if (uploadError.message.includes("not found") || uploadError.message.includes("Bucket")) {
        await supabaseAdmin.storage.createBucket("patient-photos", {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });
        const { error: retryError } = await supabaseAdmin.storage
          .from("patient-photos")
          .upload(fileName, buffer, { contentType: file.type, upsert: false });
        if (retryError) {
          console.error("[upload] retry error:", retryError);
          return NextResponse.json({ error: retryError.message }, { status: 500 });
        }
      } else {
        console.error("[upload] storage error:", uploadError);
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
    }

    // Ensure bucket is public
    await supabaseAdmin.storage.updateBucket("patient-photos", { public: true });

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("patient-photos")
      .getPublicUrl(fileName);

    console.log("[upload] public URL:", urlData.publicUrl);

    // Insert record into patient_photos table
    const { data, error: insertError } = await supabaseAdmin
      .from("patient_photos")
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        photo_url: urlData.publicUrl,
        body_location: bodyLocation || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      // Table might not exist - create it
      if (insertError.message.includes("relation") && insertError.message.includes("does not exist")) {
        // Return the URL even without DB record
        return NextResponse.json({
          data: {
            id: "temp-" + Date.now(),
            photo_url: urlData.publicUrl,
            body_location: bodyLocation,
            notes,
            created_at: new Date().toISOString(),
          },
          warning: "Photo uploaded but patient_photos table does not exist. Run the SQL to create it.",
        });
      }
      console.error("[upload] insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[upload] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
