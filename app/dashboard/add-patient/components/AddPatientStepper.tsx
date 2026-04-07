"use client";

import { Camera, ClipboardList, User, Brain, CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/translations";

const STEPS: { num: number; labelKey: TranslationKey; icon: typeof Camera }[] = [
  { num: 1, labelKey: "ap_step_photos", icon: Camera },
  { num: 2, labelKey: "ap_step_screening", icon: ClipboardList },
  { num: 3, labelKey: "ap_step_details", icon: User },
  { num: 4, labelKey: "ap_step_ai_result", icon: Brain },
  { num: 5, labelKey: "ap_step_summary", icon: CheckCircle },
];

interface AddPatientStepperProps {
  currentStep: number;
}

export function AddPatientStepper({ currentStep }: AddPatientStepperProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-start w-full mb-8">
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.num;
        const isActive = currentStep === step.num;
        const Icon = step.icon;

        return (
          <div key={step.num} className="flex items-start flex-1">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className="w-11 h-11 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={
                  isCompleted || isActive
                    ? { background: "#b8936a", border: "2px solid #b8936a" }
                    : { background: "var(--color-surface)", border: "2px solid var(--color-primary-200)" }
                }
              >
                {isCompleted ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <Icon size={15} color={isActive ? "#fff" : "var(--color-text-secondary)"} />
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:block text-center"
                style={{ color: isActive || isCompleted ? "#b8936a" : "var(--color-text-secondary)", minWidth: 48 }}
              >
                {t(step.labelKey)}
              </span>
            </div>

            {/* Connecting line — not after the last step */}
            {idx < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-1"
                style={{
                  background: isCompleted ? "#b8936a" : "var(--color-primary-200)",
                  marginTop: 22,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
