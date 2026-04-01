"use client";

import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import type { Doctor } from "@/lib/types";
import { format } from "date-fns";

export function VerificationPending({ doctor }: { doctor: Doctor }) {
  const { signOut } = useAuthStore();
  const { t } = useLanguage();
  const router = useRouter();

  const handleLogOut = async () => {
    await signOut();
    router.push("/login");
  };

  const signupDate = doctor.created_at
    ? format(new Date(doctor.created_at), "d MMMM yyyy")
    : "—";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "#faf8f4" }}
    >
      <div className="mb-4 flex items-center justify-between w-full max-w-[500px]">
        <Logo />
        <LanguageToggle />
      </div>

      <div
        className="w-full max-w-[500px] rounded-2xl p-8 space-y-6"
        style={{
          background: "#f5f2ed",
          border: "1px solid rgba(184,147,106,0.35)",
          boxShadow: "0 4px 32px rgba(26,22,18,0.06)",
        }}
      >
        <div className="text-center space-y-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "rgba(184,147,106,0.12)" }}
          >
            <Clock size={28} style={{ color: "#b8936a" }} />
          </div>
          <h1 className="text-2xl font-serif font-semibold" style={{ color: "#2a2218" }}>
            {t("verify_title")}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#6b5e4e" }}>
            {t("verify_message_prefix")}{" "}
            <span className="font-semibold" style={{ color: "#2a2218" }}>
              {doctor.full_name}
            </span>
            .<br />
            {t("verify_message_suffix")}
          </p>
        </div>

        <div
          className="rounded-xl p-5 space-y-3"
          style={{
            background: "rgba(245,242,237,0.8)",
            border: "1px solid rgba(184,147,106,0.2)",
          }}
        >
          <DetailRow label={t("verify_reg_no")} value={doctor.registration_number || "—"} />
          <DetailRow label={t("verify_council")} value={doctor.state_medical_council || "—"} />
          <DetailRow label={t("verify_submitted")} value={signupDate} />
          <div className="flex items-center justify-between pt-1 border-t border-primary-200">
            <span className="text-xs font-medium" style={{ color: "#9a8a76" }}>
              Status
            </span>
            <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#b8936a" }}>
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#d4a55a",
                  animation: "pulse 2s ease-in-out infinite",
                  display: "inline-block",
                }}
              />
              {t("verify_status")}
            </span>
          </div>
        </div>

        <p className="text-sm text-center leading-relaxed" style={{ color: "#6b5e4e" }}>
          {t("verify_time")}
        </p>

        <p className="text-sm text-center" style={{ color: "#9a8a76" }}>
          {t("verify_issue")}{" "}
          <a
            href="mailto:support@tvacha-clinic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "#b8936a" }}
          >
            support@tvacha-clinic.com
          </a>
        </p>

        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            className="border-primary-300 text-text-secondary hover:border-primary-400"
            onClick={handleLogOut}
          >
            {t("verify_logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium flex-shrink-0" style={{ color: "#9a8a76" }}>
        {label}
      </span>
      <span className="text-xs font-semibold text-right" style={{ color: "#2a2218" }}>
        {value}
      </span>
    </div>
  );
}
