import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  createRoom,
  getRoom,
  roomExpiryFromAppointment,
  DailyApiError,
} from "@/lib/daily";

async function getSessionUserId(): Promise<string | null> {
  const cookieStore = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

// POST /api/teleconsult/room
// Body: { appointmentId: string }
// Returns: { url, name, provider, exp }
// Idempotent: reuses stored room_url if still valid; otherwise creates
// a fresh Daily.co room and persists URL/name on the appointment.
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as { appointmentId?: string };
    if (!body.appointmentId) {
      return NextResponse.json(
        { error: "appointmentId required" },
        { status: 400 }
      );
    }

    const { data: appt, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .select(
        "id, doctor_id, patient_id, appointment_date, appointment_time, duration_minutes, is_teleconsult, teleconsult_room_url, teleconsult_room_name, teleconsult_provider"
      )
      .eq("id", body.appointmentId)
      .maybeSingle();

    if (apptErr || !appt) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Only the owning doctor may provision a room.
    if (appt.doctor_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const exp = roomExpiryFromAppointment(
      appt.appointment_date,
      appt.appointment_time
    );

    // If we already have a room, verify it still exists at Daily and
    // its expiry is in the future; otherwise recreate.
    if (appt.teleconsult_room_name && appt.teleconsult_room_url) {
      try {
        const existing = await getRoom(appt.teleconsult_room_name);
        const existingExp = (existing?.config as any)?.exp as
          | number
          | undefined;
        const nowSec = Math.floor(Date.now() / 1000);
        if (existing && (!existingExp || existingExp > nowSec)) {
          return NextResponse.json({
            url: appt.teleconsult_room_url,
            name: appt.teleconsult_room_name,
            provider: appt.teleconsult_provider ?? "daily",
            exp: existingExp ?? exp,
          });
        }
      } catch (err) {
        if (!(err instanceof DailyApiError) || err.status !== 404) {
          console.error("[teleconsult/room] getRoom failed:", err);
        }
        // fall through to recreate
      }
    }

    const room = await createRoom({
      privacy: "private",
      expiresAtUnix: exp,
      enableChat: true,
      enableKnocking: true,
    });

    await supabaseAdmin
      .from("appointments")
      .update({
        is_teleconsult: true,
        teleconsult_room_url: room.url,
        teleconsult_room_name: room.name,
        teleconsult_provider: "daily",
      })
      .eq("id", appt.id);

    return NextResponse.json({
      url: room.url,
      name: room.name,
      provider: "daily",
      exp,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[teleconsult/room]", msg);
    return NextResponse.json(
      { error: "Failed to provision room", reason: msg },
      { status: 500 }
    );
  }
}
