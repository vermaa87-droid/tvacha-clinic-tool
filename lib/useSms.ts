"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { ClinicSettings, SmsLog } from "./types";

/**
 * Send a test / one-off SMS via our Next.js API route. The MSG91 api key
 * NEVER leaves the server — this route reads it from clinic_settings using
 * the service-role client and redacts it from all logs.
 */
export async function sendTestSMS(params: {
  phone: string;
  message?: string;
  templateId?: string;
  variables?: Record<string, string>;
  patientId?: string;
  appointmentId?: string;
}): Promise<{ ok: boolean; error: string | null; smsLogId: string | null }> {
  try {
    const res = await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: json?.error ?? `HTTP ${res.status}`,
        smsLogId: null,
      };
    }
    return {
      ok: true,
      error: null,
      smsLogId: json.smsLogId ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "network_error",
      smsLogId: null,
    };
  }
}

export interface SmsUsage {
  todayCount: number;
  monthCount: number;
  failedCount: number;
  creditsRemaining: number | null;
  recent: SmsLog[];
}

/**
 * Load SMS usage stats + recent log entries for the dashboard badge.
 * Scoped to the doctor via RLS. Always include clinic_id in the query.
 */
export async function fetchSmsUsage(doctorId: string): Promise<SmsUsage> {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 8) + "01";

  const [todayRes, monthRes, failedRes, recentRes, settingsRes] =
    await Promise.all([
      supabase
        .from("sms_log")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", doctorId)
        .gte("created_at", `${today}T00:00:00`),
      supabase
        .from("sms_log")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", doctorId)
        .gte("created_at", `${firstOfMonth}T00:00:00`),
      supabase
        .from("sms_log")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", doctorId)
        .eq("status", "failed")
        .gte("created_at", `${firstOfMonth}T00:00:00`),
      supabase
        .from("sms_log")
        .select("*")
        .eq("clinic_id", doctorId)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("clinic_settings")
        .select("sms_credits_remaining")
        .eq("clinic_id", doctorId)
        .maybeSingle(),
    ]);

  return {
    todayCount: todayRes.count ?? 0,
    monthCount: monthRes.count ?? 0,
    failedCount: failedRes.count ?? 0,
    creditsRemaining: settingsRes.data?.sms_credits_remaining ?? null,
    recent: (recentRes.data as SmsLog[]) ?? [],
  };
}

/**
 * Save SMS settings — upserts clinic_settings row. Writes msg91_api_key
 * directly to the row (RLS-protected). Never returns it from any hook result.
 */
export async function saveSmsSettings(
  doctorId: string,
  patch: Partial<
    Pick<
      ClinicSettings,
      "msg91_api_key" | "sender_id" | "dlt_entity_id" | "sms_enabled"
    >
  >
): Promise<{ ok: boolean; error: Error | null }> {
  const { error } = await supabase
    .from("clinic_settings")
    .upsert(
      { clinic_id: doctorId, ...patch },
      { onConflict: "clinic_id" }
    );
  return {
    ok: !error,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Hook: loads current settings + usage. Returned `settings` object NEVER
 * includes msg91_api_key — only booleans / non-secret metadata for the UI.
 */
export interface SafeSmsSettings {
  isConfigured: boolean;
  smsEnabled: boolean;
  hasApiKey: boolean;
  senderId: string | null;
  dltEntityId: string | null;
  creditsRemaining: number | null;
}

export function useSms(doctorId: string | null | undefined) {
  const [settings, setSettings] = useState<SafeSmsSettings | null>(null);
  const [usage, setUsage] = useState<SmsUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    setError(null);
    try {
      const [cfgRes, usageResult] = await Promise.all([
        supabase
          .from("clinic_settings")
          .select("sms_enabled, sender_id, dlt_entity_id, msg91_api_key, sms_credits_remaining")
          .eq("clinic_id", doctorId)
          .maybeSingle(),
        fetchSmsUsage(doctorId),
      ]);

      if (cfgRes.error) {
        setError(new Error(cfgRes.error.message));
      } else {
        const row = cfgRes.data;
        setSettings({
          isConfigured: !!(row?.msg91_api_key && row?.sender_id && row?.dlt_entity_id),
          smsEnabled: !!row?.sms_enabled,
          hasApiKey: !!row?.msg91_api_key,
          senderId: row?.sender_id ?? null,
          dltEntityId: row?.dlt_entity_id ?? null,
          creditsRemaining: row?.sms_credits_remaining ?? null,
        });
      }
      setUsage(usageResult);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) {
      setSettings(null);
      setUsage(null);
      return;
    }
    refresh();
  }, [doctorId, refresh]);

  const saveSettings = useCallback(
    async (
      patch: Partial<
        Pick<
          ClinicSettings,
          "msg91_api_key" | "sender_id" | "dlt_entity_id" | "sms_enabled"
        >
      >
    ) => {
      if (!doctorId) return { ok: false, error: new Error("no doctor") };
      const r = await saveSmsSettings(doctorId, patch);
      await refresh();
      return r;
    },
    [doctorId, refresh]
  );

  return { settings, usage, loading, error, refresh, saveSettings, sendTestSMS };
}
