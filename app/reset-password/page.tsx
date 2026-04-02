// IMPORTANT: Add this URL to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
// https://www.tvacha-clinic.com/reset-password

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/layout/Logo";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setChecking(false);
      }
    });

    // Also check if there's already a session (user clicked link and was redirected)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsRecovery(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        // Ignore the auth-token lock race condition — password update still succeeds
        if (error.message.includes("released because another request stole it")) {
          setSuccess(true);
          try { await supabase.auth.signOut(); } catch { /* ignore */ }
        } else {
          setError(error.message);
        }
      } else {
        setSuccess(true);
        // Sign out so they log in fresh with new password
        await supabase.auth.signOut();
      }
    } catch (err) {
      // Also catch thrown lock errors (some Supabase versions throw instead of returning)
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("released because another request stole it")) {
        setSuccess(true);
        try { await supabase.auth.signOut(); } catch { /* ignore */ }
      } else {
        setError(msg || "An unexpected error occurred.");
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="bg-primary-50 border-b border-primary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between">
          <Logo />
          <LanguageToggle />
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 md:px-8 py-8 md:py-20">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text-primary">
                Reset Password
              </h1>
              <p className="text-text-secondary mt-2">
                {success
                  ? "Your password has been updated."
                  : isRecovery
                    ? "Enter your new password below."
                    : "Verifying your reset link..."}
              </p>
            </CardHeader>
            <CardBody>
              {checking ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : success ? (
                /* ── Success ── */
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    Password updated successfully! You can now log in with your new password.
                  </div>
                  <Link
                    href="/login"
                    className="block w-full text-center bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    Go to Login
                  </Link>
                </div>
              ) : isRecovery ? (
                /* ── Reset Form ── */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {error}
                    </div>
                  )}
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    loading={loading}
                    className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold mt-2"
                    size="lg"
                  >
                    Update Password
                  </Button>
                </form>
              ) : (
                /* ── Invalid access ── */
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                    This page is only accessible from a password reset link. Request one from the login page.
                  </div>
                  <Link
                    href="/login"
                    className="block w-full text-center bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    Go to Login
                  </Link>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Footer />
    </main>
  );
}
