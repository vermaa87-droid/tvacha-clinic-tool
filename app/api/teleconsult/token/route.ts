import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  createMeetingToken,
  createRoom,
  getRoom,
  roomExpiryFromAppointment,
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

// POST /api/teleconsult/token
// Body (doctor):  { appointmentId, userName, asRole: "doctor" }
// Body (patient): { roomName | appointmentId, userName, asRole: "patient" }
// Returns: { token, url, name }
//
// Doctor tokens require an authenticated Supabase session matching the
// appointment's doctor_id. Patient tokens are mintable by anyone who
// has the (unguessable) room name — this is the "public join" flow
// from /teleconsult/[room]. Rooms themselves are privacy=private, so
// knowing the URL is not enough to join without a token.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      appointmentId?: string;
      roomName?: string;
      userName?: string;
      asRole?: "doctor" | "patient";
    };

    if (!body.userName || !body.asRole) {
      return NextResponse.json(
        { error: "userName and asRole required" },
        { status: 400 }
      );
    }

    let roomName = body.roomName ?? null;
    let roomUrl: string | null = null;
    let exp: number | null = null;

    // Doctor path — must be authenticated and own the appointment.
    if (body.asRole === "doctor") {
      const userId = await getSessionUserId();
      if (!userId) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 }
        );
      }
      if (!body.appointmentId) {
        return NextResponse.json(
          { error: "appointmentId required for doctor tokens" },
          { status: 400 }
        );
      }

      const { data: appt } = await supabaseAdmin
        .from("appointments")
        .select(
          "id, doctor_id, appointment_date, appointment_time, teleconsult_room_name, teleconsult_room_url"
        )
        .eq("id", body.appointmentId)
        .maybeSingle();

      if (!appt) {
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 }
        );
      }
      if (appt.doctor_id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      exp = roomExpiryFromAppointment(
        appt.appointment_date,
        appt.appointment_time
      );

      // Provision room on-the-fly if somehow not yet created.
      if (!appt.teleconsult_room_name || !appt.teleconsult_room_url) {
        const room = await createRoom({
          privacy: "private",
          expiresAtUnix: exp,
          enableChat: true,
          enableKnocking: true,
        });
        roomName = room.name;
        roomUrl = room.url;
        await supabaseAdmin
          .from("appointments")
          .update({
            is_teleconsult: true,
            teleconsult_room_url: room.url,
            teleconsult_room_name: room.name,
            teleconsult_provider: "daily",
          })
          .eq("id", appt.id);
      } else {
        roomName = appt.teleconsult_room_name;
        roomUrl = appt.teleconsult_room_url;
      }
    } else {
      // Patient path — public join. Either roomName directly, or
      // derive it from appointmentId (for link-based join flows).
      if (!roomName && body.appointmentId) {
        const { data: appt } = await supabaseAdmin
          .from("appointments")
          .select(
            "teleconsult_room_name, teleconsult_room_url, appointment_date, appointment_time"
          )
          .eq("id", body.appointmentId)
          .maybeSingle();
        if (appt?.teleconsult_room_name) {
          roomName = appt.teleconsult_room_name;
          roomUrl = appt.teleconsult_room_url;
          exp = roomExpiryFromAppointment(
            appt.appointment_date,
            appt.appointment_time
          );
        }
      }

      if (!roomName) {
        return NextResponse.json(
          { error: "roomName or appointmentId required" },
          { status: 400 }
        );
      }

      // Verify room exists at Daily (also gets its URL if we don't have it).
      const existing = await getRoom(roomName);
      if (!existing) {
        return NextResponse.json(
          { error: "Room not found or expired" },
          { status: 404 }
        );
      }
      roomUrl = existing.url;
      const roomExp = (existing.config as any)?.exp as number | undefined;
      if (roomExp) exp = roomExp;
    }

    if (!roomName || !roomUrl) {
      return NextResponse.json(
        { error: "Failed to resolve room" },
        { status: 500 }
      );
    }

    // Meeting token: 3h default, or the room exp (whichever is sooner).
    const nowSec = Math.floor(Date.now() / 1000);
    const defaultExp = nowSec + 3 * 60 * 60;
    const tokenExp = exp ? Math.min(exp, defaultExp) : defaultExp;

    const { token } = await createMeetingToken({
      roomName,
      userName: body.userName,
      isOwner: body.asRole === "doctor",
      expiresAtUnix: tokenExp,
    });

    // Best-effort patient join stamp (only when appointmentId was
    // provided; avoids broad writes on public room names).
    if (body.asRole === "patient" && body.appointmentId) {
      await supabaseAdmin
        .from("appointments")
        .update({
          teleconsult_patient_joined_at: new Date().toISOString(),
        })
        .eq("id", body.appointmentId);
    }

    return NextResponse.json({ token, url: roomUrl, name: roomName });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[teleconsult/token]", msg);
    return NextResponse.json(
      { error: "Failed to mint token", reason: msg },
      { status: 500 }
    );
  }
}
