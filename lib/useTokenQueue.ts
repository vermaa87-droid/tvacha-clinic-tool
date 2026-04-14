"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { DailyToken } from "./types";

function todayInIndia(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

export async function fetchTodayQueue(
  doctorId: string,
  date: string = todayInIndia()
): Promise<DailyToken[]> {
  const { data, error } = await supabase
    .from("daily_tokens")
    .select("*, patients(*)")
    .eq("doctor_id", doctorId)
    .eq("token_date", date)
    .order("token_number", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DailyToken[];
}

export async function nextTokenNumber(
  clinicId: string,
  date: string = todayInIndia()
): Promise<number> {
  const { data, error } = await supabase.rpc("next_daily_token_number", {
    p_clinic_id: clinicId,
    p_date: date,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 1;
}

export interface CreateTokenParams {
  clinicId: string;
  doctorId: string;
  patientId?: string | null;
  walkInName?: string | null;
  walkInPhone?: string | null;
  chiefComplaint?: string | null;
}

export async function createToken(params: CreateTokenParams): Promise<DailyToken> {
  const date = todayInIndia();
  const number = await nextTokenNumber(params.clinicId, date);
  const payload = {
    clinic_id: params.clinicId,
    doctor_id: params.doctorId,
    patient_id: params.patientId ?? null,
    token_number: number,
    token_date: date,
    walk_in_name: params.walkInName ?? null,
    walk_in_phone: params.walkInPhone ?? null,
    chief_complaint: params.chiefComplaint ?? null,
    status: "waiting" as const,
  };
  const { data, error } = await supabase
    .from("daily_tokens")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as DailyToken;
}

export async function updateTokenStatus(
  tokenId: string,
  status: DailyToken["status"]
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "in_consultation") patch.called_at = new Date().toISOString();
  if (status === "done") patch.completed_at = new Date().toISOString();
  const { error } = await supabase.from("daily_tokens").update(patch).eq("id", tokenId);
  if (error) throw new Error(error.message);
}

export function useTokenQueue(doctorId: string | null | undefined) {
  const [tokens, setTokens] = useState<DailyToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const date = todayInIndia();

  const refetch = useCallback(async () => {
    if (!doctorId) return;
    try {
      const rows = await fetchTodayQueue(doctorId, date);
      setTokens(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [doctorId, date]);

  useEffect(() => {
    if (!doctorId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    refetch();

    const channel = supabase
      .channel(`daily_tokens:${doctorId}:${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_tokens",
          filter: `doctor_id=eq.${doctorId}`,
        },
        () => {
          if (!cancelled) refetch();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [doctorId, date, refetch]);

  return { tokens, loading, error, refetch };
}
