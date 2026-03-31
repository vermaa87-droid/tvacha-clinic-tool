"use client";

import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/store";
import type { Doctor } from "@/lib/types";
import { format } from "date-fns";

export function VerificationPending({ doctor }: { doctor: Doctor }) {
  const { signOut } = useAuthStore();
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
      <div className="mb-8">
        <Logo />
      </div>

      <div
        className="w-full max-w-[500px] rounded-2xl p-8 space-y-6"
        style={{
          background: "#f5f2ed",
          border: "1px solid rgba(184,147,106,0.35)",
          boxShadow: "0 4px 32px rgba(26,22,18,0.06)",
        }}
      >
        {/* Icon + Heading */}
        <div className="text-center space-y-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "rgba(184,147,106,0.12)" }}
          >
            <Clock size={28} style={{ color: "#b8936a" }} />
          </div>
          <h1
            className="text-2xl font-serif font-semibold"
            style={{ color: "#2a2218" }}
          >
            Verification In Progress
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#6b5e4e" }}>
            Thank you for signing up,{" "}
            <span className="font-semibold" style={{ color: "#2a2218" }}>
              {doctor.full_name}
            </span>
            .<br />
            We&apos;re verifying your medical registration to ensure Tvacha Clinic Tool
            is used exclusively by licensed practitioners.
          </p>
        </div>

        {/* Details card */}
        <div
          className="rounded-xl p-5 space-y-3"
          style={{
            background: "rgba(245,242,237,0.8)",
            border: "1px solid rgba(184,147,106,0.2)",
          }}
        >
          <DetailRow label="Registration No." value={doctor.registration_number || "—"} />
          <DetailRow label="Council" value={doctor.state_medical_council || "—"} />
          <DetailRow label="Submitted" value={signupDate} />
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
              Under Review
            </span>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-center leading-relaxed" style={{ color: "#6b5e4e" }}>
          This usually takes 24–48 hours. We&apos;ll notify you via email once your account is verified.
        </p>

        {/* Contact */}
        <p className="text-sm text-center" style={{ color: "#9a8a76" }}>
          Think there&apos;s an issue? Contact us at{" "}
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

        {/* Log Out */}
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            className="border-primary-300 text-text-secondary hover:border-primary-400"
            onClick={handleLogOut}
          >
            Log Out
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
