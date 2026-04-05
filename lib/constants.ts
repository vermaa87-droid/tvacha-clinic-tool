export const DISEASES = [
  "Tinea Corporis",
  "Eczema",
  "Acne Vulgaris",
  "Psoriasis",
  "Contact Dermatitis",
  "Fungal Infection",
  "Bacterial Infection",
  "Viral Infection",
];

export const SEVERITY_LEVELS = {
  1: "Mild",
  2: "Moderate",
  3: "Moderate-Severe",
  4: "Severe",
  5: "Critical",
};

export const CASE_CONDITIONS = ["Fungal", "Bacterial", "Viral", "Complex"];

// Dropdown options used across Clinic Register, Patient forms, Visit Log, etc.

export const TREATMENT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "under_treatment", label: "Under Treatment" },
  { value: "follow_up", label: "Follow-up" },
  { value: "recovered", label: "Recovered" },
  { value: "referred", label: "Referred" },
  { value: "discontinued", label: "Discontinued" },
];

export const TREATMENT_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  under_treatment: "bg-amber-50 text-amber-700",
  follow_up: "bg-sky-50 text-sky-700",
  recovered: "bg-teal-50 text-teal-700",
  referred: "bg-violet-50 text-violet-700",
  discontinued: "bg-stone-100 text-stone-600",
};

export const SEVERITY_OPTIONS = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
  { value: "critical", label: "Critical" },
];

export const SEVERITY_COLORS: Record<string, string> = {
  mild: "bg-amber-50 text-amber-700",
  moderate: "bg-orange-50 text-orange-600",
  severe: "bg-red-50 text-red-700",
  critical: "bg-red-100 text-red-800",
};

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const BLOOD_GROUP_OPTIONS = [
  { value: "A+", label: "A+" }, { value: "A-", label: "A-" },
  { value: "B+", label: "B+" }, { value: "B-", label: "B-" },
  { value: "O+", label: "O+" }, { value: "O-", label: "O-" },
  { value: "AB+", label: "AB+" }, { value: "AB-", label: "AB-" },
];

export const FITZPATRICK_OPTIONS = [
  { value: "1", label: "Type I - Very Fair" },
  { value: "2", label: "Type II - Fair" },
  { value: "3", label: "Type III - Medium" },
  { value: "4", label: "Type IV - Olive" },
  { value: "5", label: "Type V - Brown" },
  { value: "6", label: "Type VI - Dark" },
];

export const BODY_LOCATIONS = [
  "Face", "Scalp", "Neck", "Chest", "Back", "Abdomen", "Upper Arms", "Lower Arms",
  "Hands", "Palms", "Upper Legs", "Lower Legs", "Feet", "Soles", "Groin", "Nails",
  "Lips", "Ears", "Genitals", "Full Body", "Other",
];

export const TREATMENT_TYPES = [
  "Topical Medication", "Oral Medication", "Injection", "Minor Procedure",
  "Counseling", "Phototherapy", "Referral", "Other",
];

export const REFERRAL_OPTIONS = [
  { value: "none", label: "None" }, { value: "dermatologist", label: "Dermatologist" },
  { value: "oncologist", label: "Oncologist" }, { value: "allergist", label: "Allergist" },
  { value: "pathologist", label: "Pathologist" }, { value: "other", label: "Other" },
];

export const VISIT_TYPE_OPTIONS = [
  { value: "new_visit", label: "New Visit" }, { value: "follow_up", label: "Follow-up" },
  { value: "procedure", label: "Procedure" }, { value: "emergency", label: "Emergency" },
  { value: "teleconsult", label: "Tele-consult" },
];

export const APPOINTMENT_STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" }, { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked In" }, { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" }, { value: "rescheduled", label: "Rescheduled" },
];

export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  confirmed: "bg-indigo-50 text-indigo-700",
  checked_in: "bg-cyan-50 text-cyan-700",
  in_progress: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
  no_show: "bg-stone-100 text-stone-600",
  rescheduled: "bg-violet-50 text-violet-700",
};

export const TREATMENT_RESPONSE_OPTIONS = [
  { value: "excellent", label: "Excellent" }, { value: "good", label: "Good" },
  { value: "partial", label: "Partial" }, { value: "poor", label: "Poor" },
  { value: "no_response", label: "No Response" }, { value: "worsening", label: "Worsening" },
];

export const COMPLIANCE_OPTIONS = [
  { value: "excellent", label: "Excellent" }, { value: "good", label: "Good" },
  { value: "fair", label: "Fair" }, { value: "poor", label: "Poor" },
  { value: "unknown", label: "Unknown" },
];

