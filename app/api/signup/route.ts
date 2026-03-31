import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

function generateReferralCode(name: string): string {
  const prefix = (name || "DR")
    .replace(/^Dr\.?\s*/i, "")
    .split(/\s+/)[0]
    .toUpperCase()
    .slice(0, 4);
  const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      email,
      full_name,
      qualifications,
      registration_number,
      state_medical_council,
      clinic_name,
      clinic_city,
      clinic_state,
      phone,
    } = body;

    console.log("[signup API] received insert request for userId:", userId, "email:", email);

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const referral_code = generateReferralCode(full_name);

    const { error } = await supabaseAdmin.from("doctors").insert({
      id: userId,
      email,
      full_name,
      qualifications,
      registration_number,
      state_medical_council,
      clinic_name,
      clinic_city,
      clinic_state,
      phone,
      referral_code,
    });

    if (error) {
      console.error("[signup API] doctors insert error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        full: error,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[signup API] doctors row inserted successfully for:", userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[signup API] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
