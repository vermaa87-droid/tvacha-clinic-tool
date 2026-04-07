import { supabaseAdmin } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// ── helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function dateOnly(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ── GET /api/seed-demo?doctorId=<uuid> ────────────────────────────────────────

export async function GET(req: NextRequest) {
  const doctorId = req.nextUrl.searchParams.get("doctorId");
  if (!doctorId) {
    return NextResponse.json({ error: "Missing doctorId query param" }, { status: 400 });
  }

  // ── Verify doctor exists ──────────────────────────────────────────────────
  const { data: doctor } = await supabaseAdmin
    .from("doctors")
    .select("id, full_name")
    .eq("id", doctorId)
    .single();

  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  // ── Get current highest NDN number for this doctor ────────────────────────
  const { data: existingPatients } = await supabaseAdmin
    .from("patients")
    .select("patient_display_id, name")
    .eq("linked_doctor_id", doctorId)
    .like("patient_display_id", "NDN-%")
    .order("created_at", { ascending: false });

  // Check which demo patients already exist
  const existingNames = new Set((existingPatients ?? []).map((p: { name: string }) => p.name));

  let nextNum = 1;
  if (existingPatients && existingPatients.length > 0) {
    const match = existingPatients[0].patient_display_id?.match(/NDN-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  // ── Patient definitions ───────────────────────────────────────────────────

  const patientDefs = [
    // Fungal (6)
    { name: "Priya Sharma",   age: 28, gender: "female", diagnosis: "Tinea Corporis",    severity: "moderate", body: "Trunk",          ai_diag: "fungal_infection", status: "active",    created_days_ago: 32 },
    { name: "Rajesh Kumar",   age: 42, gender: "male",   diagnosis: "Tinea Versicolor",  severity: "mild",     body: "Back",           ai_diag: "fungal_infection", status: "recovered", created_days_ago: 28 },
    { name: "Sunita Devi",    age: 35, gender: "female", diagnosis: "Tinea Cruris",      severity: "moderate", body: "Groin",          ai_diag: "fungal_infection", status: "active",    created_days_ago: 21 },
    { name: "Vikram Singh",   age: 55, gender: "male",   diagnosis: "Candidiasis",       severity: "mild",     body: "Hands/Fingers",  ai_diag: "fungal_infection", status: "active",    created_days_ago: 18 },
    { name: "Nisha Agarwal",  age: 22, gender: "female", diagnosis: "Tinea Pedis",       severity: "mild",     body: "Feet/Toes",      ai_diag: "fungal_infection", status: "recovered", created_days_ago: 40 },
    { name: "Deepak Yadav",   age: 31, gender: "male",   diagnosis: "Ringworm",          severity: "moderate", body: "Arms",           ai_diag: "fungal_infection", status: "active",    created_days_ago: 14 },
    // Acne (4)
    { name: "Ananya Mishra",  age: 19, gender: "female", diagnosis: "Acne Vulgaris",     severity: "mild",     body: "Face",           ai_diag: "acne",             status: "active",    created_days_ago: 10 },
    { name: "Karan Mehta",    age: 23, gender: "male",   diagnosis: "Acne Mechanica",    severity: "moderate", body: "Scalp",          ai_diag: "acne",             status: "active",    created_days_ago: 7  },
    { name: "Ritu Joshi",     age: 17, gender: "female", diagnosis: "Comedonal Acne",    severity: "mild",     body: "Face",           ai_diag: "acne",             status: "active",    created_days_ago: 25 },
    { name: "Arjun Patel",    age: 20, gender: "male",   diagnosis: "Cystic Acne",       severity: "severe",   body: "Face",           ai_diag: "acne",             status: "active",    created_days_ago: 5  },
    // Eczema/Dermatitis (4)
    { name: "Meera Gupta",    age: 45, gender: "female", diagnosis: "Eczema",            severity: "moderate", body: "Hands",          ai_diag: "eczema",           status: "active",    created_days_ago: 30 },
    { name: "Ramesh Tiwari",  age: 60, gender: "male",   diagnosis: "Contact Dermatitis",severity: "mild",     body: "Neck",           ai_diag: "contact_dermatitis",status: "recovered",created_days_ago: 38 },
    { name: "Sanya Kapoor",   age: 14, gender: "female", diagnosis: "Atopic Dermatitis", severity: "moderate", body: "Arms",           ai_diag: "eczema",           status: "active",    created_days_ago: 20 },
    { name: "Amit Saxena",    age: 38, gender: "male",   diagnosis: "Seborrheic Dermatitis", severity: "mild", body: "Scalp",          ai_diag: "eczema",           status: "active",    created_days_ago: 15 },
    // Psoriasis (2)
    { name: "Kavita Reddy",   age: 50, gender: "female", diagnosis: "Psoriasis (Plaque Type)", severity: "moderate", body: "Elbows",  ai_diag: "psoriasis",        status: "active",    created_days_ago: 22 },
    { name: "Sunil Pandey",   age: 47, gender: "male",   diagnosis: "Psoriasis (Guttate)", severity: "severe", body: "Trunk",          ai_diag: "psoriasis",        status: "active",    created_days_ago: 12 },
    // Other (4)
    { name: "Pooja Verma",    age: 33, gender: "female", diagnosis: "Urticaria",         severity: "mild",     body: "Full Body",      ai_diag: "urticaria",        status: "recovered", created_days_ago: 35 },
    { name: "Mohit Sharma",   age: 26, gender: "male",   diagnosis: "Vitiligo",          severity: "moderate", body: "Hands",          ai_diag: "pigmentary_disorder",status:"active",   created_days_ago: 17 },
    { name: "Neha Singh",     age: 40, gender: "female", diagnosis: "Melasma",           severity: "mild",     body: "Face",           ai_diag: "pigmentary_disorder",status:"active",   created_days_ago: 9  },
    { name: "Ravi Chauhan",   age: 52, gender: "male",   diagnosis: "Scabies",           severity: "moderate", body: "Hands/Fingers",  ai_diag: "scabies",          status: "active",    created_days_ago: 6  },
  ];

  const toInsert = patientDefs.filter((p) => !existingNames.has(p.name));
  const skippedPatients = patientDefs.length - toInsert.length;

  // ── Insert patients ───────────────────────────────────────────────────────

  const insertedPatients: { id: string; name: string; diagnosis: string; body: string; ai_diag: string; status: string }[] = [];

  for (const p of toInsert) {
    const displayId = `NDN-${String(nextNum).padStart(4, "0")}`;
    nextNum++;

    const sevMap: Record<string, number> = { mild: 1, moderate: 2, severe: 3, critical: 4 };
    const aiConfidence = 0.62 + Math.random() * 0.28;
    const aiSeverity = sevMap[p.severity] ?? 2;
    const aiSeverityLabel = p.severity.charAt(0).toUpperCase() + p.severity.slice(1);

    const { data: newPatient, error: patErr } = await supabaseAdmin
      .from("patients")
      .insert({
        name: p.name,
        patient_display_id: displayId,
        age: p.age,
        gender: p.gender,
        linked_doctor_id: doctorId,
        current_diagnosis: p.diagnosis,
        diagnosis_date: dateOnly(p.created_days_ago - 1),
        severity: p.severity,
        treatment_status: p.status,
        chief_complaint: `Skin condition — ${p.diagnosis}`,
        total_visits: 0,
        last_visit_date: dateOnly(Math.max(0, p.created_days_ago - 2)),
        created_at: daysAgo(p.created_days_ago),
        updated_at: daysAgo(p.created_days_ago),
        medical_history: {
          screening_questions: {
            bodyLocation: p.body,
            duration: "1_4w",
            itching: "mild",
            pain: "none",
            presence: "comes_goes",
          },
        },
      })
      .select("id")
      .single();

    if (patErr || !newPatient) {
      console.error(`[seed-demo] failed to insert patient ${p.name}:`, patErr?.message);
      continue;
    }

    // Insert case row with AI result
    await supabaseAdmin.from("cases").insert({
      patient_id: newPatient.id,
      assigned_doctor_id: doctorId,
      ai_diagnosis: p.ai_diag,
      ai_diagnosis_display: p.diagnosis,
      ai_confidence: parseFloat(aiConfidence.toFixed(3)),
      ai_severity: aiSeverity,
      ai_severity_label: aiSeverityLabel,
      ai_top_3: [
        { class: p.ai_diag, confidence: parseFloat(aiConfidence.toFixed(3)) },
      ],
      body_location: p.body,
      status: p.status === "recovered" ? "confirmed" : "confirmed",
      doctor_override_diagnosis: p.diagnosis,
      doctor_reviewed_at: daysAgo(p.created_days_ago - 1),
      created_at: daysAgo(p.created_days_ago),
    });

    insertedPatients.push({ id: newPatient.id, name: p.name, diagnosis: p.diagnosis, body: p.body, ai_diag: p.ai_diag, status: p.status });
  }

  // ── Fetch ALL demo patients (newly inserted + pre-existing) ───────────────
  const allDemoNames = patientDefs.map((p) => p.name);
  const { data: allDbPatients } = await supabaseAdmin
    .from("patients")
    .select("id, name")
    .eq("linked_doctor_id", doctorId)
    .in("name", allDemoNames);

  const allPatients: { id: string; name: string; diagnosis: string; body: string; ai_diag: string; status: string }[] = patientDefs
    .map((p) => {
      const db = allDbPatients?.find((d: { id: string; name: string }) => d.name === p.name);
      if (!db) return null;
      return { id: db.id, name: p.name, diagnosis: p.diagnosis, body: p.body, ai_diag: p.ai_diag, status: p.status };
    })
    .filter(Boolean) as { id: string; name: string; diagnosis: string; body: string; ai_diag: string; status: string }[];

  // ── Visit definitions ─────────────────────────────────────────────────────

  const visitNotes: Record<string, string[]> = {
    "Tinea Corporis":      ["Patient presents with annular erythematous patches on trunk, mild itching for 2 weeks.", "Improving on Clotrimazole, redness reduced. Continue treatment.", "Lesions clearing well. Reduce Clotrimazole to once daily."],
    "Tinea Versicolor":    ["Multiple hypopigmented macules on back. Mild scaling noted.", "Good response to Ketoconazole shampoo. Follow-up in 4 weeks."],
    "Tinea Cruris":        ["Erythematous plaques in groin, satellite lesions present. Moderate pruritus.", "Marginal improvement, continue antifungal. Keep area dry."],
    "Candidiasis":         ["Erythematous moist plaques on hands/fingers. No pustules.", "Improving with Clotrimazole dusting powder."],
    "Tinea Pedis":         ["Maceration and scaling between toes, fissuring noted.", "Resolved. No active lesions. Hygiene counselling given."],
    "Ringworm":            ["Circular scaly patches on arms, central clearing present.", "Moderate response. Switched to Terbinafine cream."],
    "Acne Vulgaris":       ["Multiple comedones and papules on forehead and cheeks.", "Reducing lesion count on Adapalene. Mild dryness noted.", "Significant improvement. Continue maintenance therapy."],
    "Acne Mechanica":      ["Inflammatory papules on scalp and hairline. Exacerbated by helmet use.", "Pustules reducing. Advised to clean helmet padding regularly."],
    "Comedonal Acne":      ["Closed comedones across nose and chin. No inflammatory lesions.", "Good response to Clindamycin gel."],
    "Cystic Acne":         ["Deep painful nodules on cheeks and chin. Significant scarring risk.", "Limited response — referred for isotretinoin evaluation."],
    "Eczema":              ["Lichenified patches on dorsum of hands. Severe pruritus, sleep disturbance.", "Responding to Mometasone. Moisturiser compliance improved."],
    "Contact Dermatitis":  ["Vesicular eruption on neck, likely nickel allergy from jewellery.", "Resolved after allergen avoidance. Patch testing recommended."],
    "Atopic Dermatitis":   ["Flexural eczema on bilateral antecubital fossa. Xerosis ++.", "Flare controlled with topical steroid. Emollient regimen reinforced."],
    "Seborrheic Dermatitis":["Greasy yellow scales on scalp and nasolabial folds.", "Good improvement with Ketoconazole shampoo twice weekly."],
    "Psoriasis (Plaque Type)":["Well-demarcated silvery-scale plaques on elbows and knees. Auspitz sign positive.", "Partial clearance with Clobetasol. Adding Calcipotriol for maintenance."],
    "Psoriasis (Guttate)": ["Multiple drop-like lesions on trunk and limbs post throat infection.", "Lesions stabilising. PUVA therapy discussed."],
    "Urticaria":           ["Transient wheals on trunk and limbs, resolving within 24 hrs.", "No recurrence. Antihistamine course completed."],
    "Vitiligo":            ["Depigmented macules on dorsum of hands and perioral area.", "Stable lesions. Topical tacrolimus started."],
    "Melasma":             ["Symmetric hyperpigmentation on malar region and upper lip.", "Gradual lightening on Kojic acid + sunscreen regimen."],
    "Scabies":             ["Intense nocturnal itching. Burrows in web spaces of fingers. Other family members affected.", "Post-Permethrin treatment, itching persisting — reassured. Retreatment after 1 week."],
  };

  const fees = [700, 500, 500, 600, 300, 400, 0, 500, 400, 800, 300, 500, 600, 400, 700, 500, 600, 400, 500, 300];
  let visitCount = 0;
  const visitIdMap: Map<string, string> = new Map();

  let visitInsertError: string | null = null;

  // Today + yesterday visits (first 4 patients)
  const recentPatients = allPatients.slice(0, 4);
  for (let i = 0; i < recentPatients.length; i++) {
    const p = recentPatients[i];
    const { data: existV } = await supabaseAdmin.from("visits").select("id").eq("patient_id", p.id).eq("doctor_id", doctorId).limit(1);
    if (existV && existV.length > 0) { visitIdMap.set(p.id, existV[0].id); continue; }

    const notes = visitNotes[p.diagnosis] ?? ["Routine follow-up visit."];
    const { data: v, error: vErr } = await supabaseAdmin.from("visits").insert({
      patient_id: p.id,
      doctor_id: doctorId,
      visit_date: dateOnly(i === 0 ? 0 : i === 1 ? 0 : 1),
      chief_complaint: `Follow-up — ${p.diagnosis}`,
      diagnosis: p.diagnosis,
      body_location: p.body,
      doctor_notes: notes[Math.min(1, notes.length - 1)],
      visit_fee: fees[visitCount % fees.length],
      duration_minutes: 15,
    }).select("id").single();
    if (vErr && !visitInsertError) visitInsertError = vErr.message;
    if (v) { visitIdMap.set(p.id, v.id); visitCount++; }
  }

  // Remaining patients: 1–2 older visits each
  for (let i = 4; i < allPatients.length; i++) {
    const p = allPatients[i];
    const { data: existV } = await supabaseAdmin.from("visits").select("id").eq("patient_id", p.id).eq("doctor_id", doctorId).limit(1);
    if (existV && existV.length > 0) { visitIdMap.set(p.id, existV[0].id); continue; }

    const notes = visitNotes[p.diagnosis] ?? ["Routine consultation."];
    const visitDaysAgo = 3 + i * 2;

    // First visit
    const { data: v1, error: v1Err } = await supabaseAdmin.from("visits").insert({
      patient_id: p.id,
      doctor_id: doctorId,
      visit_date: dateOnly(visitDaysAgo),
      chief_complaint: `New consultation — ${p.diagnosis}`,
      diagnosis: p.diagnosis,
      body_location: p.body,
      doctor_notes: notes[0],
      visit_fee: fees[visitCount % fees.length],
      duration_minutes: 30,
    }).select("id").single();
    if (v1Err && !visitInsertError) visitInsertError = v1Err.message;
    if (v1) { visitIdMap.set(p.id, v1.id); visitCount++; }

    // Second visit for some
    if (i % 3 !== 0 && notes.length > 1) {
      const { data: v2 } = await supabaseAdmin.from("visits").insert({
        patient_id: p.id,
        doctor_id: doctorId,
        visit_date: dateOnly(Math.max(1, visitDaysAgo - 10)),
        chief_complaint: `Follow-up — ${p.diagnosis}`,
        diagnosis: p.diagnosis,
        body_location: p.body,
        doctor_notes: notes[1],
        visit_fee: fees[visitCount % fees.length],
        duration_minutes: 15,
      }).select("id").single();
      if (v2) visitCount++;
    }
  }

  // ── Prescriptions ─────────────────────────────────────────────────────────

  const rxDefs = [
    {
      name: "Priya Sharma",
      diagnosis: "Tinea Corporis",
      medicines: [
        { name: "Clotrimazole 1% Cream", dosage: "Thin layer", frequency: "Twice daily", duration: "3 weeks", instructions: "Apply to affected area, extending 2cm beyond margin" },
        { name: "Fluconazole 150mg", dosage: "1 tablet", frequency: "Once weekly", duration: "4 weeks", instructions: "Take with or without food" },
      ],
      special_instructions: "Keep area dry. Avoid tight clothing. Wash hands before and after application.",
      follow_up_days: 21,
      status: "active",
    },
    {
      name: "Meera Gupta",
      diagnosis: "Eczema",
      medicines: [
        { name: "Mometasone Furoate 0.1% Cream", dosage: "Thin layer", frequency: "Once daily", duration: "2 weeks", instructions: "Apply sparingly to affected areas" },
        { name: "Cetirizine 10mg", dosage: "1 tablet", frequency: "Once daily at night", duration: "2 weeks", instructions: "May cause drowsiness" },
        { name: "CeraVe Moisturising Cream", dosage: "Generous amount", frequency: "3–4 times daily", duration: "Ongoing", instructions: "Apply immediately after bathing on damp skin" },
      ],
      special_instructions: "Avoid soap on affected areas. Use lukewarm water. Identify and avoid triggers.",
      follow_up_days: 14,
      status: "active",
    },
    {
      name: "Ananya Mishra",
      diagnosis: "Acne Vulgaris",
      medicines: [
        { name: "Adapalene 0.1% Gel", dosage: "Pea-sized amount", frequency: "Once daily at bedtime", duration: "12 weeks", instructions: "Apply to entire face, avoid eyes and lips. Use sunscreen daily." },
        { name: "Clindamycin 1% Gel", dosage: "Thin layer", frequency: "Twice daily", duration: "8 weeks", instructions: "Apply to affected areas after cleansing" },
      ],
      special_instructions: "Use gentle non-comedogenic cleanser. Avoid picking or squeezing lesions. Sunscreen SPF 30+ mandatory.",
      follow_up_days: 42,
      status: "active",
    },
    {
      name: "Kavita Reddy",
      diagnosis: "Psoriasis (Plaque Type)",
      medicines: [
        { name: "Clobetasol Propionate 0.05% Cream", dosage: "Thin layer", frequency: "Twice daily", duration: "3 weeks", instructions: "Apply only to plaques. Do not use on face." },
        { name: "Calcipotriol Ointment", dosage: "Thin layer", frequency: "Once daily", duration: "8 weeks", instructions: "Apply to plaques. Do not apply within 2 hrs of Clobetasol." },
      ],
      special_instructions: "Moisturise frequently. Avoid triggers: stress, infections. Follow-up mandatory.",
      follow_up_days: 28,
      status: "active",
    },
    {
      name: "Ravi Chauhan",
      diagnosis: "Scabies",
      medicines: [
        { name: "Permethrin 5% Cream", dosage: "Apply to entire body", frequency: "Single application, repeat after 1 week", duration: "2 applications total", instructions: "Apply from neck down. Leave for 8–14 hours then wash off. Treat all household contacts simultaneously." },
        { name: "Hydroxyzine 25mg", dosage: "1 tablet", frequency: "Once daily at night", duration: "1 week", instructions: "For itch relief" },
      ],
      special_instructions: "Wash all clothing and bedding in hot water. Treat all household contacts on same day.",
      follow_up_days: 14,
      status: "active",
    },
    {
      name: "Pooja Verma",
      diagnosis: "Urticaria",
      medicines: [
        { name: "Cetirizine 10mg", dosage: "1 tablet", frequency: "Once daily", duration: "2 weeks", instructions: "" },
        { name: "Calamine Lotion", dosage: "Apply liberally", frequency: "As needed", duration: "As needed", instructions: "For local itch relief" },
      ],
      special_instructions: "Identify and avoid triggers. Keep a food/activity diary.",
      follow_up_days: 14,
      status: "completed",
    },
    {
      name: "Arjun Patel",
      diagnosis: "Cystic Acne",
      medicines: [
        { name: "Doxycycline 100mg", dosage: "1 capsule", frequency: "Once daily with food", duration: "8 weeks", instructions: "Take with a full glass of water. Avoid lying down for 30 mins after." },
        { name: "Tretinoin 0.025% Cream", dosage: "Pea-sized amount", frequency: "Once daily at bedtime", duration: "12 weeks", instructions: "Start every other night for first 2 weeks" },
        { name: "Clindamycin 1% Gel", dosage: "Thin layer", frequency: "Twice daily", duration: "8 weeks", instructions: "" },
      ],
      special_instructions: "Use SPF 50+ sunscreen daily. Tretinoin causes initial purging — expect 4–6 weeks before improvement.",
      follow_up_days: 30,
      status: "active",
    },
    {
      name: "Sanya Kapoor",
      diagnosis: "Atopic Dermatitis",
      medicines: [
        { name: "Hydrocortisone 1% Cream", dosage: "Thin layer", frequency: "Twice daily", duration: "2 weeks", instructions: "Apply sparingly to active areas only" },
        { name: "Cetirizine 5mg (Paediatric)", dosage: "1 tablet", frequency: "Once daily at night", duration: "2 weeks", instructions: "" },
        { name: "Cetaphil Moisturising Lotion", dosage: "Generous amount", frequency: "3–4 times daily", duration: "Ongoing", instructions: "Apply immediately after bathing" },
      ],
      special_instructions: "Use fragrance-free products only. Trim nails to prevent scratching. Cotton clothing recommended.",
      follow_up_days: 14,
      status: "active",
    },
  ];

  let rxCount = 0;
  for (const rx of rxDefs) {
    const patient = allPatients.find((p) => p.name === rx.name);
    if (!patient) continue;

    // Check not already seeded
    const { data: existRx } = await supabaseAdmin
      .from("prescriptions")
      .select("id")
      .eq("patient_id", patient.id)
      .eq("diagnosis", rx.diagnosis)
      .maybeSingle();
    if (existRx) continue;

    const visitId = visitIdMap.get(patient.id) ?? null;
    await supabaseAdmin.from("prescriptions").insert({
      doctor_id: doctorId,
      patient_id: patient.id,
      visit_id: visitId,
      diagnosis: rx.diagnosis,
      medicines: rx.medicines,
      special_instructions: rx.special_instructions,
      follow_up_date: daysFromNow(rx.follow_up_days),
      status: rx.status,
      created_at: daysAgo(2),
    });
    rxCount++;
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  const apptDefs = [
    // Today
    { patientIdx: 0,  time: "10:00", type: "follow_up",       status: "completed", daysOffset: 0,   duration: 15, reason: "Follow-up for Tinea Corporis treatment" },
    { patientIdx: 6,  time: "11:30", type: "new_consultation", status: "scheduled", daysOffset: 0,   duration: 30, reason: "New patient — acne concern" },
    { patientIdx: 10, time: "14:00", type: "treatment_review", status: "scheduled", daysOffset: 0,   duration: 15, reason: "Eczema treatment review" },
    // This week
    { patientIdx: 14, time: "09:30", type: "follow_up",       status: "scheduled", daysOffset: -2,  duration: 30, reason: "Psoriasis management follow-up" },
    { patientIdx: 3,  time: "16:00", type: "follow_up",       status: "scheduled", daysOffset: -3,  duration: 15, reason: "Candidiasis check-up" },
    // Next week
    { patientIdx: 15, time: "10:00", type: "treatment_review", status: "scheduled", daysOffset: -7,  duration: 30, reason: "Psoriasis Guttate — PUVA discussion" },
    { patientIdx: 9,  time: "11:00", type: "follow_up",       status: "scheduled", daysOffset: -10, duration: 15, reason: "Scabies post-treatment check" },
    // Past completed
    { patientIdx: 16, time: "10:00", type: "follow_up",       status: "completed", daysOffset: 7,   duration: 15, reason: "Urticaria — resolved, final check" },
  ];

  let apptCount = 0;
  for (const a of apptDefs) {
    const patient = allPatients[a.patientIdx];
    if (!patient) continue;

    const apptDate = daysFromNow(-a.daysOffset);

    const { data: existAppt } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("patient_id", patient.id)
      .eq("appointment_date", apptDate)
      .eq("appointment_time", a.time)
      .maybeSingle();
    if (existAppt) continue;

    await supabaseAdmin.from("appointments").insert({
      doctor_id: doctorId,
      patient_id: patient.id,
      appointment_date: apptDate,
      appointment_time: a.time,
      duration_minutes: a.duration,
      type: a.type,
      status: a.status,
      reason: a.reason,
      visit_fee: a.type === "new_consultation" ? 700 : a.type === "treatment_review" ? 500 : 350,
      created_at: daysAgo(1),
    });
    apptCount++;
  }

  // ── Patient fees ──────────────────────────────────────────────────────────

  let feeCount = 0;
  for (const [patientId, visitId] of Array.from(visitIdMap.entries())) {
    const { data: existFee } = await supabaseAdmin
      .from("patient_fees")
      .select("id")
      .eq("visit_id", visitId)
      .maybeSingle();
    if (existFee) continue;

    const amount = fees[feeCount % fees.length];
    if (amount > 0) {
      await supabaseAdmin.from("patient_fees").insert({
        patient_id: patientId,
        doctor_id: doctorId,
        visit_id: visitId,
        amount,
        status: "paid",
        fee_type: "consultation",
        created_at: daysAgo(0),
      });
      feeCount++;
    }
  }

  return NextResponse.json({
    success: true,
    doctor: doctor.full_name,
    inserted: {
      patients: insertedPatients.length,
      skipped_patients: skippedPatients,
      visits: visitCount,
      prescriptions: rxCount,
      appointments: apptCount,
      fees: feeCount,
    },
    visit_error: visitInsertError,
    message: `Seeded ${insertedPatients.length} patients, ${visitCount} visits, ${rxCount} prescriptions, ${apptCount} appointments for ${doctor.full_name}`,
  });
}
