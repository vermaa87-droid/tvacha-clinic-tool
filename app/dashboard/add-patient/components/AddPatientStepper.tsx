"use client";

import { Camera, ClipboardList, User, Brain, CheckCircle } from "lucide-react";

const STEPS = [
  { num: 1, label: "Photos", icon: Camera },
  { num: 2, label: "Screening", icon: ClipboardList },
  { num: 3, label: "Details", icon: User },
  { num: 4, label: "AI Result", icon: Brain },
  { num: 5, label: "Summary", icon: CheckCircle },
];

interface AddPatientStepperProps {
  currentStep: number;
}

export function AddPatientStepper({ currentStep }: AddPatientStepperProps) {
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
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={
                  isCompleted || isActive
                    ? { background: "#b8936a", border: "2px solid #b8936a" }
                    : { background: "#f5f2ed", border: "2px solid #e0d5c4" }
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
                  <Icon size={15} color={isActive ? "#fff" : "#9a8a76"} />
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:block text-center"
                style={{ color: isActive || isCompleted ? "#b8936a" : "#9a8a76", minWidth: 48 }}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting line — not after the last step */}
            {idx < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-1"
                style={{
                  background: isCompleted ? "#b8936a" : "#e0d5c4",
                  marginTop: 18,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
