"use client";

import { useState } from "react";
import { RadioPills } from "./RadioPills";
import { FitzpatrickSwatches } from "./FitzpatrickSwatches";
import type { ScreeningData } from "../wizard-types";

const DURATION_OPTIONS = [
  { value: "less_1w", label: "Less than 1 week" },
  { value: "1_4w", label: "1–4 weeks" },
  { value: "1_3m", label: "1–3 months" },
  { value: "3_6m", label: "3–6 months" },
  { value: "6m_plus", label: "More than 6 months" },
  { value: "always", label: "Always had it" },
];

const PRESENCE_OPTIONS = [
  { value: "constant", label: "Always present and constant" },
  { value: "comes_goes", label: "Comes and goes (flares up)" },
  { value: "seasonal", label: "Seasonal (worse in certain weather)" },
  { value: "first_time", label: "First time this has appeared" },
];

const ITCHING_OPTIONS = [
  { value: "none", label: "Not at all" },
  { value: "mild", label: "Mildly" },
  { value: "very", label: "Very itchy" },
  { value: "unbearable", label: "Unbearably itchy" },
];

const PAIN_OPTIONS = [
  { value: "none", label: "No pain" },
  { value: "mild", label: "Mild discomfort" },
  { value: "moderate", label: "Moderate pain" },
  { value: "severe", label: "Severe pain" },
];

const BODY_LOCATION_OPTIONS = [
  { value: "Face", label: "Face" },
  { value: "Scalp", label: "Scalp" },
  { value: "Neck", label: "Neck" },
  { value: "Chest/Back", label: "Chest/Back" },
  { value: "Arms", label: "Arms" },
  { value: "Hands/Fingers", label: "Hands/Fingers" },
  { value: "Legs", label: "Legs" },
  { value: "Feet/Toes", label: "Feet/Toes" },
  { value: "Groin/Armpits", label: "Groin/Armpits" },
  { value: "Multiple areas", label: "Multiple areas" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const SWEATING_OPTIONS = [
  { value: "no", label: "No" },
  { value: "sometimes", label: "Sometimes" },
  { value: "frequently", label: "Yes, frequently" },
];

const FAMILY_HISTORY_OPTIONS = [
  { value: "none", label: "No known skin conditions" },
  { value: "eczema", label: "Yes — eczema/allergies" },
  { value: "psoriasis", label: "Yes — psoriasis" },
  { value: "vitiligo", label: "Yes — vitiligo" },
  { value: "skin_cancer", label: "Yes — skin cancer" },
  { value: "acne", label: "Yes — acne" },
  { value: "not_sure", label: "Not sure" },
];

const selectClass =
  "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors";

interface Step2ScreeningProps {
  data: ScreeningData;
  onChange: (updated: ScreeningData) => void;
  onBack: () => void;
  onNext: () => void;
}

type ScreeningErrors = Partial<Record<keyof ScreeningData, string>>;

export function Step2Screening({ data, onChange, onBack, onNext }: Step2ScreeningProps) {
  const [errors, setErrors] = useState<ScreeningErrors>({});

  const set = (field: keyof ScreeningData, value: string | number | null) => {
    onChange({ ...data, [field]: value });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: ScreeningErrors = {};
    if (!data.age || parseInt(data.age, 10) < 1 || parseInt(data.age, 10) > 120)
      e.age = "Enter a valid age (1–120)";
    if (!data.gender) e.gender = "This field is required";
    if (!data.duration) e.duration = "This field is required";
    if (!data.presence) e.presence = "This field is required";
    if (!data.itching) e.itching = "This field is required";
    if (!data.pain) e.pain = "This field is required";
    if (!data.bodyLocation) e.bodyLocation = "This field is required";
    if (!data.fitzpatrick) e.fitzpatrick = "Please select a skin tone";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
      <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: "#1a1612" }}>
        Quick Screening Questions
      </h2>
      <p className="text-sm mb-8" style={{ color: "#9a8a76" }}>
        These help with diagnosis. Answer based on what the patient tells you.
      </p>

      <div className="space-y-7">
        {/* Age */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1612" }}>
            Patient&apos;s Age <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <input
            type="number"
            min={1}
            max={120}
            placeholder="e.g. 32"
            value={data.age}
            onChange={(e) => set("age", e.target.value)}
            className={selectClass}
            style={{ maxWidth: 160 }}
          />
          {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "#1a1612" }}>
            Gender <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <RadioPills options={GENDER_OPTIONS} value={data.gender} onChange={(v) => set("gender", v)} error={errors.gender} />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1612" }}>
            How long have they had this condition? <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <select value={data.duration} onChange={(e) => set("duration", e.target.value)} className={selectClass}>
            <option value="">Select duration</option>
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration}</p>}
        </div>

        {/* Presence */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1612" }}>
            Is the condition always present or does it come and go? <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <select value={data.presence} onChange={(e) => set("presence", e.target.value)} className={selectClass}>
            <option value="">Select</option>
            {PRESENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.presence && <p className="text-red-500 text-sm mt-1">{errors.presence}</p>}
        </div>

        {/* Itching */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "#1a1612" }}>
            Is the affected area itchy? <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <RadioPills options={ITCHING_OPTIONS} value={data.itching} onChange={(v) => set("itching", v)} error={errors.itching} />
        </div>

        {/* Pain */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "#1a1612" }}>
            Is the affected area painful? <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <RadioPills options={PAIN_OPTIONS} value={data.pain} onChange={(v) => set("pain", v)} error={errors.pain} />
        </div>

        {/* Body location */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1612" }}>
            Where on the body is the condition? <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <select value={data.bodyLocation} onChange={(e) => set("bodyLocation", e.target.value)} className={selectClass}>
            <option value="">Select location</option>
            {BODY_LOCATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.bodyLocation && <p className="text-red-500 text-sm mt-1">{errors.bodyLocation}</p>}
        </div>

        {/* Fitzpatrick */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "#1a1612" }}>
            Skin Tone (Fitzpatrick Scale) <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <FitzpatrickSwatches
            value={data.fitzpatrick}
            onChange={(type) => set("fitzpatrick", type)}
            error={errors.fitzpatrick}
          />
        </div>

        {/* Optional divider */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 h-px" style={{ background: "#e8e0d0" }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9a8a76" }}>Optional</span>
          <div className="flex-1 h-px" style={{ background: "#e8e0d0" }} />
        </div>

        {/* Sweating */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "#1a1612" }}>
            Does the patient sweat excessively?
          </label>
          <RadioPills options={SWEATING_OPTIONS} value={data.sweating} onChange={(v) => set("sweating", v)} />
        </div>

        {/* Family history */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1612" }}>
            Family history of skin conditions?
          </label>
          <select value={data.familyHistory} onChange={(e) => set("familyHistory", e.target.value)} className={selectClass}>
            <option value="">Select</option>
            {FAMILY_HISTORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-10">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-lg font-semibold border transition-colors min-h-[44px]"
          style={{ borderColor: "#b8936a", color: "#b8936a", background: "transparent" }}
        >
          ← Back
        </button>
        <button
          type="submit"
          className="px-8 py-3 rounded-lg font-semibold text-white min-h-[44px]"
          style={{ background: "#b8936a" }}
        >
          Next →
        </button>
      </div>
    </form>
  );
}
