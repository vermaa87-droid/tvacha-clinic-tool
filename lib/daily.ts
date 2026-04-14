// Server-only Daily.co REST client.
// DAILY_API_KEY must never be sent to the browser — this file has no
// "use client" directive and is only imported from app/api routes.

const DAILY_API_BASE = "https://api.daily.co/v1";

export class DailyApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string, message?: string) {
    super(message ?? `Daily API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

function authHeaders(): HeadersInit {
  const key = process.env.DAILY_API_KEY;
  if (!key) {
    throw new Error("DAILY_API_KEY is not configured");
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function dailyFetch<T>(
  path: string,
  init: RequestInit & { method: string }
): Promise<T> {
  const res = await fetch(`${DAILY_API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new DailyApiError(res.status, text);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
  privacy: "public" | "private";
  config: Record<string, unknown>;
}

export interface CreateRoomOptions {
  name?: string;
  privacy?: "public" | "private";
  expiresAtUnix?: number;
  enableChat?: boolean;
  enableRecording?: "cloud" | "local" | "off" | null;
  enableKnocking?: boolean;
  maxParticipants?: number;
}

export async function createRoom(opts: CreateRoomOptions = {}): Promise<DailyRoom> {
  const body: Record<string, unknown> = {
    privacy: opts.privacy ?? "private",
    properties: {
      exp: opts.expiresAtUnix,
      enable_chat: opts.enableChat ?? true,
      enable_knocking: opts.enableKnocking ?? true,
      enable_recording: opts.enableRecording ?? undefined,
      max_participants: opts.maxParticipants,
    },
  };
  if (opts.name) body.name = opts.name;
  // Strip undefined properties so Daily doesn't reject.
  body.properties = Object.fromEntries(
    Object.entries(body.properties as Record<string, unknown>).filter(
      ([, v]) => v !== undefined
    )
  );

  return dailyFetch<DailyRoom>("/rooms", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getRoom(name: string): Promise<DailyRoom | null> {
  try {
    return await dailyFetch<DailyRoom>(`/rooms/${encodeURIComponent(name)}`, {
      method: "GET",
    });
  } catch (err) {
    if (err instanceof DailyApiError && err.status === 404) return null;
    throw err;
  }
}

export async function deleteRoom(name: string): Promise<void> {
  try {
    await dailyFetch(`/rooms/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  } catch (err) {
    if (err instanceof DailyApiError && err.status === 404) return;
    throw err;
  }
}

export interface MeetingTokenOptions {
  roomName: string;
  userName?: string;
  userId?: string;
  isOwner?: boolean;
  expiresAtUnix?: number;
  enableScreenshare?: boolean;
  enableRecording?: "cloud" | "local" | "off";
}

export async function createMeetingToken(
  opts: MeetingTokenOptions
): Promise<{ token: string }> {
  const body = {
    properties: Object.fromEntries(
      Object.entries({
        room_name: opts.roomName,
        user_name: opts.userName,
        user_id: opts.userId,
        is_owner: opts.isOwner ?? false,
        exp: opts.expiresAtUnix,
        enable_screenshare: opts.enableScreenshare,
        enable_recording: opts.enableRecording,
      }).filter(([, v]) => v !== undefined)
    ),
  };
  return dailyFetch<{ token: string }>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Helper: compute a safe expiry timestamp for an appointment room.
// appointment_datetime + 2 hours (matches task requirement).
export function roomExpiryFromAppointment(
  dateYmd: string,
  timeHms: string,
  extraHours: number = 2
): number {
  const d = new Date(`${dateYmd}T${timeHms}`);
  const ms = d.getTime() + extraHours * 60 * 60 * 1000;
  return Math.floor(ms / 1000);
}
