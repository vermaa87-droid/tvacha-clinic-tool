"use client";

import { Button } from "@/components/ui/Button";
import { Stethoscope } from "lucide-react";
import Link from "next/link";

export default function CasesPage() {
  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold text-text-primary">Case Queue</h1>
        <p className="text-text-secondary mt-2">AI-screened cases for your review</p>
      </div>

      {/* Coming Soon Banner */}
      <div
        className="rounded-xl border p-8"
        style={{
          background: "linear-gradient(135deg, #faf8f4, #f5efe6)",
          borderColor: "rgba(184,147,106,0.25)",
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <Stethoscope size={26} className="text-primary-500 flex-shrink-0" />
          <h2 className="text-xl font-serif font-semibold text-primary-500 uppercase tracking-widest">
            AI Case Queue — Coming Soon
          </h2>
        </div>

        <p className="text-text-secondary leading-relaxed mb-4">
          When Tvacha consumer app users start sending skin photos, AI-screened cases will appear
          here for your review. You&apos;ll be able to <strong className="text-text-primary">approve</strong>,{" "}
          <strong className="text-text-primary">correct</strong>, or{" "}
          <strong className="text-text-primary">flag</strong> each AI diagnosis — and earn per case reviewed.
        </p>

        <p className="text-text-secondary leading-relaxed mb-6">
          For now, use <strong className="text-text-primary">Prescription Templates</strong> and{" "}
          <strong className="text-text-primary">My Patients</strong> to manage your existing clinic workflow.
          Your referral code in Settings lets patients link to your clinic directly.
        </p>

        <div
          className="rounded-lg p-4 mb-6"
          style={{ background: "rgba(184,147,106,0.07)", border: "1px solid rgba(184,147,106,0.15)" }}
        >
          <p className="text-xs font-semibold text-primary-500 uppercase tracking-widest mb-3">
            What happens when it launches
          </p>
          <div className="space-y-2">
            {[
              "10–15 AI-pre-screened cases arrive daily",
              "Each case includes patient photos, symptoms, and AI confidence score",
              "You approve, correct, or flag — earning ₹200 per reviewed case",
              "Prescriptions auto-generate from your saved templates",
            ].map((item) => (
              <div key={item} className="flex gap-2 text-sm text-text-secondary">
                <span className="text-primary-500 flex-shrink-0">◆</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button className="bg-primary-500 hover:bg-primary-600 text-white">
            <Link href="/dashboard/prescriptions">Go to Prescriptions</Link>
          </Button>
          <Button variant="outline" className="border-primary-500 text-primary-500">
            <Link href="/dashboard/patients">Go to My Patients</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