export const TREATMENT_PLAN_STATUS_OPTIONS = [
  { value: "ongoing", label: "Ongoing" }, { value: "completed", label: "Completed" },
  { value: "modified", label: "Modified" }, { value: "paused", label: "Paused" },
  { value: "discontinued", label: "Discontinued" },
];

export const MEDICATION_CATEGORY_OPTIONS = [
  { value: "topical_cream", label: "Topical (Cream)" },
  { value: "topical_ointment", label: "Topical (Ointment)" },
  { value: "topical_gel", label: "Topical (Gel)" },
  { value: "topical_lotion", label: "Topical (Lotion)" },
  { value: "oral_tablet", label: "Oral Tablet" },
  { value: "oral_capsule", label: "Oral Capsule" },
  { value: "oral_syrup", label: "Oral Syrup" },
  { value: "injection", label: "Injection" },
  { value: "shampoo", label: "Shampoo" },
  { value: "drops", label: "Drops" },
  { value: "other", label: "Other" },
];

export const FREQUENCY_OPTIONS = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "three_daily", label: "Three times daily" },
  { value: "once_weekly", label: "Once weekly" },
  { value: "twice_weekly", label: "Twice weekly" },
  { value: "as_needed", label: "As needed" },
  { value: "before_meals", label: "Before meals" },
  { value: "after_meals", label: "After meals" },
  { value: "at_bedtime", label: "At bedtime" },
];

export const COMMON_MEDICINES = [
  "Clotrimazole", "Terbinafine", "Ketoconazole", "Fluconazole", "Itraconazole", "Griseofulvin",
  "Mometasone Furoate", "Clobetasol Propionate", "Betamethasone", "Hydrocortisone",
  "Triamcinolone", "Desonide", "Halobetasol", "Adapalene", "Tretinoin",
  "Benzoyl Peroxide", "Clindamycin", "Doxycycline", "Minocycline", "Isotretinoin",
  "Azithromycin", "Cetirizine", "Loratadine", "Fexofenadine", "Hydroxyzine", "Levocetirizine",
  "Tacrolimus", "Pimecrolimus", "Calcipotriol", "Permethrin", "Ivermectin",
  "Mupirocin", "Fusidic Acid", "Salicylic Acid", "Coal Tar", "Selenium Sulfide",
  "Zinc Pyrithione", "Calamine", "Sunscreen SPF 30+", "Sunscreen SPF 50+",
  "Moisturizer (Cetaphil)", "Moisturizer (CeraVe)", "Petroleum Jelly", "Coconut Oil",
  "Vitamin D3", "Methotrexate", "Cyclosporine", "Acyclovir", "Valacyclovir",
  "Paracetamol", "Amoxicillin", "Montelukast", "Nitrofurantoin", "Metformin",
  "Glimepiride", "Amlodipine", "Telmisartan", "Pantoprazole", "Domperidone",
  "Prednisolone", "Racecadotril", "Diclofenac", "Thiocolchicoside",
  "ORS", "Probiotic", "Ambrodil-S",
];

// ── AI Diagnosis Constants ────────────────────────────────────────────────────

export const DIAGNOSIS_CLASSES = [
  "healthy", "acne", "fungal_infection", "eczema", "contact_dermatitis",
  "urticaria", "psoriasis", "melanoma", "basal_cell_carcinoma",
  "squamous_cell_carcinoma", "melanocytic_nevus", "benign_lesion",
  "pigmentary_disorder", "bacterial_infection", "viral_infection",
  "bullous_disease", "scabies",
] as const;

export type DiagnosisClass = typeof DIAGNOSIS_CLASSES[number];

export const CLASS_DISPLAY_NAMES: Record<string, string> = {
  healthy: "Healthy Skin",
  acne: "Acne",
  fungal_infection: "Fungal Infection",
  eczema: "Eczema (Atopic Dermatitis)",
  contact_dermatitis: "Contact Dermatitis",
  urticaria: "Urticaria (Hives)",
  psoriasis: "Psoriasis",
  melanoma: "Melanoma (Skin Cancer)",
  basal_cell_carcinoma: "Basal Cell Carcinoma",
  squamous_cell_carcinoma: "Squamous Cell Carcinoma",
  melanocytic_nevus: "Mole (Melanocytic Nevus)",
  benign_lesion: "Benign Skin Lesion",
  pigmentary_disorder: "Pigmentation Disorder",
  bacterial_infection: "Bacterial Infection",
  viral_infection: "Viral Infection (Warts / Molluscum)",
  bullous_disease: "Bullous Disease (Blistering Disorder)",
  scabies: "Scabies",
  // Legacy alias — kept so mock fallback doesn't break if old model is still running
  dermatitis: "Dermatitis / Eczema",
  uncertain: "Uncertain — See a Doctor",
};

