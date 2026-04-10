import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/diagnose
 *
 * Downloads patient photos from Supabase URLs, maps ScreeningData to
 * questionnaire answer IDs, then calls SkinAI FastAPI POST /predict/full.
 *
 * Falls back gracefully to { source: "pending" } if FastAPI is unreachable.
 */

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8000";

interface DiagnoseRequest {
  patientId: string;
  doctorId: string;
  photoUrls: string[];
  screeningData: Record<string, string | number | null | string[]>;
}

// ── Map ScreeningData values → questionnaire option IDs ───────────────────────

function mapScreeningToAnswers(sd: Record<string, string | number | null | string[]>): Record<string, string | string[]> {
  const a: Record<string, string | string[]> = {};

  // age_group
  const age = parseInt(String(sd.age ?? ""), 10);
  if (!isNaN(age)) {
    if (age < 18) a.age_group = "under18";
    else if (age <= 30) a.age_group = "18to30";
    else if (age <= 50) a.age_group = "31to50";
    else if (age <= 70) a.age_group = "51to70";
    else a.age_group = "over70";
  }

  // gender — IDs already match
  if (sd.gender) a.gender = String(sd.gender);

  // duration — frontend uses 6-value enum, questionnaire uses 5-value enum
  const DURATION_MAP: Record<string, string> = {
    less_1w: "days",
    "1_4w": "weeks",
    "1_3m": "months",
    "3_6m": "months",
    "6m_plus": "long",
    always: "long",
  };
  const dur = String(sd.duration ?? "");
  if (DURATION_MAP[dur]) a.duration = DURATION_MAP[dur];

  // presence — "blister" in frontend means appearance=blister_sore in questionnaire.
  // The blister sub-questions are conditional_on appearance=blister_sore, not presence.
  const presence = String(sd.presence ?? "");
  const blisterFromPresence = presence === "blister";
  if (!blisterFromPresence && presence) {
    a.presence = presence;
  }

  // itching level → main_symptom (option IDs match: none / mild / very / unbearable)
  if (sd.itching) a.main_symptom = String(sd.itching);

  // pain — IDs match
  if (sd.pain) a.pain = String(sd.pain);

  // body location
  const LOC_MAP: Record<string, string> = {
    Face: "face",
    Scalp: "scalp",
    Neck: "neck_chest",
    "Chest/Back": "back_shoulders",   // Chest ambiguous, back wins
    Arms: "arms_hands",
    "Hands/Fingers": "arms_hands",
    Legs: "legs_feet",
    "Feet/Toes": "legs_feet",
    "Groin/Armpits": "groin_folds",
    // "Multiple areas" intentionally omitted — no backend equivalent.
    // Sending nothing is better than a wrong mapping to "torso" (stomach).
  };
  const loc = String(sd.bodyLocation ?? "");
  if (LOC_MAP[loc]) a.location = LOC_MAP[loc];

  // Fitzpatrick skin type (stored as number 1–6)
  const fitz = Number(sd.fitzpatrick);
  if (fitz >= 1 && fitz <= 6) a.fitzpatrick = `type${fitz}`;

  // sweating — IDs match
  if (sd.sweating) a.sweating = String(sd.sweating);

  // familyHistory — IDs match
  if (sd.familyHistory) a.familyHistory = String(sd.familyHistory);

  // Blister sub-questions: frontend stores human-readable label strings, questionnaire uses IDs
  const BSIZE_MAP: Record<string, string> = {
    "Pinhead-sized (1-2mm)": "pinhead",
    "Pea-sized (3-8mm)": "pea",
    "Coin-sized or larger (>1cm)": "coin",
  };
  const BFRAG_MAP: Record<string, string> = {
    "Pop easily with light touch": "fragile",
    "Stay intact, hard to break": "intact",
    "Already broken when I noticed": "already_broken",
  };
  const BDUR_MAP: Record<string, string> = {
    "Less than 48 hours": "48h",
    "A few days to a week": "days_week",
    "1-4 weeks": "weeks",
    "More than a month": "month_plus",
  };
  const BMM_MAP: Record<string, string> = {
    Yes: "yes",
    No: "no",
    "Not sure": "not_sure",
  };

  const bs = String(sd.blister_size ?? "");
  const bf = String(sd.blister_fragility ?? "");
  const bd = String(sd.blister_duration ?? "");
  const bm = String(sd.blister_mucous_membrane ?? "");
  if (BSIZE_MAP[bs]) a.blister_size = BSIZE_MAP[bs];
  if (BFRAG_MAP[bf]) a.blister_fragility = BFRAG_MAP[bf];
  if (BDUR_MAP[bd]) a.blister_duration = BDUR_MAP[bd];
  if (BMM_MAP[bm]) a.blister_mucous_membrane = BMM_MAP[bm];

  // new_medication
  const MED_MAP: Record<string, string> = {
    No: "no",
    "Yes — antibiotics": "antibiotics",
    "Yes — painkillers/NSAIDs": "nsaids",
    "Yes — blood pressure or heart medication": "bp_heart",
    "Yes — other medication": "other",
  };
  const med = String(sd.new_medication ?? "");
  if (MED_MAP[med]) a.new_medication = MED_MAP[med];

  // recurrence
  const RECUR_MAP: Record<string, string> = {
    "First time ever": "first_time",
    "Comes and goes (recurring)": "recurring",
    "Has been getting steadily worse": "worsening",
    "Had it before, came back after treatment": "returned_after_treatment",
  };
  const rec = String(sd.recurrence ?? "");
  if (RECUR_MAP[rec]) a.recurrence = RECUR_MAP[rec];

  // fever
  const FEVER_MAP: Record<string, string> = {
    "No, just the skin issue": "no",
    "Mild fever or feeling off": "mild",
    "High fever / very unwell": "high",
  };
  const fev = String(sd.fever ?? "");
  if (FEVER_MAP[fev]) a.fever = FEVER_MAP[fev];

  // itching_timing
  const ITCH_MAP: Record<string, string> = {
    "About the same all day": "same_all_day",
    "Worse at night": "worse_at_night",
    "Worse after bathing or sweating": "after_bathing",
    "Only when I touch/scratch it": "only_touched",
  };
  const it = String(sd.itching_timing ?? "");
  if (ITCH_MAP[it]) a.itching_timing = ITCH_MAP[it];

  // household_affected
  const HH_MAP: Record<string, string> = {
    "No, only me": "only_me",
    "Yes, one other person": "one_other",
    "Yes, multiple people": "multiple",
    "Not sure": "not_sure",
  };
  const hh = String(sd.household_affected ?? "");
  if (HH_MAP[hh]) a.household_affected = HH_MAP[hh];

  // lesion_migration
  const MIG_MAP: Record<string, string> = {
    "Stay in the same spot": "same_spot",
    "Move around / appear in new places and old ones fade": "move_around",
    "Slowly spreading outward from one spot": "spreading_outward",
    "Not sure": "not_sure",
  };
  const mig = String(sd.lesion_migration ?? "");
  if (MIG_MAP[mig]) a.lesion_migration = MIG_MAP[mig];

  // appearance — multi-select. Already in backend ID format (rash_red, dark_spot, etc.)
  // Merge with blister_sore if user picked "blister" presence option.
  const appearanceArr: string[] = Array.isArray(sd.appearance) ? sd.appearance.filter(Boolean) : [];
  if (blisterFromPresence && !appearanceArr.includes("blister_sore")) {
    appearanceArr.push("blister_sore");
  }
  if (appearanceArr.length > 0) {
    a.appearance = appearanceArr;
  }

  return a;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: DiagnoseRequest = await req.json();
    const { patientId, doctorId, photoUrls, screeningData } = body;

    if (!patientId || !doctorId || !photoUrls?.length) {
      return NextResponse.json(
        { error: "Missing patientId, doctorId, or photoUrls" },
        { status: 400 }
      );
    }

    try {
      // 1. Download photos from Supabase storage URLs
      const photoBuffers = await Promise.all(
        photoUrls.map(async (url, i) => {
          const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
          if (!res.ok) throw new Error(`Photo ${i + 1}: download failed (${res.status})`);
          const arrayBuffer = await res.arrayBuffer();
          const contentType = res.headers.get("content-type") || "image/jpeg";
          const ext = contentType.includes("png") ? "png" : "jpg";
          return { buffer: Buffer.from(arrayBuffer), contentType, filename: `photo_${i + 1}.${ext}` };
        })
      );

      // 2. Build multipart FormData for FastAPI
      const form = new FormData();
      for (const { buffer, contentType, filename } of photoBuffers) {
        form.append("photos", new Blob([buffer], { type: contentType }), filename);
      }
      form.append("answers", JSON.stringify(mapScreeningToAnswers(screeningData)));
      form.append("use_tta", "true");

      // 3. Call SkinAI FastAPI
      const aiRes = await fetch(`${AI_API_URL}/predict/full`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(90000), // TTA on multiple photos can be slow
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text().catch(() => "");
        console.error("[diagnose] FastAPI error:", aiRes.status, errText);
        throw new Error(`FastAPI returned ${aiRes.status}`);
      }

      const aiData = await aiRes.json();

      // 4. Parse response — results[0] is the top prediction
      const top = aiData.results?.[0];
      if (!top) throw new Error("FastAPI returned empty results");

      // confidence from FastAPI is already a percentage (e.g. 45.2), normalise to 0-1
      const toFraction = (pct: number) => parseFloat((pct / 100).toFixed(4));

      const top3 = (aiData.results as Array<{ class_name: string; confidence: number }>)
        .slice(0, 3)
        .map((r) => ({ class: r.class_name, confidence: toFraction(r.confidence) }));

      const urgentWarnings: string[] = aiData.meta?.urgent_warnings ?? [];

      return NextResponse.json({
        success: true,
        source: "ai",
        diagnosis: top.class_name,
        diagnosis_display: top.display_name,
        confidence: toFraction(top.confidence),
        severity: top.severity ?? 0,
        severity_label: top.severity_label ?? "Unknown",
        top_3: top3,
        category: null,
        api_warnings: urgentWarnings,
      });
    } catch (aiErr) {
      const errMsg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      console.error("[diagnose] AI unavailable:", errMsg);

      // Return error details so we can debug
      return NextResponse.json({
        success: true,
        source: "pending",
        diagnosis: "pending",
        diagnosis_display: "AI Unavailable — Pending Doctor Review",
        confidence: 0,
        severity: 0,
        severity_label: "Pending",
        top_3: [],
        category: null,
        api_warnings: [],
        debug_error: errMsg,
        debug_api_url: AI_API_URL,
      });
    }
  } catch (err) {
    console.error("[diagnose] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
