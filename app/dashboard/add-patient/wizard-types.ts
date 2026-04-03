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
