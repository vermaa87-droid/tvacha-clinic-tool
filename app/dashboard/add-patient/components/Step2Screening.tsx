"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { RadioPills } from "./RadioPills";
import { CheckboxPills } from "./CheckboxPills";
import { FitzpatrickSwatches } from "./FitzpatrickSwatches";
import { useLanguage } from "@/lib/language-context";
import type { ScreeningData } from "../wizard-types";

const selectClass =
  "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors";

interface Step2ScreeningProps {
  data: ScreeningData;
  onChange: (updated: ScreeningData) => void;
  onBack: () => void;
  onNext: () => void;
}

type ScreeningErrors = Partial<Record<keyof ScreeningData, string>>;

function HelpText({ text }: { text: string }) {
  return <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{text}</p>;
}

export function Step2Screening({ data, onChange, onBack, onNext }: Step2ScreeningProps) {
  const { t } = useLanguage();
  const [errors, setErrors] = useState<ScreeningErrors>({});

  const set = (field: keyof ScreeningData, value: string | number | null | string[]) => {
    onChange({ ...data, [field]: value });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // When presence changes away from blister, clear blister sub-fields
  const setPresence = (value: string) => {
    if (value !== "blister" && data.presence === "blister") {
      onChange({
        ...data,
        presence: value,
        blister_size: "",
        blister_fragility: "",
        blister_duration: "",
        blister_mucous_membrane: "",
      });
    } else {
      set("presence", value);
    }
  };

  const validate = (): boolean => {
    const e: ScreeningErrors = {};
    if (!data.age || parseInt(data.age, 10) < 1 || parseInt(data.age, 10) > 120)
      e.age = t("ap_s2_age_error");
    if (!data.gender) e.gender = t("ap_s2_required");
    if (!data.duration) e.duration = t("ap_s2_required");
    if (!data.presence) e.presence = t("ap_s2_required");
    if (!data.itching) e.itching = t("ap_s2_required");
    if (!data.pain) e.pain = t("ap_s2_required");
    if (!data.bodyLocation) e.bodyLocation = t("ap_s2_required");
    if (!data.fitzpatrick) e.fitzpatrick = t("ap_s2_fitz_error");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  const isBlister = data.presence === "blister";
  const hasItching = data.itching && data.itching !== "none";
  const hasFever = data.fever === "High fever / very unwell";

  // ── Options ──────────────────────────────────────────────────────────────────

  const DURATION_OPTIONS = [
    { value: "less_1w", label: t("ap_s2_dur_less_1w") },
    { value: "1_4w", label: t("ap_s2_dur_1_4w") },
    { value: "1_3m", label: t("ap_s2_dur_1_3m") },
    { value: "3_6m", label: t("ap_s2_dur_3_6m") },
    { value: "6m_plus", label: t("ap_s2_dur_6m_plus") },
    { value: "always", label: t("ap_s2_dur_always") },
  ];

  const PRESENCE_OPTIONS = [
    { value: "constant", label: t("ap_s2_pres_constant") },
    { value: "comes_goes", label: t("ap_s2_pres_comes_goes") },
    { value: "seasonal", label: t("ap_s2_pres_seasonal") },
    { value: "first_time", label: t("ap_s2_pres_first_time") },
    { value: "blister", label: t("ap_s2_pres_blister") },
  ];

  const ITCHING_OPTIONS = [
    { value: "none", label: t("ap_s2_itch_none") },
    { value: "mild", label: t("ap_s2_itch_mild") },
    { value: "very", label: t("ap_s2_itch_very") },
    { value: "unbearable", label: t("ap_s2_itch_unbearable") },
  ];

  const PAIN_OPTIONS = [
    { value: "none", label: t("ap_s2_pain_none") },
    { value: "mild", label: t("ap_s2_pain_mild") },
    { value: "moderate", label: t("ap_s2_pain_moderate") },
    { value: "severe", label: t("ap_s2_pain_severe") },
  ];

  const BODY_LOCATION_OPTIONS = [
    { value: "Face", label: t("ap_s2_body_face") },
    { value: "Scalp", label: t("ap_s2_body_scalp") },
    { value: "Neck", label: t("ap_s2_body_neck") },
    { value: "Chest/Back", label: t("ap_s2_body_chest") },
    { value: "Arms", label: t("ap_s2_body_arms") },
    { value: "Hands/Fingers", label: t("ap_s2_body_hands") },
    { value: "Legs", label: t("ap_s2_body_legs") },
    { value: "Feet/Toes", label: t("ap_s2_body_feet") },
    { value: "Groin/Armpits", label: t("ap_s2_body_groin") },
    { value: "Multiple areas", label: t("ap_s2_body_multiple") },
  ];

  const GENDER_OPTIONS = [
    { value: "male", label: t("ap_s2_male") },
    { value: "female", label: t("ap_s2_female") },
    { value: "other", label: t("ap_s2_other") },
  ];

  const SWEATING_OPTIONS = [
    { value: "no", label: t("ap_s2_sweat_no") },
    { value: "sometimes", label: t("ap_s2_sweat_sometimes") },
    { value: "frequently", label: t("ap_s2_sweat_frequently") },
  ];

  const FAMILY_HISTORY_OPTIONS = [
    { value: "none", label: t("ap_s2_fam_none") },
    { value: "eczema", label: t("ap_s2_fam_eczema") },
    { value: "psoriasis", label: t("ap_s2_fam_psoriasis") },
    { value: "vitiligo", label: t("ap_s2_fam_vitiligo") },
    { value: "skin_cancer", label: t("ap_s2_fam_cancer") },
    { value: "acne", label: t("ap_s2_fam_acne") },
    { value: "not_sure", label: t("ap_s2_fam_not_sure") },
  ];

  const BLISTER_SIZE_OPTIONS = [
    { value: "Pinhead-sized (1-2mm)", label: t("ap_s2_blister_pinhead") },
    { value: "Pea-sized (3-8mm)", label: t("ap_s2_blister_pea") },
    { value: "Coin-sized or larger (>1cm)", label: t("ap_s2_blister_coin") },
  ];

  const BLISTER_FRAGILITY_OPTIONS = [
    { value: "Pop easily with light touch", label: t("ap_s2_blister_pop") },
    { value: "Stay intact, hard to break", label: t("ap_s2_blister_intact") },
    { value: "Already broken when I noticed", label: t("ap_s2_blister_broken") },
  ];

  const BLISTER_DURATION_OPTIONS = [
    { value: "Less than 48 hours", label: t("ap_s2_blister_dur_48h") },
    { value: "A few days to a week", label: t("ap_s2_blister_dur_week") },
    { value: "1-4 weeks", label: t("ap_s2_blister_dur_month") },
    { value: "More than a month", label: t("ap_s2_blister_dur_long") },
  ];

  const BLISTER_MUCOUS_OPTIONS = [
    { value: "Yes", label: t("ap_s2_blister_mucous_yes") },
    { value: "No", label: t("ap_s2_blister_mucous_no") },
    { value: "Not sure", label: t("ap_s2_blister_mucous_unsure") },
  ];

  const MEDICATION_OPTIONS = [
    { value: "No", label: t("ap_s2_med_no") },
    { value: "Yes — antibiotics", label: t("ap_s2_med_antibiotics") },
    { value: "Yes — painkillers/NSAIDs", label: t("ap_s2_med_nsaids") },
    { value: "Yes — blood pressure or heart medication", label: t("ap_s2_med_bp") },
    { value: "Yes — other medication", label: t("ap_s2_med_other") },
  ];

  const RECURRENCE_OPTIONS = [
    { value: "First time ever", label: t("ap_s2_recur_first") },
    { value: "Comes and goes (recurring)", label: t("ap_s2_recur_recurring") },
    { value: "Has been getting steadily worse", label: t("ap_s2_recur_worse") },
    { value: "Had it before, came back after treatment", label: t("ap_s2_recur_returned") },
  ];

  const FEVER_OPTIONS = [
    { value: "No, just the skin issue", label: t("ap_s2_fever_no") },
    { value: "Mild fever or feeling off", label: t("ap_s2_fever_mild") },
    { value: "High fever / very unwell", label: t("ap_s2_fever_high") },
  ];

  const ITCHING_TIMING_OPTIONS = [
    { value: "About the same all day", label: t("ap_s2_itch_time_same") },
    { value: "Worse at night", label: t("ap_s2_itch_time_night") },
    { value: "Worse after bathing or sweating", label: t("ap_s2_itch_time_bath") },
    { value: "Only when I touch/scratch it", label: t("ap_s2_itch_time_touch") },
  ];

  const HOUSEHOLD_OPTIONS = [
    { value: "No, only me", label: t("ap_s2_household_no") },
    { value: "Yes, one other person", label: t("ap_s2_household_one") },
    { value: "Yes, multiple people", label: t("ap_s2_household_many") },
    { value: "Not sure", label: t("ap_s2_household_unsure") },
  ];

  const MIGRATION_OPTIONS = [
    { value: "Stay in the same spot", label: t("ap_s2_migrate_same") },
    { value: "Move around / appear in new places and old ones fade", label: t("ap_s2_migrate_move") },
    { value: "Slowly spreading outward from one spot", label: t("ap_s2_migrate_spread") },
    { value: "Not sure", label: t("ap_s2_migrate_unsure") },
  ];

  // Appearance is multi-select — backend expects appearance IDs directly
  const APPEARANCE_OPTIONS = [
    { value: "rash_red", label: "Red rash or patch" },
    { value: "bumps_pimples", label: "Bumps or pimples" },
    { value: "dark_spot", label: "Dark spot or mole" },
    { value: "scaly_flaky", label: "Scaly, flaky, or crusty" },
    { value: "blister_sore", label: "Blister, sore, or open wound" },
    { value: "wart_growth", label: "Wart or raised growth" },
    { value: "light_patch", label: "Light or discolored patch" },
    { value: "peeling", label: "Peeling or shedding skin" },
    { value: "lump_under_skin", label: "Lump or bump under the skin" },
    { value: "normal", label: "Looks mostly normal" },
  ];

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
      <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
        {t("ap_s2_title")}
      </h2>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        {t("ap_s2_subtitle")}
      </p>

      <div className="space-y-7">
        {/* Age */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_age")} <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <input
            type="number"
            min={1}
            max={120}
            placeholder={t("ap_s2_age_placeholder")}
            value={data.age}
            onChange={(e) => set("age", e.target.value)}
            className={selectClass}
            style={{ maxWidth: 160 }}
          />
          {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_gender")} <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <RadioPills options={GENDER_OPTIONS} value={data.gender} onChange={(v) => set("gender", v)} error={errors.gender} />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_duration")} <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <select value={data.duration} onChange={(e) => set("duration", e.target.value)} className={selectClass}>
            <option value="">{t("ap_s2_duration_placeholder")}</option>
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration}</p>}
        </div>

        {/* Presence / Appearance */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_presence")} <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <select value={data.presence} onChange={(e) => setPresence(e.target.value)} className={selectClass}>
            <option value="">{t("ap_s2_presence_placeholder")}</option>
            {PRESENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.presence && <p className="text-red-500 text-sm mt-1">{errors.presence}</p>}
        </div>

        {/* ── Blister sub-questions (conditional) ── */}
        {isBlister && (
          <div
            className="space-y-5 pl-4 py-4 rounded-lg"
            style={{ borderLeft: "3px solid #b8936a", background: "#fefcf8" }}
          >
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
                {t("ap_s2_blister_size")}
              </label>
              <RadioPills options={BLISTER_SIZE_OPTIONS} value={data.blister_size} onChange={(v) => set("blister_size", v)} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
                {t("ap_s2_blister_fragility")}
              </label>
              <RadioPills options={BLISTER_FRAGILITY_OPTIONS} value={data.blister_fragility} onChange={(v) => set("blister_fragility", v)} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
                {t("ap_s2_blister_how_long")}
              </label>
              <RadioPills options={BLISTER_DURATION_OPTIONS} value={data.blister_duration} onChange={(v) => set("blister_duration", v)} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
                {t("ap_s2_blister_mucous")}
              </label>
              <RadioPills options={BLISTER_MUCOUS_OPTIONS} value={data.blister_mucous_membrane} onChange={(v) => set("blister_mucous_membrane", v)} />
            </div>
          </div>
        )}

        {/* Itching */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_itching")} <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <RadioPills options={ITCHING_OPTIONS} value={data.itching} onChange={(v) => set("itching", v)} error={errors.itching} />
        </div>

        {/* Pain */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_pain")} <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <RadioPills options={PAIN_OPTIONS} value={data.pain} onChange={(v) => set("pain", v)} error={errors.pain} />
        </div>

        {/* Appearance — multi-select */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            What does it look like?
          </label>
          <HelpText text="Select all that apply. The visual pattern strongly affects diagnosis." />
          <div className="mt-2">
            <CheckboxPills
              options={APPEARANCE_OPTIONS}
              values={data.appearance ?? []}
              onChange={(v) => set("appearance", v)}
            />
          </div>
        </div>

        {/* Body location */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_body_location")} <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <select value={data.bodyLocation} onChange={(e) => set("bodyLocation", e.target.value)} className={selectClass}>
            <option value="">{t("ap_s2_body_placeholder")}</option>
            {BODY_LOCATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.bodyLocation && <p className="text-red-500 text-sm mt-1">{errors.bodyLocation}</p>}
        </div>

        {/* Fitzpatrick */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_fitzpatrick")} <span style={{ color: "#c44a4a" }}>*</span>
          </label>
          <FitzpatrickSwatches value={data.fitzpatrick} onChange={(type) => set("fitzpatrick", type)} error={errors.fitzpatrick} />
        </div>

        {/* ── Optional divider ── */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 h-px" style={{ background: "var(--color-primary-200)" }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>{t("ap_s2_optional")}</span>
          <div className="flex-1 h-px" style={{ background: "var(--color-primary-200)" }} />
        </div>

        {/* Sweating */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_sweating")}
          </label>
          <RadioPills options={SWEATING_OPTIONS} value={data.sweating} onChange={(v) => set("sweating", v)} />
        </div>

        {/* Family history */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_family")}
          </label>
          <select value={data.familyHistory} onChange={(e) => set("familyHistory", e.target.value)} className={selectClass}>
            <option value="">{t("ap_s2_family_placeholder")}</option>
            {FAMILY_HISTORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* ── Phase 2 New Questions ── */}

        {/* New Medication */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_medication")}
          </label>
          <RadioPills options={MEDICATION_OPTIONS} value={data.new_medication} onChange={(v) => set("new_medication", v)} />
          <HelpText text={t("ap_s2_medication_help")} />
        </div>

        {/* Recurrence */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_recurrence")}
          </label>
          <RadioPills options={RECURRENCE_OPTIONS} value={data.recurrence} onChange={(v) => set("recurrence", v)} />
          <HelpText text={t("ap_s2_recurrence_help")} />
        </div>

        {/* Fever */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_fever")}
          </label>
          <RadioPills options={FEVER_OPTIONS} value={data.fever} onChange={(v) => set("fever", v)} />
          <HelpText text={t("ap_s2_fever_help")} />
          {hasFever && (
            <div
              className="flex items-start gap-2 mt-3 rounded-lg px-3 py-2.5"
              style={{ background: "#fef2f2", borderLeft: "3px solid #dc2626" }}
            >
              <AlertTriangle size={16} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
              <p className="text-sm" style={{ color: "#7f1d1d" }}>
                {t("ap_s2_fever_warning")}
              </p>
            </div>
          )}
        </div>

        {/* Itching timing — conditional */}
        {hasItching && (
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
              {t("ap_s2_itch_timing")}
            </label>
            <RadioPills options={ITCHING_TIMING_OPTIONS} value={data.itching_timing} onChange={(v) => set("itching_timing", v)} />
            <HelpText text={t("ap_s2_itch_timing_help")} />
          </div>
        )}

        {/* Household affected */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_household")}
          </label>
          <RadioPills options={HOUSEHOLD_OPTIONS} value={data.household_affected} onChange={(v) => set("household_affected", v)} />
          <HelpText text={t("ap_s2_household_help")} />
        </div>

        {/* Lesion migration */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {t("ap_s2_migration")}
          </label>
          <RadioPills options={MIGRATION_OPTIONS} value={data.lesion_migration} onChange={(v) => set("lesion_migration", v)} />
          <HelpText text={t("ap_s2_migration_help")} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 mt-10">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold border transition-colors min-h-[44px] order-2 sm:order-1"
          style={{ borderColor: "#b8936a", color: "#b8936a", background: "transparent" }}
        >
          {t("ap_s2_back")}
        </button>
        <button
          type="submit"
          className="w-full sm:w-auto px-8 py-3 rounded-lg font-semibold text-white min-h-[44px] order-1 sm:order-2"
          style={{ background: "#b8936a" }}
        >
          {t("ap_s2_next")}
        </button>
      </div>
    </form>
  );
}
