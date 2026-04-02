import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("[supabase] URL:", supabaseUrl ?? "MISSING");
console.log("[supabase] Anon key present:", !!supabaseAnonKey);

// Wrap fetch with a 15-second timeout so queries never hang indefinitely
// (e.g. when a free-tier Supabase project is waking from auto-pause).
function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), 15_000);
  const signal = init?.signal
    ? (AbortSignal as any).any
      ? (AbortSignal as any).any([init.signal, controller.signal])
      : controller.signal
    : controller.signal;
  return fetch(input, { ...init, signal }).finally(() =>
    clearTimeout(timerId)
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
  global: {
    fetch: fetchWithTimeout,
    headers: {
      "X-Client-Info": "tvacha-clinic-tool",
    },
  },
});
