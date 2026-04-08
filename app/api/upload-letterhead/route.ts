import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const doctorId = formData.get("doctorId") as string;
    const type = formData.get("type") as "signature" | "logo";
    const file = formData.get("file") as File;

    if (!doctorId || !type || !file) {
      return NextResponse.json({ error: "Missing doctorId, type, or file" }, { status: 400 });
    }

    // Ensure bucket exists
    await supabaseAdmin.storage
      .createBucket("doctor-assets", { public: true, fileSizeLimit: 5242880 })
      .catch(() => {});

    // Upload file
    const ext = file.name.split(".").pop() || "png";
    const path = `${doctorId}/${type}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from("doctor-assets")
      .upload(path, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[upload-letterhead] upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("doctor-assets")
      .getPublicUrl(path);

    // Update doctor record
    const field = type === "signature" ? "signature_url" : "logo_url";
    await supabaseAdmin
      .from("doctors")
      .update({ [field]: urlData.publicUrl })
      .eq("id", doctorId);

    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (err) {
    console.error("[upload-letterhead] error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
