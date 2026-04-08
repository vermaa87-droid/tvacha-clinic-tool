import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  try {
    // Try to add columns — if they already exist, the update will just work
    // We do this by attempting to update with the new fields; if columns don't exist, we catch it

    // First, try a select to see if columns exist
    const { error: checkError } = await supabaseAdmin
      .from("doctors")
      .select("signature_url, logo_url")
      .limit(1);

    if (checkError && checkError.message.includes("does not exist")) {
      // Columns don't exist — we need to add them via Supabase Dashboard SQL editor
      return NextResponse.json({
        success: false,
        message: "Columns signature_url and logo_url do not exist in the doctors table. Please add them via the Supabase Dashboard SQL Editor:",
        sql: "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS signature_url TEXT;\nALTER TABLE doctors ADD COLUMN IF NOT EXISTS logo_url TEXT;",
      });
    }

    return NextResponse.json({ success: true, message: "Columns already exist" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
