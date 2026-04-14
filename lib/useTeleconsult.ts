"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Appointment } from "./types";

// Client-side teleconsult helpers. All DAILY_API_KEY interactions
// happen server-side via /api/teleconsult/* routes.

interface RoomResponse {
  url: string;
  name: string;
  provider: "daily" | "jitsi" | "agora" | "other";
  exp: number;
}

interface TokenResponse {
  token: string;
  url: string;
  name: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(json?.error ?? `HTTP ${res.status}`);
  }
  return json as T;
}

// Ensure a room exists for the given appointment. Idempotent —
// returns cached room URL if one is already stored and not past expiry.
export async function ensureRoomForAppointment(
  appointmentId: string
): Promise<RoomResponse> {
  return postJson<RoomResponse>("/api/teleconsult/room", { appointmentId });
}

// Mint a short-lived meeting token for joining a specific appointment's
// room. `asRole` controls is_owner flag (doctor=true, patient=false).
export async function mintTeleconsultToken(params: {
  appointmentId?: string;
  roomName?: string;
  userName: string;
  asRole: "doctor" | "patient";
}): Promise<TokenResponse> {
  return postJson<TokenResponse>("/api/teleconsult/token", params);
}

// Mark session started. Schema trigger computes duration on end.
export async function startTeleconsult(
  appointmentId: string
): Promise<{ appointment: Appointment | null; roomUrl: string | null; token: string | null; error: Error | null }> {
  try {
    const room = await ensureRoomForAppointment(appointmentId);
    const tok = await mintTeleconsultToken({
      appointmentId,
      userName: "Doctor",
      asRole: "doctor",
    });

    const { data, error } = await supabase
      .from("appointments")
      .update({
        teleconsult_started_at: new Date().toISOString(),
        teleconsult_doctor_joined_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return {
      appointment: (data as Appointment) ?? null,
      roomUrl: room.url,
      token: tok.token,
      error: null,
    };
  } catch (err) {
    return {
      appointment: null,
      roomUrl: null,
      token: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

export async function endTeleconsult(
  appointmentId: string,
  notes?: string | null
): Promise<{ appointment: Appointment | null; error: Error | null }> {
  const patch: Record<string, unknown> = {
    teleconsult_ended_at: new Date().toISOString(),
  };
  if (notes !== undefined && notes !== null) patch.teleconsult_notes = notes;

  const { data, error } = await supabase
    .from("appointments")
    .update(patch)
    .eq("id", appointmentId)
    .select("*")
    .single();

  return {
    appointment: (data as Appointment) ?? null,
    error: error ? new Error(error.message) : null,
  };
}

// Active-session lookup for PiP "resume call" UI.
export async function fetchActiveTeleconsult(
  doctorId: string
): Promise<Appointment | null> {
  if (!doctorId) return null;
  const { data, error } = await supabase
    .from("appointments")
    .select("*, patients(id, name)")
    .eq("doctor_id", doctorId)
    .eq("is_teleconsult", true)
    .not("teleconsult_started_at", "is", null)
    .is("teleconsult_ended_at", null)
    .order("teleconsult_started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as Appointment;
}

export function useActiveTeleconsult(doctorId: string | null | undefined) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      setAppointment(await fetchActiveTeleconsult(doctorId));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) {
      setAppointment(null);
      return;
    }
    refresh();
  }, [doctorId, refresh]);

  return { appointment, loading, refresh };
}

// Public patient join flow (called from /teleconsult/[room] page).
// Accepts the public room name + user-entered name, returns the URL
// + a short-lived non-owner token. Stamps patient_joined_at best-effort.
export async function joinTeleconsultAsPatient(params: {
  roomName: string;
  userName: string;
  appointmentId?: string;
}): Promise<TokenResponse> {
  return postJson<TokenResponse>("/api/teleconsult/token", {
    roomName: params.roomName,
    appointmentId: params.appointmentId,
    userName: params.userName,
    asRole: "patient",
  });
}

// Mark that a participant joined (called from UI when Daily emits
// "participant-joined" locally; server-side events endpoint is a
// future enhancement).
export async function recordParticipantJoined(
  appointmentId: string,
  who: "doctor" | "patient"
): Promise<void> {
  const col =
    who === "doctor"
      ? "teleconsult_doctor_joined_at"
      : "teleconsult_patient_joined_at";
  await supabase
    .from("appointments")
    .update({ [col]: new Date().toISOString() })
    .eq("id", appointmentId);
}
