"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
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
                {t("login_title")}
              </h1>
              <p className="text-text-secondary mt-2">
                {t("login_subtitle")}
              </p>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}
                <Input
                  label={t("login_email")}
                  type="email"
                  placeholder="Dr. email@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label={t("login_password")}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  loading={isLoading}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold mt-6"
                  size="lg"
                >
                  {t("login_button")}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-primary-200">
                <p className="text-text-secondary text-center">
                  {t("login_no_account")}{" "}
                  <Link href="/signup" className="text-primary-500 font-medium hover:text-primary-600">
                    {t("login_create")}
                  </Link>
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Footer />
    </main>
  );
}
