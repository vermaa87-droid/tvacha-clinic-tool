export interface Doctor {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  qualifications: string;
  registration_number: string;
  clinic_name: string;
  clinic_address: string | null;
  clinic_city: string | null;
  clinic_state: string | null;
  clinic_pincode: string | null;
  referral_code: string;
  profile_photo_url: string | null;
  signature_url: string | null;
  logo_url: string | null;
  specialization: string;
  experience_years: number;
  rating: number;
  total_ratings: number;
  subscription_status: "trial" | "active" | "expired" | "cancelled";
  trial_start_date: string;
  subscription_end_date: string;
  state_medical_council: string | null;
  is_verified: boolean;
  default_consultation_fee: number | null;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  fitzpatrick_type: number | null;
  linked_doctor_id: string | null;
  referral_code_used: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  medical_history: Record<string, unknown>;
  allergies: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  patient_id: string;
  assigned_doctor_id: string;
  ai_diagnosis: string;
  ai_diagnosis_display: string;
  ai_confidence: number;
  ai_severity: number;
  ai_severity_label: string;
  ai_top_3: { class: string; confidence: number }[] | null;
  body_location: string | null;
  duration: string | null;
  itching_level: string | null;
  pain_level: string | null;
  photo_urls: string[] | null;
  questionnaire_data: Record<string, unknown> | null;
  status: "pending" | "pending_review" | "approved" | "corrected" | "confirmed" | "flagged" | "referred";
  doctor_diagnosis: string | null;
  doctor_notes: string | null;
  doctor_flagged: boolean;
  doctor_override_diagnosis: string | null;
  doctor_override_notes: string | null;
  doctor_reviewed_at: string | null;
  reviewed_at: string | null;
  earning_amount: number;
  earning_paid: boolean;
  category: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  patients?: Patient;
}

export interface Prescription {
  id: string;
  doctor_id: string;
  patient_id: string;
  case_id: string | null;
  diagnosis: string;
  medicines: Medicine[];
  special_instructions: string | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  template_id: string | null;
  status: "active" | "completed" | "cancelled";
  pdf_url: string | null;
  created_at: string;
  // Joined
  patients?: Patient;
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PrescriptionTemplate {
  id: string;
  doctor_id: string | null;
  name: string;
  condition: string;
  condition_display: string;
  category: string;
  medicines: Medicine[];
  special_instructions: string | null;
  follow_up_days: number | null;
  is_system: boolean;
  usage_count: number;
  created_at: string;
}

export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  type: string;
  status: "scheduled" | "confirmed" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show" | "rescheduled";
  notes: string | null;
  reason: string | null;
  visit_fee: number | null;
  created_at: string;
  // Joined
  patients?: Patient;
}

export interface Earning {
  id: string;
  doctor_id: string;
  case_id: string | null;
  amount: number;
  type: "case_review" | "consultation" | "referral_commission";
  description: string | null;
  status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  sender_type: "doctor" | "patient";
  sender_id: string;
  recipient_id: string;
  patient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}
