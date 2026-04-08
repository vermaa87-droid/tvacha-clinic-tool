"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const signIn = useAuthStore((s) => s.signIn);
  const router = useRouter();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setIsLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotError("");

    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("email", forgotEmail.trim().toLowerCase())
      .maybeSingle();

    if (!doctor) {
      setForgotError("No account found with this email address.");
      setForgotLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setForgotError(error.message);
    } else {
      setForgotSuccess(true);
    }
    setForgotLoading(false);
  };

  const inputBase =
    "w-full px-5 py-4 rounded-xl outline-none transition-all text-[var(--auth-input-text)] placeholder-[var(--auth-input-placeholder)] text-base";
  const inputStyle = {
    background: "var(--auth-input-bg)",
    border: "1px solid var(--auth-input-border)",
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#b8936a";
    e.target.style.boxShadow = "0 0 0 3px rgba(184,147,106,0.14)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--auth-input-border)";
    e.target.style.boxShadow = "none";
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row">

      {/* ── MOBILE TOP NAV ── */}
      <nav
        className="md:hidden border-b border-primary-200 px-4 py-4 flex items-center justify-between"
        style={{ background: "rgba(250,248,244,0.95)" }}
      >
        <div
          onClick={() => { router.push('/'); }}
          style={{ cursor: 'pointer', position: 'relative', zIndex: 9999 }}
        >
          <Logo />
        </div>
        <LanguageToggle />
      </nav>

      {/* ── LEFT BRANDED PANEL (desktop only) ── */}
      <div
        className="hidden md:flex md:w-[44%] lg:w-[42%] flex-col relative overflow-hidden"
        style={{ background: "var(--auth-panel-bg)", minHeight: "100vh", flexShrink: 0 }}
      >
        {/* Subtle decorative curves */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 480 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M -40 200 C 80 180 160 260 240 220 C 320 180 380 100 520 130" fill="none" stroke="rgba(184,147,106,0.12)" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M -20 480 C 100 450 200 520 300 490 C 380 465 430 400 540 420" fill="none" stroke="rgba(184,147,106,0.10)" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M 60 750 C 160 720 240 780 340 755 C 420 735 460 680 540 700" fill="none" stroke="rgba(184,147,106,0.09)" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M 300 -20 C 340 100 280 200 320 340 C 360 480 420 540 400 680" fill="none" stroke="rgba(184,147,106,0.08)" strokeWidth="1" strokeLinecap="round"/>
        </svg>
        <div className="relative z-10 flex flex-col h-full px-10 lg:px-14 py-10 lg:py-14">

          {/* Logo */}
          <div
            onClick={() => { router.push('/'); }}
            style={{ cursor: 'pointer', position: 'relative', zIndex: 9999 }}
          >
            <Logo />
          </div>

          {/* Tagline block — vertically centered */}
          <div className="flex-1 flex flex-col justify-center -mt-16">
            <p
              className="text-sm font-semibold uppercase mb-6"
              style={{ color: "#7a5c35", letterSpacing: "0.2em" }}
            >
              Sign In to Continue
            </p>
            <h2
              className="font-serif font-bold leading-snug mb-6"
              style={{ fontSize: "clamp(2rem, 3.2vw, 3rem)", color: "var(--auth-input-text)", maxWidth: "360px" }}
            >
              Intelligence Infrastructure for Modern Dermatology
            </h2>
            <p
              className="text-base leading-relaxed"
              style={{ color: "var(--auth-label-color)", maxWidth: "320px" }}
            >
              AI pre-screening, patient management, and prescription templates — all in one platform built for Indian clinicians.
            </p>

            {/* Gold accent rule */}
            <div
              className="mt-8 h-px w-14 rounded-full"
              style={{ background: "linear-gradient(90deg, #b8936a 0%, transparent 100%)" }}
            />
          </div>

          {/* Trust signals at bottom */}
          <div className="relative z-10 pb-2">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold" style={{ color: "#b8936a" }}>✓</span>
              <span className="text-sm" style={{ color: "var(--auth-label-color)" }}>
                NMC Verified Doctors Only
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="w-full md:flex-1 flex flex-col" style={{ background: "var(--auth-form-bg)" }}>

        {/* Language toggle — top-right on desktop */}
        <div className="hidden md:flex justify-end px-8 py-5">
          <LanguageToggle />
        </div>

        {/* Form centered */}
        <div className="flex-1 flex items-center justify-center px-5 py-8 md:px-12 md:py-8">
          <div className="w-full max-w-[520px]">

            {showForgot ? (
              /* ── Forgot Password View ── */
              <>
                <div className="mb-9">
                  <h1
                    className="font-serif font-bold text-text-primary"
                    style={{ fontSize: "1.9rem" }}
                  >
                    Reset Password
                  </h1>
                  <p className="mt-2 text-sm" style={{ color: "var(--auth-label-color)" }}>
                    Enter your email and we&apos;ll send you a reset link.
                  </p>
                </div>

                {forgotSuccess ? (
                  <div className="space-y-5">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                      Password reset link sent to your email. Check your inbox (and spam folder).
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgot(false);
                        setForgotSuccess(false);
                        setForgotEmail("");
                        setForgotError("");
                      }}
                      className="text-sm"
                      style={{ color: "#b8936a" }}
                    >
                      ← Back to login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    {forgotError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                        {forgotError}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--auth-label-color)" }}>
                        Email address
                      </label>
                      <input
                        type="email"
                        placeholder="Dr. email@clinic.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        className={inputBase}
                        style={{ ...inputStyle }}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                    <Button
                      type="submit"
                      loading={forgotLoading}
                      className="w-full bg-[#7a5c35] hover:bg-[#5c4527] text-white font-semibold tracking-wide"
                      size="lg"
                    >
                      Send Reset Link
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgot(false);
                          setForgotError("");
                          setForgotEmail("");
                        }}
                        className="text-sm"
                        style={{ color: "#b8936a" }}
                      >
                        ← Back to login
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              /* ── Login View ── */
              <>
                <div className="mb-10">
                  <h1
                    className="font-serif font-bold text-text-primary"
                    style={{ fontSize: "2.6rem" }}
                  >
                    {t("login_title")}
                  </h1>
                  <p className="mt-2.5 text-base" style={{ color: "var(--auth-label-color)" }}>
                    {t("login_subtitle")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: "var(--auth-label-color)" }}>
                      {t("login_email")}
                    </label>
                    <input
                      type="email"
                      placeholder="Dr. email@clinic.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={inputBase}
                      style={{ ...inputStyle }}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: "var(--auth-label-color)" }}>
                      {t("login_password")}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={inputBase}
                      style={{ ...inputStyle }}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>

                  {/* Forgot password */}
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-sm transition-colors hover:text-[#b8936a]"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    loading={isLoading}
                    className="w-full bg-[#7a5c35] hover:bg-[#5c4527] text-white font-semibold tracking-wide mt-1"
                    size="lg"
                  >
                    {t("login_button")}
                  </Button>
                </form>

                {/* Divider */}
                <div className="mt-9 flex items-center gap-3">
                  <div className="flex-1 border-t" style={{ borderColor: "var(--color-separator)" }} />
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>or</span>
                  <div className="flex-1 border-t" style={{ borderColor: "var(--color-separator)" }} />
                </div>

                {/* Sign up link */}
                <p className="text-center text-base mt-5" style={{ color: "var(--auth-label-color)" }}>
                  {t("login_no_account")}{" "}
                  <Link
                    href="/signup"
                    className="font-medium transition-colors hover:text-[#9a6a3a]"
                    style={{ color: "#b8936a" }}
                  >
                    {t("login_create")}
                  </Link>
                </p>
              </>
            )}

          </div>
        </div>

        <Footer />
      </div>

    </main>
  );
}
