import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

const BUCKET = "patient-photos";

/**
 * Extract the in-bucket object path from a Supabase public URL.
 * URL pattern: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
 * (also handles "/object/sign/" for signed URLs and "/object/{bucket}/" with no /public).
 */
function pathFromUrl(url: string, bucket: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = `/${bucket}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const photoId = (body.photo_id as string | undefined) ?? null;
    const doctorId = (body.doctor_id as string | undefined) ?? null;

    if (!photoId || !doctorId) {
      return NextResponse.json(
        { error: "Missing required fields: photo_id, doctor_id" },
        { status: 400 }
      );
    }

    // 1. Fetch the row (admin — bypasses RLS) and verify ownership in app code.
    const { data: photo, error: fetchErr } = await supabaseAdmin
      .from("clinical_photos")
      .select("id, doctor_id, photo_url")
      .eq("id", photoId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json(
        { error: `Lookup failed: ${fetchErr.message}` },
        { status: 500 }
      );
    }
    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }
    if (photo.doctor_id !== doctorId) {
      return NextResponse.json(
        { error: "Not authorised to delete this photo" },
        { status: 403 }
      );
    }

    // 2. Best-effort delete the storage file. If the file is already gone we
    //    still want to clean the DB row, so don't bail on storage errors.
    const path = pathFromUrl(photo.photo_url ?? "", BUCKET);
    let storageWarning: string | null = null;
    if (path) {
      const { error: removeErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([path]);
      if (removeErr) {
        console.warn("[delete-clinical-photo] storage remove warning:", removeErr.message);
        storageWarning = removeErr.message;
      }
    } else {
      storageWarning = "Could not derive storage path from photo_url";
    }

    // 3. Delete the DB row.
    const { error: deleteErr } = await supabaseAdmin
      .from("clinical_photos")
      .delete()
      .eq("id", photoId);

    if (deleteErr) {
      return NextResponse.json(
        { error: `DB delete failed: ${deleteErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, storageWarning });
  } catch (err) {
    console.error("[delete-clinical-photo] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
