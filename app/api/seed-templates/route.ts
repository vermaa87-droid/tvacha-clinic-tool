import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const GENERAL_TEMPLATES = [
  {
    doctor_id: null,
    name: "Viral Fever - Standard",
    condition: "viral_fever_standard",
    condition_display: "Viral Fever - Standard",
    category: "general",
    medicines: [
      { name: "Paracetamol 500mg", dosage: "1 tablet", frequency: "Three times daily", duration: "5 days", instructions: "Take after food" },
      { name: "Cetirizine 10mg", dosage: "1 tablet", frequency: "Once daily at night", duration: "5 days", instructions: "May cause drowsiness" },
      { name: "ORS sachets", dosage: "1 sachet in 1L water", frequency: "As needed", duration: "As needed", instructions: "Sip throughout the day" },
    ],
    special_instructions: "Plenty of fluids. Rest. Return if fever persists >3 days or rash appears.",
    follow_up_days: 5,
    is_system: true,
    usage_count: 0,
  },
  {
    doctor_id: null,
    name: "Upper Respiratory Infection",
    condition: "upper_respiratory_infection",
    condition_display: "Upper Respiratory Infection",
    category: "general",
    medicines: [
      { name: "Amoxicillin 500mg", dosage: "1 capsule", frequency: "Three times daily", duration: "5 days", instructions: "Complete the course" },
      { name: "Montelukast-Levocetirizine", dosage: "1 tablet", frequency: "Once daily at night", duration: "7 days", instructions: "" },
      { name: "Ambrodil-S syrup", dosage: "10ml", frequency: "Three times daily", duration: "5 days", instructions: "Take after food" },
    ],
    special_instructions: "Avoid cold drinks. Gargle with warm salt water. Steam inhalation twice daily.",
    follow_up_days: 7,
    is_system: true,
    usage_count: 0,
  },
  {
    doctor_id: null,
    name: "UTI - Standard",
    condition: "uti_standard",
    condition_display: "UTI - Standard",
    category: "general",
    medicines: [
      { name: "Nitrofurantoin 100mg", dosage: "1 capsule", frequency: "Twice daily", duration: "5 days", instructions: "Take with food. Complete full course." },
      { name: "Paracetamol 500mg", dosage: "1 tablet", frequency: "As needed", duration: "As needed", instructions: "For pain/fever" },
    ],
    special_instructions: "Drink 3+ liters of water daily. Avoid spicy food.",
    follow_up_days: 7,
    is_system: true,
    usage_count: 0,
  },
  {
    doctor_id: null,
    name: "Type 2 Diabetes - Maintenance",
    condition: "type_2_diabetes_maintenance",
    condition_display: "Type 2 Diabetes - Maintenance",
    category: "general",
    medicines: [
      { name: "Metformin 500mg", dosage: "1 tablet", frequency: "Twice daily", duration: "Ongoing", instructions: "Take with meals" },
      { name: "Glimepiride 1mg", dosage: "1 tablet", frequency: "Once daily before breakfast", duration: "Ongoing", instructions: "" },
    ],
    special_instructions: "Check fasting blood sugar monthly. Diet control essential.",
    follow_up_days: 30,
    is_system: true,
    usage_count: 0,
  },
  {
    doctor_id: null,
    name: "Hypertension - Maintenance",
    condition: "hypertension_maintenance",
    condition_display: "Hypertension - Maintenance",
    category: "general",
    medicines: [
      { name: "Amlodipine 5mg", dosage: "1 tablet", frequency: "Once daily morning", duration: "Ongoing", instructions: "" },
      { name: "Telmisartan 40mg", dosage: "1 tablet", frequency: "Once daily morning", duration: "Ongoing", instructions: "" },
    ],
    special_instructions: "Reduce salt. Check BP weekly. Don't skip doses.",
    follow_up_days: 30,
    is_system: true,
    usage_count: 0,
  },
  {
    doctor_id: null,
    name: "Gastric/Acidity",
    condition: "gastric_acidity",
    condition_display: "Gastric/Acidity",
    category: "general",
    medicines: [
      { name: "Pantoprazole 40mg", dosage: "1 tablet", frequency: "Once daily before breakfast", duration: "14 days", instructions: "" },
      { name: "Domperidone 10mg", dosage: "1 tablet", frequency: "Three times daily before meals", duration: "7 days", instructions: "" },
      { name: "Antacid gel", dosage: "10ml", frequency: "As needed", duration: "As needed", instructions: "Take between meals" },
    ],
    special_instructions: "Avoid spicy/oily food. Eat small frequent meals.",
    follow_up_days: 14,
    is_system: true,
    usage_count: 0,
  },
  {
    doctor_id: null,
    name: "Allergic Reaction - Mild",
    condition: "allergic_reaction_mild",
    condition_display: "Allergic Reaction - Mild",
    category: "general",
    medicines: [
      { name: "Cetirizine 10mg", dosage: "1 tablet", frequency: "Once daily at night", duration: "7 days", instructions: "" },
      { name: "Prednisolone 10mg", dosage: "1 tablet", frequency: "Once daily morning", duration: "5 days then taper", instructions: "" },
      { name: "Calamine lotion", dosage: "Apply", frequency: "Three times daily", duration: "Until resolved", instructions: "" },
    ],
    special_instructions: "Identify and avoid the allergen.",
    follow_up_days: 7,
    is_system: true,
    usage_count: 0,
  },
  {
    doctor_id: null,
    name: "Diarrhea/Gastroenteritis",
    condition: "diarrhea_gastroenteritis",
    condition_display: "Diarrhea/Gastroenteritis",
    category: "general",
    medicines: [
      { name: "ORS sachets", dosage: "1 sachet in 1L water", frequency: "After every loose motion", duration: "As needed", instructions: "" },
      { name: "Racecadotril 100mg", dosage: "1 capsule", frequency: "Three times daily", duration: "3 days", instructions: "" },
      { name: "Probiotic sachet", dosage: "1 sachet", frequency: "Once daily", duration: "5 days", instructions: "" },
    ],
    special_instructions: "BRAT diet (banana, rice, apple, toast). Seek emergency if blood in stool.",
    follow_up_days: 3,
    is_system: true,
    usage_count: 0,
  },
  {
    doctor_id: null,
    name: "Joint Pain / Musculoskeletal",
    condition: "joint_pain_musculoskeletal",
    condition_display: "Joint Pain / Musculoskeletal",
    category: "general",
    medicines: [
      { name: "Diclofenac 50mg", dosage: "1 tablet", frequency: "Twice daily after food", duration: "5 days", instructions: "Take with antacid" },
      { name: "Pantoprazole 40mg", dosage: "1 tablet", frequency: "Once daily morning", duration: "5 days", instructions: "Stomach protection" },
      { name: "Thiocolchicoside 4mg", dosage: "1 tablet", frequency: "Twice daily", duration: "5 days", instructions: "Muscle relaxant" },
    ],
    special_instructions: "Apply hot compress. Avoid heavy lifting.",
    follow_up_days: 7,
    is_system: true,
    usage_count: 0,
  },
];

export async function GET() {
  try {
    // Fetch existing template names
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("prescription_templates")
      .select("name");

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch existing templates", details: fetchError.message },
        { status: 500 }
      );
    }

    const existingNames = new Set((existing || []).map((t: { name: string }) => t.name));

    const toInsert = GENERAL_TEMPLATES.filter((t) => !existingNames.has(t.name));
    const skipped = GENERAL_TEMPLATES.length - toInsert.length;

    if (toInsert.length === 0) {
      return NextResponse.json({
        message: "All templates already exist",
        inserted: 0,
        skipped,
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from("prescription_templates")
      .insert(toInsert);

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to insert templates", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Successfully seeded ${toInsert.length} template(s)`,
      inserted: toInsert.length,
      skipped,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected error", details: (err as Error).message },
      { status: 500 }
    );
  }
}
