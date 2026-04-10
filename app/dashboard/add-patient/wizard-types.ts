export interface ScreeningData {
  age: string;
  gender: string;
  duration: string;
  presence: string;
  itching: string;
  pain: string;
  bodyLocation: string;
  fitzpatrick: number | null;
  sweating: string;
  familyHistory: string;
  // Phase 2 — blister sub-questions
  blister_size: string;
  blister_fragility: string;
  blister_duration: string;
  blister_mucous_membrane: string;
  // Phase 2 — new general questions
  new_medication: string;
  recurrence: string;
  fever: string;
  itching_timing: string;
  household_affected: string;
  lesion_migration: string;
  // Phase 3 — visual appearance (multi-select)
  appearance: string[];
}

export interface PatientFormData {
  fullName: string;
  phone: string;
  email: string;
  dob: string;
  address: string;
  city: string;
  state: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string;
  medicalRecords: File[];
}

export interface SavedPatient {
  id: string;
  name: string;
  patient_display_id: string;
  phone: string;
  photoCount: number;
  recordCount: number;
  photoUploadFailed: number;
  photoUrls: string[];
}

export interface AIResult {
  source: "ai" | "pending";
  diagnosis: string;
  diagnosis_display: string;
  confidence: number;
  severity: number;
  severity_label: string;
  top_3: { class: string; confidence: number }[];
  category: string | null;
  urgent?: { isUrgent: boolean; triggerName?: string; message?: string };
  api_warnings?: string[];
}

export const INITIAL_SCREENING: ScreeningData = {
  age: "",
  gender: "",
  duration: "",
  presence: "",
  itching: "",
  pain: "",
  bodyLocation: "",
  fitzpatrick: null,
  sweating: "",
  familyHistory: "",
  blister_size: "",
  blister_fragility: "",
  blister_duration: "",
  blister_mucous_membrane: "",
  new_medication: "",
  recurrence: "",
  fever: "",
  itching_timing: "",
  household_affected: "",
  lesion_migration: "",
  appearance: [],
};

export const INITIAL_FORM: PatientFormData = {
  fullName: "",
  phone: "",
  email: "",
  dob: "",
  address: "",
  city: "",
  state: "",
  bloodGroup: "",
  allergies: [],
  chronicConditions: [],
  currentMedications: "",
  medicalRecords: [],
};
