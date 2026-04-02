import { create } from "zustand";
import { supabase } from "./supabase";
import type { Doctor } from "./types";

// Guard: skip onAuthStateChange doctor-fetch while signup is in progress
let _signupInProgress = false;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[${label}] timed out after ${ms}ms`)), ms)
    ),
  ]);
}

interface AuthState {
  user: { id: string; email: string } | null;
  doctor: Doctor | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, doctorData: Partial<Doctor>) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshDoctor: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  doctor: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      // 1. Immediately check for existing session (synchronous from localStorage)
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // User is logged in — set user immediately, fetch doctor in background
        set({
          user: { id: session.user.id, email: session.user.email! },
          loading: false,
          initialized: true,
        });
        supabase
          .from("doctors")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data: doctor, error }) => {
            if (error) console.error("[store] doctor fetch error:", error);
            if (doctor) set({ doctor });
          });
      } else {
        set({ user: null, doctor: null, loading: false, initialized: true });
      }

      // 2. Listen for future auth changes (login, logout, token refresh)
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("[store] onAuthStateChange event:", event, "signupInProgress:", _signupInProgress);

        if (_signupInProgress) {
          if (session?.user) {
            set({
              user: { id: session.user.id, email: session.user.email! },
              loading: false,
            });
          }
          return;
        }

        // Skip events that don't need action
        if (event === "INITIAL_SESSION") return;
        if (event === "TOKEN_REFRESHED") return;

        if (session?.user) {
          set({
            user: { id: session.user.id, email: session.user.email! },
            loading: false,
            initialized: true,
          });
          // Fetch doctor in background — don't await to avoid blocking
          supabase
            .from("doctors")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle()
            .then(({ data: doctor, error: doctorError }) => {
              if (doctorError) console.error("[store] onAuthStateChange doctors fetch error:", doctorError);
              if (doctor) set({ doctor });
            });
        } else if (event === "SIGNED_OUT") {
          // Only clear user on explicit sign-out, not on transient events
          set({ user: null, doctor: null, loading: false, initialized: true });
        }
      });

      // 3. Re-validate session when tab regains focus
      if (typeof window !== "undefined") {
        document.addEventListener("visibilitychange", async () => {
          if (document.visibilityState !== "visible") return;
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              // Only set user if it actually changed — avoids new object references
              // that trigger useCallback/useEffect cascades in dashboard pages.
              const currentUser = get().user;
              if (!currentUser || currentUser.id !== session.user.id) {
                set({
                  user: { id: session.user.id, email: session.user.email! },
                  loading: false,
                  initialized: true,
                });
              }
              const { data: doctor } = await supabase
                .from("doctors")
                .select("*")
                .eq("id", session.user.id)
                .maybeSingle();
              if (doctor) set({ doctor });
            } else {
              set({ user: null, doctor: null, loading: false, initialized: true });
            }
          } catch (err) {
            console.error("[store] visibilitychange refresh error:", err);
          }
        });
      }
    } catch (err) {
      console.error("[store] initialize error:", err);
      set({ loading: false, initialized: true });
    }
  },

  signUp: async (email, password, doctorData) => {
    _signupInProgress = true;
    try {
      // ── Step 1: Auth signup ──
      console.log("[signUp] ── STEP 1: before auth signup ──");
      console.log("[signUp] email:", email, "password length:", password?.length);

      let authData;
      let authError;
      try {
        const result = await withTimeout(
          supabase.auth.signUp({ email, password }),
          15000,
          "auth.signUp"
        );
        authData = result.data;
        authError = result.error;
      } catch (err) {
        console.error("[signUp] auth.signUp threw/timed out:", err);
        return { error: err instanceof Error ? err.message : "Auth signup failed." };
      }

      console.log("[signUp] auth signup response:", JSON.stringify({
        user: authData?.user ? { id: authData.user.id, email: authData.user.email, confirmed: authData.user.confirmed_at } : null,
        session: authData?.session ? "present" : "null",
        error: authError,
      }, null, 2));

      if (authError) {
        console.error("[signUp] auth error details:", {
          message: authError.message,
          status: authError.status,
          name: authError.name,
        });
        return { error: authError.message };
      }
      if (!authData?.user) {
        console.error("[signUp] no user returned — email confirmation may be required");
        return { error: "Signup failed — no user returned. Check if email confirmation is enabled in Supabase." };
      }

      const userId = authData.user.id;
      console.log("[signUp] auth user created:", userId);

      // ── Step 2: Insert doctor row via server API ──
      console.log("[signUp] ── STEP 2: before doctors insert via /api/signup ──");
      const payload = {
        userId,
        email,
        full_name: doctorData.full_name,
        qualifications: doctorData.qualifications,
        registration_number: doctorData.registration_number,
        state_medical_council: doctorData.state_medical_council,
        clinic_name: doctorData.clinic_name,
        clinic_city: doctorData.clinic_city,
        clinic_state: doctorData.clinic_state,
        phone: doctorData.phone,
      };
      console.log("[signUp] payload:", JSON.stringify(payload, null, 2));

      let res;
      try {
        res = await withTimeout(
          fetch("/api/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }),
          15000,
          "/api/signup fetch"
        );
      } catch (err) {
        console.error("[signUp] /api/signup fetch threw/timed out:", err);
        return { error: err instanceof Error ? err.message : "Failed to save doctor profile." };
      }

      console.log("[signUp] /api/signup response status:", res.status);
      const resBody = await res.json().catch(() => ({}));
      console.log("[signUp] /api/signup response body:", JSON.stringify(resBody));

      if (!res.ok) {
        console.error("[signUp] /api/signup failed:", resBody);
        return { error: resBody.error ?? "Failed to save doctor profile." };
      }

      // Don't fetch doctor here — the signup page just shows a success modal
      // and the user will log in fresh, which triggers onAuthStateChange to load the doctor.
      console.log("[signUp] ✓ signup complete for:", userId);
      return { error: null };
    } catch (err) {
      console.error("[signUp] unexpected top-level error:", err);
      return { error: err instanceof Error ? err.message : "Unexpected signup error." };
    } finally {
      _signupInProgress = false;
    }
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, doctor: null });
  },

  refreshDoctor: async () => {
    const { user } = get();
    if (!user) return;
    const { data: doctor, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (error) console.error("[store] refreshDoctor error:", error);
    if (doctor) set({ doctor });
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return { error: null };
  },
}));