export const CLASS_SEVERITY: Record<string, number> = {
  healthy: 0, acne: 1, fungal_infection: 2,
  eczema: 2, contact_dermatitis: 2, urticaria: 2, psoriasis: 3,
  melanoma: 5, basal_cell_carcinoma: 4, squamous_cell_carcinoma: 4,
  melanocytic_nevus: 0, benign_lesion: 1, pigmentary_disorder: 1,
  bacterial_infection: 3, viral_infection: 2, bullous_disease: 3, scabies: 3,
};

export const CANCER_CLASSES = ["melanoma", "basal_cell_carcinoma", "squamous_cell_carcinoma"];

export interface ClassWarning {
  type: string;
  color: "amber" | "red";
  title: string;
  message: string;
  treatment_hint?: string;
}

export const CLASS_WARNINGS: Record<string, ClassWarning> = {
  scabies: {
    type: "contagion",
    color: "amber",
    title: "Contagious Condition",
    message: "Scabies is highly contagious. ALL household contacts and close contacts should be treated simultaneously. Do NOT prescribe topical steroids — they mask symptoms but worsen the infestation.",
    treatment_hint: "Permethrin 5% cream or oral Ivermectin",
  },
  bullous_disease: {
    type: "urgent_referral",
    color: "red",
    title: "Blistering Disease — Specialist Required",
    message: "Autoimmune blistering diseases (pemphigoid, pemphigus, etc.) require specialist diagnosis with skin biopsy. Do NOT pop blisters. If blisters involve mouth, eyes, or genitals — refer urgently.",
    treatment_hint: "Refer to dermatology for biopsy. May require immunosuppressive therapy.",
  },
  urticaria: {
    type: "emergency_screen",
    color: "red",
    title: "Screen for Anaphylaxis",
    message: "Ask the patient: Do you have difficulty breathing, throat tightness, or swelling of lips/tongue? If YES — this is a medical emergency (possible anaphylaxis). Refer immediately.",
    treatment_hint: "Antihistamines (cetirizine, fexofenadine). If anaphylaxis suspected: Epinephrine.",
  },
  melanoma: {
    type: "urgent_referral",
    color: "red",
    title: "Urgent Dermatology Referral",
    message: "Suspected melanoma requires urgent biopsy and dermatology referral. Do not delay.",
    treatment_hint: "Refer to dermatologist/oncologist immediately",
  },
  basal_cell_carcinoma: {
    type: "urgent_referral",
    color: "red",
    title: "Dermatology Referral Recommended",
    message: "Suspected skin cancer. Biopsy and specialist evaluation needed.",
    treatment_hint: "Refer to dermatologist for biopsy",
  },
  squamous_cell_carcinoma: {
    type: "urgent_referral",
    color: "red",
    title: "Dermatology Referral Recommended",
    message: "Suspected skin cancer. Biopsy and specialist evaluation needed.",
    treatment_hint: "Refer to dermatologist for biopsy",
  },
};

export interface UrgentTrigger {
  name: string;
  conditions: Record<string, string | string[]>;
  message: string;
}

export const URGENT_REFERRAL_TRIGGERS: UrgentTrigger[] = [
  {
    name: "Possible bullous disease",
    conditions: { blister_size: "Coin-sized or larger (>1cm)", blister_fragility: "Stay intact, hard to break" },
    message: "Large, intact blisters may indicate an autoimmune blistering disease (e.g., bullous pemphigoid). This requires in-person dermatology evaluation with skin biopsy.",
  },
  {
    name: "Possible Stevens-Johnson Syndrome",
    conditions: {
      blister_mucous_membrane: "Yes",
      new_medication: ["Yes — antibiotics", "Yes — painkillers/NSAIDs", "Yes — blood pressure or heart medication", "Yes — other medication"],
      fever: "High fever / very unwell",
    },
    message: "Blisters with mucous membrane involvement + recent medication + fever may indicate Stevens-Johnson Syndrome (SJS/TEN) — a MEDICAL EMERGENCY. Refer to hospital immediately.",
  },
  {
    name: "Possible pemphigus vulgaris",
    conditions: { blister_fragility: "Pop easily with light touch", blister_mucous_membrane: "Yes" },
    message: "Fragile blisters with oral/mucous membrane involvement may indicate pemphigus vulgaris. Requires urgent dermatology referral and skin biopsy.",
  },
  {
    name: "Systemic symptoms — urgent evaluation",
    conditions: { fever: "High fever / very unwell" },
    message: "Skin symptoms combined with high fever may indicate a serious systemic condition. Consider urgent medical evaluation.",
  },
];
