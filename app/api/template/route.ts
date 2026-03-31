import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from("prescription_templates")
      .insert({
        doctor_id: body.doctor_id,
        name: body.name,
        condition: body.condition,
        condition_display: body.condition_display,
        category: body.category,
        medicines: body.medicines,
        special_instructions: body.special_instructions,
        follow_up_days: body.follow_up_days,
        is_system: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[template API] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[template API] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
