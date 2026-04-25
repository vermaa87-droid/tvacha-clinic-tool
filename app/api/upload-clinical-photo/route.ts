import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-server";

const BUCKET = "patient-photos";
const VALID_TYPES = ["before", "during", "after", "clinical", "dermoscopy"];
const VALID_ANGLES = ["front", "left_profile", "right_profile", "top", "close_up", "other"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const patientId = formData.get("patient_id") as string | null;
    const doctorId = formData.get("doctor_id") as string | null;
    const photoType = (formData.get("photo_type") as string | null) || "clinical";
    const angle = (formData.get("angle") as string | null) || "other";
    const bodyRegion = (formData.get("body_region") as string | null) || null;
    const notes = (formData.get("notes") as string | null) || null;
    const visitId = (formData.get("visit_id") as string | null) || null;
    const packageSessionId = (formData.get("package_session_id") as string | null) || null;
    const takenAt = (formData.get("taken_at") as string | null) || null;
    const subfolder = (formData.get("subfolder") as string | null) || "clinical";

    if (!file || !patientId || !doctorId) {
      return NextResponse.json(
        { error: "Missing required fields: file, patient_id, doctor_id" },
        { status: 400 }
      );
    }
    if (!VALID_TYPES.includes(photoType)) {
      return NextResponse.json({ error: `Invalid photo_type: ${photoType}` }, { status: 400 });
    }
    if (!VALID_ANGLES.includes(angle)) {
      return NextResponse.json({ error: `Invalid angle: ${angle}` }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : "jpg";
    const photoId = randomUUID();
    const safeFolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, "");
    const path = `${patientId}/${safeFolder}/${photoId}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadErr) {
      console.error("[upload-clinical-photo] storage error:", uploadErr);
      return NextResponse.json(
        { error: `Upload failed: ${uploadErr.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const photoUrl = urlData.publicUrl;

    const { data: row, error: insertErr } = await supabaseAdmin
      .from("clinical_photos")
      .insert({
        id: photoId,
        patient_id: patientId,
        doctor_id: doctorId,
        visit_id: visitId,
        package_session_id: packageSessionId,
        photo_url: photoUrl,
        photo_type: photoType,
        body_region: bodyRegion,
        angle,
        notes,
        taken_at: takenAt ?? new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("[upload-clinical-photo] insert error:", insertErr);
      // Best-effort cleanup of the orphaned upload
      await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => {});
      return NextResponse.json(
        { error: `Insert failed: ${insertErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: row, photoUrl, path });
  } catch (err) {
    console.error("[upload-clinical-photo] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
