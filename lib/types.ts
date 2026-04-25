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
  gstin: string | null;
  legal_business_name: string | null;
  state_code: string | null;
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
  auth_user_id: string | null;
  referral_source:
    | "existing_patient"
    | "google"
    | "instagram"
    | "facebook"
    | "youtube"
    | "whatsapp"
    | "friend_family"
    | "another_doctor"
    | "walk_in"
    | "hospital_camp"
    | "other"
    | null;
  referred_by_patient_id: string | null;
  referral_source_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentRequest {
  id: string;
  doctor_id: string;
  clinic_id: string;
  patient_id: string | null;
  requested_date: string;
  requested_time_slot: "morning" | "afternoon" | "evening" | "any";
  preferred_time: string | null;
  reason: string | null;
  chief_complaint: string | null;
  is_teleconsult: boolean;
  status: "pending" | "approved" | "declined" | "cancelled" | "converted";
  decline_reason: string | null;
  converted_appointment_id: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  notes: string | null;
  requested_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  patients?: Patient;
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
  follow_up_visit_id?: string | null;
  reminder_sent_at?: string | null;
  is_teleconsult?: boolean;
  teleconsult_room_url?: string | null;
  teleconsult_room_name?: string | null;
  teleconsult_provider?: "daily" | "jitsi" | "agora" | "other" | null;
  teleconsult_started_at?: string | null;
  teleconsult_ended_at?: string | null;
  teleconsult_duration_seconds?: number | null;
  teleconsult_patient_joined_at?: string | null;
  teleconsult_doctor_joined_at?: string | null;
  teleconsult_recording_url?: string | null;
  teleconsult_notes?: string | null;
  created_at: string;
  // Joined
  patients?: Patient;
}

export interface PatientFeedback {
  id: string;
  visit_id: string | null;
  patient_id: string | null;
  doctor_id: string;
  feedback_token: string;
  rating: number | null;
  comment: string | null;
  improvement_suggestion: string | null;
  google_review_clicked: boolean;
  submitted_at: string | null;
  expires_at: string;
  created_at: string;
  // Joined
  patients?: Patient;
}

export interface DailyToken {
  id: string;
  clinic_id: string;
  doctor_id: string;
  patient_id: string | null;
  token_number: number;
  token_date: string;
  walk_in_name: string | null;
  walk_in_phone: string | null;
  chief_complaint: string | null;
  status: "waiting" | "in_consultation" | "done" | "no_show";
  called_at: string | null;
  completed_at: string | null;
  created_at: string;
  // Joined
  patients?: Patient;
}

