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
  active: "bg-blue-100 text-blue-700",
  under_treatment: "bg-amber-100 text-amber-700",
  follow_up: "bg-indigo-100 text-indigo-700",
  recovered: "bg-green-100 text-green-700",
  referred: "bg-purple-100 text-purple-700",
  discontinued: "bg-gray-100 text-gray-600",
};

export const SEVERITY_OPTIONS = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
  { value: "critical", label: "Critical" },
];

export const SEVERITY_COLORS: Record<string, string> = {
  mild: "bg-green-100 text-green-700",
  moderate: "bg-yellow-100 text-yellow-700",
  severe: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
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
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  checked_in: "bg-cyan-100 text-cyan-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-600",
  rescheduled: "bg-purple-100 text-purple-700",
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
