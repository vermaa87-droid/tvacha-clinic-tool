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

function BotanicalPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.12, pointerEvents: "none" }}
      viewBox="0 0 420 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left vine stem */}
      <path
        d="M35 900 C 65 760 18 660 55 540 C 92 420 40 330 78 220 C 116 110 88 50 115 -10"
        stroke="#7a5420" strokeWidth="1.6" strokeLinecap="round"
      />
      {/* Right vine stem */}
      <path
        d="M388 -10 C 358 110 398 210 368 330 C 338 450 392 540 360 660 C 328 780 375 860 345 920"
        stroke="#7a5420" strokeWidth="1.6" strokeLinecap="round"
      />
      {/* Left branches */}
      <path d="M55 540 C 105 518 140 488 158 455" stroke="#7a5420" strokeWidth="1" strokeLinecap="round"/>
      <path d="M78 220 C 128 198 158 168 168 138" stroke="#7a5420" strokeWidth="1" strokeLinecap="round"/>
      <path d="M35 720 C 88 700 118 668 130 638" stroke="#7a5420" strokeWidth="1" strokeLinecap="round"/>
      {/* Right branches */}
      <path d="M368 330 C 305 310 272 278 260 248" stroke="#7a5420" strokeWidth="1" strokeLinecap="round"/>
      <path d="M360 660 C 298 640 265 608 252 576" stroke="#7a5420" strokeWidth="1" strokeLinecap="round"/>
      <path d="M388 150 C 330 138 298 112 284 84" stroke="#7a5420" strokeWidth="1" strokeLinecap="round"/>
      {/* Leaves — left side */}
      <ellipse cx="160" cy="452" rx="14" ry="5.5" transform="rotate(28 160 452)" stroke="#7a5420" strokeWidth="1" fill="none"/>
      <ellipse cx="170" cy="135" rx="14" ry="5.5" transform="rotate(-22 170 135)" stroke="#7a5420" strokeWidth="1" fill="none"/>
      <ellipse cx="132" cy="635" rx="12" ry="4.5" transform="rotate(18 132 635)" stroke="#7a5420" strokeWidth="1" fill="none"/>
      {/* Leaves — right side */}
      <ellipse cx="258" cy="245" rx="14" ry="5.5" transform="rotate(-38 258 245)" stroke="#7a5420" strokeWidth="1" fill="none"/>
      <ellipse cx="250" cy="573" rx="14" ry="5.5" transform="rotate(32 250 573)" stroke="#7a5420" strokeWidth="1" fill="none"/>
      <ellipse cx="282" cy="82" rx="13" ry="5" transform="rotate(-15 282 82)" stroke="#7a5420" strokeWidth="1" fill="none"/>
      {/* Berries */}
      <circle cx="163" cy="452" r="2.2" fill="#7a5420" opacity="0.45"/>
      <circle cx="173" cy="135" r="2.2" fill="#7a5420" opacity="0.45"/>
      <circle cx="135" cy="635" r="2" fill="#7a5420" opacity="0.45"/>
      <circle cx="261" cy="245" r="2.2" fill="#7a5420" opacity="0.45"/>
      <circle cx="253" cy="573" r="2.2" fill="#7a5420" opacity="0.45"/>
      {/* Central connecting tendril */}
      <path
        d="M170 400 C 195 375 215 345 210 310 C 205 278 190 262 210 245"
        stroke="#7a5420" strokeWidth="1" strokeLinecap="round"
      />
      <ellipse cx="212" cy="243" rx="9" ry="3.5" transform="rotate(-48 212 243)" stroke="#7a5420" strokeWidth="1" fill="none"/>
      {/* Corner flourish bottom-right */}
      <path
        d="M385 820 C 355 798 325 792 308 768 C 291 744 295 718 278 702"
        stroke="#7a5420" strokeWidth="1" strokeLinecap="round"
      />
      <ellipse cx="276" cy="700" rx="10" ry="4" transform="rotate(-25 276 700)" stroke="#7a5420" strokeWidth="1" fill="none"/>
    </svg>
  );
}

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
    "w-full px-4 py-3 rounded-lg outline-none transition-all text-[#3d2e22] placeholder-[#c0b0a0]";
  const inputStyle = {
    background: "rgba(250,246,240,0.85)",
    border: "1px solid rgba(184,147,106,0.38)",
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#b8936a";
    e.target.style.boxShadow = "0 0 0 3px rgba(184,147,106,0.14)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(184,147,106,0.38)";
    e.target.style.boxShadow = "none";
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row">

      {/* ── MOBILE TOP NAV ── */}
      <nav
        className="md:hidden border-b border-primary-200 px-4 py-4 flex items-center justify-between"
        style={{ background: "rgba(250,248,244,0.95)" }}
      >
        <Logo />
        <LanguageToggle />
      </nav>

      {/* ── LEFT BRANDED PANEL (desktop only) ── */}
      <div
        className="hidden md:flex md:w-[44%] lg:w-[42%] flex-col relative overflow-hidden"
        style={{ background: "#dfc49a", minHeight: "100vh" }}
      >
        <BotanicalPattern />

        <div className="relative z-10 flex flex-col h-full px-10 lg:px-14 py-10 lg:py-14">

          {/* Logo */}
          <Logo />

          {/* Tagline block — vertically centered */}
          <div className="flex-1 flex flex-col justify-center mt-12">
            <p
              className="text-xs font-semibold uppercase mb-5"
              style={{ color: "#7a5c35", letterSpacing: "0.2em" }}
            >
              Sign In to Continue
            </p>
            <h2
              className="font-serif font-bold leading-snug mb-5"
              style={{ fontSize: "clamp(1.55rem, 2.5vw, 2.2rem)", color: "#1e1510", maxWidth: "300px" }}
            >
              Intelligence Infrastructure for Modern Dermatology
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "#7a6354", maxWidth: "270px" }}
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
              <span className="text-xs font-bold" style={{ color: "#b8936a" }}>✓</span>
              <span className="text-xs" style={{ color: "#7a6354" }}>
                NMC Verified Doctors Only
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col" style={{ background: "#faf8f4" }}>

        {/* Language toggle — top-right on desktop */}
        <div className="hidden md:flex justify-end px-8 py-5">
          <LanguageToggle />
        </div>

        {/* Form centered */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10 md:py-6">
          <div className="w-full max-w-[360px]">

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
                  <p className="mt-2 text-sm" style={{ color: "#8a7060" }}>
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
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "#8a7060" }}>
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
                <div className="mb-9">
                  <h1
                    className="font-serif font-bold text-text-primary"
                    style={{ fontSize: "2rem" }}
                  >
                    {t("login_title")}
                  </h1>
                  <p className="mt-2 text-sm" style={{ color: "#8a7060" }}>
                    {t("login_subtitle")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#8a7060" }}>
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
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#8a7060" }}>
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
                      style={{ color: "#a09080" }}
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
                <div className="mt-8 flex items-center gap-3">
                  <div className="flex-1 border-t" style={{ borderColor: "rgba(184,147,106,0.22)" }} />
                  <span className="text-xs" style={{ color: "#b8a898" }}>or</span>
                  <div className="flex-1 border-t" style={{ borderColor: "rgba(184,147,106,0.22)" }} />
                </div>

                {/* Sign up link */}
                <p className="text-center text-sm mt-4" style={{ color: "#8a7060" }}>
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