export interface FollowUpProtocol {
  id: string;
  doctor_id: string;
  condition_name: string;
  interval_days: number;
  max_sessions: number | null;
  requires_labs: boolean;
  lab_instructions: string | null;
  notes: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
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

export interface PackageTemplate {
  id: string;
  doctor_id: string;
  clinic_id: string;
  name: string;
  total_sessions: number;
  suggested_price: number;
  session_interval_days: number;
  validity_months: number;
  notes: string | null;
  equipment_needed: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientPackage {
  id: string;
  patient_id: string;
  doctor_id: string;
  template_id: string | null;
  package_name: string;
  total_sessions: number;
  sessions_completed: number;
  total_price: number;
  amount_paid: number;
  start_date: string;
  expiry_date: string;
  status: "active" | "completed" | "expired" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  patients?: Patient;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  hsn_sac?: string;
  gst_rate?: number;
  amount: number;
}

export interface Invoice {
  id: string;
  clinic_id: string;
  doctor_id: string;
  patient_id: string;
  visit_id: string | null;
  invoice_number: string;
  fiscal_year: string;
  invoice_date: string;
  items: InvoiceItem[];
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  place_of_supply: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  patients?: Patient;
}

export interface ClinicSettings {
  clinic_id: string;
  msg91_api_key: string | null;
  sender_id: string | null;
  dlt_entity_id: string | null;
  sms_enabled: boolean;
  sms_credits_remaining: number | null;
  created_at: string;
  updated_at: string;
}

export interface SmsLog {
  id: string;
  clinic_id: string;
  doctor_id: string;
  patient_id: string | null;
  appointment_id: string | null;
  phone_number: string;
  template_used: string | null;
  message_content: string;
  status: "queued" | "sent" | "delivered" | "failed";
  provider_message_id: string | null;
  error_message: string | null;
  cost_inr: number | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface LesionMarking {
  id: string;
  visit_id: string | null;
  patient_id: string;
  doctor_id: string;
  body_region: string;
  body_view: "front" | "back";
  position_x: number;
  position_y: number;
  lesion_type: string | null;
  size_mm: number | null;
  color: string | null;
  shape: string | null;
  count: number | null;
  notes: string | null;
  clinical_photo_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicalPhoto {
  id: string;
  patient_id: string;
  doctor_id: string;
  visit_id: string | null;
  package_session_id: string | null;
  photo_url: string;
  photo_type: "before" | "during" | "after" | "clinical" | "dermoscopy";
  body_region: string | null;
  angle: "front" | "left_profile" | "right_profile" | "top" | "close_up" | "other";
  notes: string | null;
  patient_visible: boolean;
  taken_at: string;
  created_at: string;
}

export interface PackageSession {
  id: string;
  package_id: string;
  doctor_id: string;
  session_number: number;
  session_date: string | null;
  appointment_id: string | null;
  notes: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  performed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventorySupplier {
  id: string;
  doctor_id: string;
  clinic_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type InventoryCategory =
  | "medicine"
  | "consumable"
  | "equipment"
  | "cosmetic"
  | "injectable"
  | "other";

export interface InventoryItem {
  id: string;
  doctor_id: string;
  clinic_id: string;
  name: string;
  generic_name: string | null;
  category: InventoryCategory;
  form: string | null;
  strength: string | null;
  unit: string;
  hsn_sac: string | null;
  gst_rate: number | null;
  mrp: number | null;
  selling_price: number | null;
  reorder_level: number;
  reorder_quantity: number;
  is_schedule_h: boolean;
  is_active: boolean;
  barcode: string | null;
  notes: string | null;
  drug_reference_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryBatch {
  id: string;
  item_id: string;
  doctor_id: string;
  clinic_id: string;
  supplier_id: string | null;
  batch_number: string;
  expiry_date: string | null;
  manufacture_date: string | null;
  quantity_received: number;
  quantity_on_hand: number;
  cost_per_unit: number | null;
  mrp_per_unit: number | null;
  received_date: string;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type StockTransactionType =
  | "receipt"
  | "dispense"
  | "adjustment"
  | "write_off"
  | "return"
  | "transfer";

export interface StockTransaction {
  id: string;
  item_id: string;
  batch_id: string | null;
  doctor_id: string;
  clinic_id: string;
  transaction_type: StockTransactionType;
  quantity_change: number;
  quantity_after: number | null;
  reference_type: string | null;
  reference_id: string | null;
  patient_id: string | null;
  prescription_id: string | null;
  visit_id: string | null;
  reason: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  doctor_id: string;
  clinic_id: string;
  supplier_id: string | null;
  po_number: string;
  fiscal_year: string;
  po_date: string;
  expected_date: string | null;
  status: "draft" | "sent" | "partially_received" | "received" | "cancelled";
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  item_id: string | null;
  doctor_id: string;
  item_name: string;
  quantity: number;
  quantity_received: number;
  unit_cost: number;
  gst_rate: number | null;
  line_total: number;
  notes: string | null;
  created_at: string;
}

export interface DrugReference {
  id: string;
  doctor_id: string | null;
  name: string;
  generic_name: string | null;
  brand_names: string[] | null;
  category: string | null;
  form: string | null;
  common_strengths: string[] | null;
  indication: string | null;
  is_schedule_h: boolean;
  is_system: boolean;
  notes: string | null;
  created_at: string;
}

export interface CurrentStockRow {
  item_id: string;
  doctor_id: string;
  clinic_id: string;
  name: string;
  generic_name: string | null;
  category: InventoryCategory;
  form: string | null;
  strength: string | null;
  unit: string;
  reorder_level: number;
  reorder_quantity: number;
  is_schedule_h: boolean;
  is_active: boolean;
  total_on_hand: number;
  active_batches: number;
  nearest_expiry: string | null;
  fefo_batch_id: string | null;
  is_low_stock: boolean;
  has_near_expiry: boolean | null;
}

export interface DeductStockResult {
  item_id: string;
  quantity_deducted: number;
  batches_touched: {
    batch_id: string;
    batch_number: string;
    expiry_date: string | null;
    quantity_taken: number;
    quantity_after: number;
  }[];
}

export type LabTestCategory =
  | "hematology"
  | "biochemistry"
  | "hormonal"
  | "immunology"
  | "microbiology"
  | "histopathology"
  | "serology"
  | "genetic"
  | "imaging"
  | "urinalysis"
  | "other";

export type LabOrderStatus =
  | "ordered"
  | "sample_collected"
  | "in_progress"
  | "results_available"
  | "reviewed"
  | "cancelled";

export interface LabOrder {
  id: string;
  doctor_id: string;
  clinic_id: string;
  patient_id: string;
  visit_id: string | null;
  prescription_id: string | null;
  test_name: string;
  test_category: LabTestCategory;
  tests: { name: string; code?: string; notes?: string }[];
  priority: "routine" | "urgent" | "stat";
  clinical_notes: string | null;
  reason: string | null;
  fasting_required: boolean;
  patient_instructions: string | null;
  external_lab_name: string | null;
  external_lab_phone: string | null;
  status: LabOrderStatus;
  is_abnormal: boolean | null;
  result_summary: string | null;
  result_pdf_url: string | null;
  result_values: Record<string, unknown> | null;
  doctor_review_notes: string | null;
  ordered_at: string;
  sample_collected_at: string | null;
  results_available_at: string | null;
  reviewed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  patients?: Patient;
}
