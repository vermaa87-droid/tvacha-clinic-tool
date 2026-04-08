import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const DERM_TEMPLATES = [
  {
    name: "Mild Comedonal Acne",
    condition: "acne",
    condition_display: "Acne",
    category: "dermatology",
    medicines: [
      { name: "Adapalene 0.1% Gel (Deriva)", dosage: "Apply thin layer at night", frequency: "Once daily", duration: "8-12 weeks", instructions: "On affected area, avoid eyes/lips" },
      { name: "Salicylic Acid 2% Face Wash (Saslic DS)", dosage: "Gentle massage", frequency: "Twice daily", duration: "Continuous", instructions: "Rinse after 1 min" },
    ],
    special_instructions: "Use sunscreen SPF 30+ daily. Mild irritation is normal in first 2 weeks. Avoid squeezing pimples. Results visible after 6-8 weeks.",
    follow_up_days: 42,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Moderate Inflammatory Acne (Papulopustular)",
    condition: "acne",
    condition_display: "Acne",
    category: "dermatology",
    medicines: [
      { name: "Adapalene 0.1% + Benzoyl Peroxide 2.5% Gel (Epiduo)", dosage: "Pea-sized amount at night", frequency: "Once daily", duration: "12 weeks", instructions: "On affected area" },
      { name: "Tab. Doxycycline 100mg (Doxt-SL)", dosage: "1-0-0", frequency: "Once daily", duration: "6-8 weeks", instructions: "After food. Avoid dairy 2hrs before/after" },
      { name: "Clindamycin 1% + Nicotinamide 4% Gel (Clindac-A)", dosage: "Apply morning", frequency: "Once daily", duration: "8-12 weeks", instructions: "On active pimples only" },
    ],
    special_instructions: "Use oil-free sunscreen SPF 30+. Do not pop pimples. Doxycycline may cause sun sensitivity. Take tablet with full glass of water, do not lie down for 30 min after.",
    follow_up_days: 28,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Severe Nodulocystic Acne",
    condition: "acne",
    condition_display: "Acne",
    category: "dermatology",
    medicines: [
      { name: "Cap. Isotretinoin 20mg (Tretiva 20)", dosage: "1-0-1 (0.5mg/kg/day)", frequency: "Twice daily", duration: "16-24 weeks", instructions: "After food (with fat). MANDATORY pregnancy test before starting in females" },
      { name: "Tab. Cetirizine 10mg (Okacet)", dosage: "0-0-1", frequency: "Once daily", duration: "As needed", instructions: "For dryness/itching" },
      { name: "Ceramide Moisturizer (Cetaphil DAM)", dosage: "Apply liberally", frequency: "Twice daily", duration: "Continuous", instructions: "Lips and face — combat isotretinoin dryness" },
    ],
    special_instructions: "STRICT: No pregnancy during treatment and 1 month after. Monthly blood tests (lipids + liver function) mandatory. Expect severe dryness of lips/skin. Do NOT donate blood during treatment. Avoid waxing. No vitamin A supplements.",
    follow_up_days: 28,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Tinea Corporis / Cruris (Ringworm)",
    condition: "fungal_infection",
    condition_display: "Fungal Infection",
    category: "dermatology",
    medicines: [
      { name: "Tab. Terbinafine 250mg (Zimig 250)", dosage: "1-0-0", frequency: "Once daily", duration: "2-4 weeks", instructions: "After food. Complete full course" },
      { name: "Tab. Cetirizine 10mg (Okacet)", dosage: "0-0-1", frequency: "Once daily", duration: "10-14 days", instructions: "For itching" },
      { name: "Cr. Luliconazole 1% (Lulican)", dosage: "Apply thin layer", frequency: "Twice daily", duration: "3-4 weeks", instructions: "Apply 1cm beyond lesion border" },
      { name: "Ketoconazole 2% Soap (Nizral)", dosage: "For bathing", frequency: "Once daily", duration: "3-4 weeks", instructions: "Leave lather on skin for 5 min" },
    ],
    special_instructions: "Keep affected area clean and dry. Wear loose cotton clothing. Do not share towels, clothing or bedsheets. Wash all clothes in hot water. Complete full course even if symptoms improve. Treat all affected family members simultaneously.",
    follow_up_days: 14,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Tinea Versicolor (Pityriasis Versicolor)",
    condition: "fungal_infection",
    condition_display: "Fungal Infection",
    category: "dermatology",
    medicines: [
      { name: "Tab. Fluconazole 150mg (Zocon 150)", dosage: "Once weekly", frequency: "Once weekly", duration: "4 weeks", instructions: "After food. Take same day each week" },
      { name: "Ketoconazole 2% Lotion (Nizral Lotion)", dosage: "Apply on patches at night", frequency: "Once daily", duration: "4-6 weeks", instructions: "Leave overnight, wash off morning" },
      { name: "Ketoconazole 2% Soap (Nizral)", dosage: "For bathing", frequency: "Daily", duration: "4-6 weeks", instructions: "Lather on body, wait 5 min" },
    ],
    special_instructions: "Skin colour may take 3-6 months to normalize after treatment. Recurrence common in humid weather. Use antifungal soap monthly as prevention. Wear cotton clothes. NOT contagious.",
    follow_up_days: 28,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Cutaneous Candidiasis",
    condition: "fungal_infection",
    condition_display: "Fungal Infection",
    category: "dermatology",
    medicines: [
      { name: "Tab. Fluconazole 150mg (Zocon 150)", dosage: "1-0-0", frequency: "Once daily", duration: "7-14 days", instructions: "After food" },
      { name: "Cr. Clotrimazole 1% (Candid Cream)", dosage: "Apply thin layer", frequency: "Twice daily", duration: "2-3 weeks", instructions: "On affected skin folds" },
      { name: "Clotrimazole Dusting Powder (Candid Powder)", dosage: "Dust on skin folds", frequency: "After bath", duration: "3-4 weeks", instructions: "Keep folds dry" },
    ],
    special_instructions: "Keep skin folds completely dry. Use cotton undergarments. Control blood sugar if diabetic — get HbA1c checked. Lose weight if overweight. Avoid tight-fitting clothes.",
    follow_up_days: 14,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Mild Atopic Dermatitis",
    condition: "eczema",
    condition_display: "Eczema (Atopic Dermatitis)",
    category: "dermatology",
    medicines: [
      { name: "Cr. Mometasone Furoate 0.1% (Elocon)", dosage: "Thin layer on patches", frequency: "Once daily", duration: "7-14 days only", instructions: "NOT on face" },
      { name: "Ceramide Moisturizer (Cetaphil DAM)", dosage: "Apply generously", frequency: "3-4 times daily", duration: "Continuous", instructions: "Immediately after bath on damp skin" },
      { name: "Tab. Cetirizine 10mg (Okacet)", dosage: "0-0-1", frequency: "Once daily", duration: "14-21 days", instructions: "For itching, especially at night" },
    ],
    special_instructions: "Moisturize aggressively — at least 3-4 times daily. Use lukewarm water, not hot. Bath under 10 min. Use soap-free cleanser. Avoid wool clothing. Identify and avoid triggers. Cut nails short.",
    follow_up_days: 14,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Moderate-Severe Atopic Dermatitis",
    condition: "eczema",
    condition_display: "Eczema (Atopic Dermatitis)",
    category: "dermatology",
    medicines: [
      { name: "Oint. Tacrolimus 0.1% (Tacroz Forte)", dosage: "Apply on patches", frequency: "Twice daily", duration: "4-6 weeks", instructions: "Can use on face/folds unlike steroids" },
      { name: "Tab. Hydroxyzine 25mg (Atarax 25)", dosage: "0-0-1 or 1-0-1", frequency: "Once or twice daily", duration: "2-4 weeks", instructions: "Causes drowsiness — take at night" },
      { name: "Ceramide Moisturizer (Physiogel AI)", dosage: "Apply liberally", frequency: "4-5 times daily", duration: "Continuous", instructions: "Whole body" },
      { name: "Tab. Methylprednisolone 8mg (Medrol 8)", dosage: "1-0-0 x 5 days, taper", frequency: "Once daily", duration: "5-7 days taper", instructions: "After food. Only for acute flares" },
    ],
    special_instructions: "Moisturize minimum 5 times daily. Wet wrap therapy at night if severe. Avoid all known triggers. Consider allergy testing. Steroid tablets are SHORT COURSE only.",
    follow_up_days: 7,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Acute Allergic Contact Dermatitis",
    condition: "contact_dermatitis",
    condition_display: "Contact Dermatitis",
    category: "dermatology",
    medicines: [
      { name: "Tab. Prednisolone 20mg (Omnacortil 20)", dosage: "1-0-0 (taper over 7-10 days)", frequency: "Once daily", duration: "7-10 days taper", instructions: "After food. 20mg x 3d, 10mg x 3d, 5mg x 3d" },
      { name: "Cr. Mometasone Furoate 0.1% (Elocon)", dosage: "Apply on affected area", frequency: "Twice daily", duration: "10-14 days", instructions: "Thin layer only" },
      { name: "Tab. Cetirizine 10mg (Okacet)", dosage: "1-0-1", frequency: "Twice daily", duration: "10-14 days", instructions: "For itching" },
      { name: "Calamine Lotion (Lacto Calamine)", dosage: "Apply as needed", frequency: "As needed", duration: "As needed", instructions: "For soothing relief" },
    ],
    special_instructions: "IDENTIFY and AVOID the allergen (nickel jewelry, hair dye, rubber, fragrances, cement). Wash area with plain water. Do not scratch. Consider patch testing.",
    follow_up_days: 7,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Acute Urticaria (Hives)",
    condition: "urticaria",
    condition_display: "Urticaria (Hives)",
    category: "dermatology",
    medicines: [
      { name: "Tab. Levocetirizine 5mg (Xyzal)", dosage: "1-0-1", frequency: "Twice daily", duration: "7-14 days", instructions: "After food" },
      { name: "Tab. Ranitidine 150mg (Rantac 150)", dosage: "1-0-1", frequency: "Twice daily", duration: "7-14 days", instructions: "Before food. H2 blocker adds to antihistamine effect" },
      { name: "Calamine Lotion (Lacto Calamine)", dosage: "Apply as needed", frequency: "As needed", duration: "As needed", instructions: "Soothing relief for wheals" },
    ],
    special_instructions: "Identify triggers (foods, medications, insect bites, temperature). Common food triggers: nuts, shellfish, eggs, milk. If breathing difficulty or lip/tongue swelling — GO TO EMERGENCY IMMEDIATELY.",
    follow_up_days: 7,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Chronic Urticaria (>6 weeks)",
    condition: "urticaria",
    condition_display: "Urticaria (Hives)",
    category: "dermatology",
    medicines: [
      { name: "Tab. Fexofenadine 180mg (Allegra 180)", dosage: "1-0-0", frequency: "Once daily", duration: "4-8 weeks", instructions: "Before food. Non-sedating" },
      { name: "Tab. Montelukast 10mg (Montair 10)", dosage: "0-0-1", frequency: "At bedtime", duration: "4-8 weeks", instructions: "Leukotriene receptor antagonist" },
      { name: "Tab. Hydroxyzine 25mg (Atarax 25)", dosage: "0-0-1", frequency: "At bedtime", duration: "2-4 weeks", instructions: "For night-time relief, causes drowsiness" },
    ],
    special_instructions: "Chronic urticaria may last months to years but is NOT dangerous. Blood tests: CBC, ESR, thyroid profile, IgE levels. Maintain food diary. Avoid aspirin and NSAIDs. Stress management important.",
    follow_up_days: 28,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Mild Plaque Psoriasis",
    condition: "psoriasis",
    condition_display: "Psoriasis",
    category: "dermatology",
    medicines: [
      { name: "Oint. Calcipotriol + Betamethasone (Daivobet)", dosage: "Apply on plaques", frequency: "Once daily", duration: "4-8 weeks", instructions: "Max 100g/week" },
      { name: "Coal Tar 5% Ointment (Psorolin)", dosage: "Apply at night", frequency: "Once daily", duration: "Continuous", instructions: "Wash off in morning, may stain clothes" },
      { name: "Emollient (Venusia Max)", dosage: "Apply generously", frequency: "3-4 times daily", duration: "Continuous", instructions: "Entire body, esp after bath" },
    ],
    special_instructions: "Psoriasis is chronic — can be controlled but not cured. Moisturize heavily. Avoid skin injury (Koebner phenomenon). Moderate sunlight helps. Avoid alcohol and smoking. Manage stress. Do not peel plaques.",
    follow_up_days: 28,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Moderate-Severe Plaque Psoriasis",
    condition: "psoriasis",
    condition_display: "Psoriasis",
    category: "dermatology",
    medicines: [
      { name: "Tab. Methotrexate 7.5mg (Folitrax 7.5)", dosage: "Once WEEKLY (same day each week)", frequency: "Once weekly", duration: "3-6 months", instructions: "WEEKLY — NOT daily. Take folic acid on other days" },
      { name: "Tab. Folic Acid 5mg (Folvite)", dosage: "Daily EXCEPT methotrexate day", frequency: "6 days/week", duration: "While on methotrexate", instructions: "Skip MTX day" },
      { name: "Oint. Calcipotriol + Betamethasone (Daivobet)", dosage: "Apply on plaques", frequency: "Once daily", duration: "8-12 weeks", instructions: "Adjunct to systemic therapy" },
      { name: "Emollient (Venusia Max)", dosage: "Apply generously", frequency: "3-4 times daily", duration: "Continuous", instructions: "" },
    ],
    special_instructions: "MANDATORY: Baseline blood tests — CBC, LFT, KFT, Hepatitis B&C. Monthly monitoring. STRICTLY avoid alcohol. Methotrexate is WEEKLY not daily. Avoid pregnancy (both partners) during and 3 months after. Report mouth ulcers, fever, or unusual bleeding immediately.",
    follow_up_days: 14,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Scalp Psoriasis",
    condition: "psoriasis",
    condition_display: "Psoriasis",
    category: "dermatology",
    medicines: [
      { name: "Clobetasol 0.05% Scalp Lotion (Tenovate)", dosage: "Apply at night on scalp", frequency: "Once daily", duration: "2-4 weeks", instructions: "Part hair, apply on plaques" },
      { name: "Ketoconazole + Coal Tar Shampoo (Tarshine)", dosage: "Apply on scalp", frequency: "3 times/week", duration: "4-8 weeks", instructions: "Leave on 5-10 min before rinsing" },
      { name: "Salicylic Acid 3% Scalp Oil", dosage: "Apply night before wash", frequency: "Before wash days", duration: "4-8 weeks", instructions: "Helps descale thick plaques" },
    ],
    special_instructions: "Do NOT pick or scratch scalp scales. Apply oil night before to soften, then use medicated shampoo. Scalp psoriasis does not cause permanent hair loss.",
    follow_up_days: 28,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Melasma",
    condition: "pigmentary_disorder",
    condition_display: "Pigmentation Disorder",
    category: "dermatology",
    medicines: [
      { name: "Cr. Hydroquinone 2% + Tretinoin 0.025% + Mometasone 0.1% (Melalite Forte)", dosage: "Apply at night on patches", frequency: "Once daily", duration: "8-12 weeks", instructions: "Thin layer on dark patches only, avoid eyes" },
      { name: "Sunscreen SPF 50+ PA++++ (UV Doux)", dosage: "Apply generously", frequency: "Every 2-3 hours", duration: "Continuous/Lifelong", instructions: "MOST important part of treatment" },
      { name: "Tab. Tranexamic Acid 250mg (Pause 250)", dosage: "1-0-1", frequency: "Twice daily", duration: "8-12 weeks", instructions: "After food. Contraindicated if history of blood clots" },
    ],
    special_instructions: "Sunscreen is the MOST important treatment. Reapply every 2-3 hours even indoors. Use hat, scarf, sunglasses. Avoid heat exposure. Melasma is chronic and recurs. Results take 8-12 weeks. Avoid waxing on face.",
    follow_up_days: 42,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Vitiligo",
    condition: "pigmentary_disorder",
    condition_display: "Pigmentation Disorder",
    category: "dermatology",
    medicines: [
      { name: "Oint. Tacrolimus 0.1% (Tacroz Forte)", dosage: "Apply on white patches", frequency: "Twice daily", duration: "3-6 months", instructions: "First-line for face/neck" },
      { name: "Cr. Mometasone Furoate 0.1% (Elocon)", dosage: "Apply on body patches", frequency: "Once daily", duration: "2-3 months", instructions: "Alternate weeks on/off" },
      { name: "Sunscreen SPF 50+ (La Shield Fisico)", dosage: "Apply on white patches", frequency: "When outdoors", duration: "Continuous", instructions: "White patches burn easily" },
    ],
    special_instructions: "Vitiligo is NOT contagious and NOT caused by diet. Treatment takes 3-6 months minimum. Moderate sun after tacrolimus helps. Protect white patches from sunburn. Consider phototherapy if >20% body involvement.",
    follow_up_days: 42,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Scabies (Uncomplicated)",
    condition: "scabies",
    condition_display: "Scabies",
    category: "dermatology",
    medicines: [
      { name: "Permethrin 5% Lotion (Permite)", dosage: "Apply whole body neck down", frequency: "Night of Day 1 and Day 8", duration: "2 applications", instructions: "Leave on 8-12 hours, wash off morning" },
      { name: "Tab. Ivermectin 12mg (Ivecop 12)", dosage: "200mcg/kg single dose", frequency: "Day 1 and Day 8", duration: "2 doses", instructions: "Before food, empty stomach" },
      { name: "Tab. Cetirizine 10mg (Okacet)", dosage: "0-0-1", frequency: "Once daily", duration: "2-3 weeks", instructions: "Itching continues 2-4 weeks after treatment — this is normal" },
      { name: "Calamine + Liquid Paraffin (Lacto Calamine)", dosage: "Apply as needed", frequency: "As needed", duration: "As needed", instructions: "For itch relief" },
    ],
    special_instructions: "TREAT ALL FAMILY MEMBERS SIMULTANEOUSLY — even if asymptomatic. Wash ALL clothes, bedsheets, towels in HOT water on Day 1 and Day 8. Seal unwashable items in plastic bag for 72 hours. Itching may persist 2-4 weeks — this is normal. Do NOT retreat unless new burrows after 4 weeks.",
    follow_up_days: 14,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Impetigo",
    condition: "bacterial_infection",
    condition_display: "Bacterial Infection",
    category: "dermatology",
    medicines: [
      { name: "Tab. Cephalexin 500mg (Sporidex 500)", dosage: "1-0-1", frequency: "Twice daily", duration: "7 days", instructions: "Before food. Complete full course" },
      { name: "Oint. Mupirocin 2% (T-Bact)", dosage: "Apply on lesions", frequency: "Thrice daily", duration: "7-10 days", instructions: "After cleaning crusts with saline" },
      { name: "Chlorhexidine Wash (Hexidine)", dosage: "For bathing", frequency: "Once daily", duration: "10-14 days", instructions: "Reduces bacterial load on skin" },
    ],
    special_instructions: "HIGHLY CONTAGIOUS. Wash hands frequently. Do not share towels or bedding. Keep nails short. Child should stay home from school until 24 hours after starting antibiotics. Wash all linens in hot water.",
    follow_up_days: 7,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Herpes Zoster (Shingles)",
    condition: "viral_infection",
    condition_display: "Viral Infection",
    category: "dermatology",
    medicines: [
      { name: "Tab. Valacyclovir 1000mg (Valcivir 1000)", dosage: "1-1-1", frequency: "Thrice daily", duration: "7 days", instructions: "After food. START WITHIN 72 HOURS of rash" },
      { name: "Tab. Pregabalin 75mg (Pregastar 75)", dosage: "0-0-1", frequency: "Once daily at night", duration: "2-4 weeks", instructions: "For nerve pain, may cause dizziness" },
      { name: "Tab. Paracetamol 650mg (Dolo 650)", dosage: "1-1-1", frequency: "Thrice daily", duration: "1-2 weeks", instructions: "For pain and fever" },
      { name: "Cr. Acyclovir 5% + Calamine", dosage: "Apply on blisters", frequency: "4 times daily", duration: "7-10 days", instructions: "Do not burst blisters" },
    ],
    special_instructions: "Shingles is reactivation of chickenpox virus. Start antivirals within 72 hours. Pain may persist weeks-months after rash (post-herpetic neuralgia). Blisters contagious to people who haven't had chickenpox. Avoid contact with pregnant women and immunocompromised.",
    follow_up_days: 7,
    is_system: true,
    usage_count: 0,
  },
  {
    name: "Benign Melanocytic Nevus (Monitoring)",
    condition: "melanocytic_nevus",
    condition_display: "Mole (Melanocytic Nevus)",
    category: "dermatology",
    medicines: [
      { name: "Sunscreen SPF 50+ (La Shield Fisico)", dosage: "Apply generously", frequency: "Every 3-4 hours outdoors", duration: "Continuous/Lifelong", instructions: "Reapply after sweating/swimming" },
    ],
    special_instructions: "This mole appears BENIGN. No treatment needed. Monitor using ABCDE rule — seek review if: Asymmetry, Border irregularity, Colour variation, Diameter >6mm, or Evolving. Take photos every 3 months. Annual skin check recommended.",
    follow_up_days: 180,
    is_system: true,
    usage_count: 0,
  },
];

export async function GET() {
  try {
    // Delete all existing system templates
    await supabaseAdmin
      .from("prescription_templates")
      .delete()
      .eq("is_system", true);

    // Insert new dermatology templates
    const toInsert = DERM_TEMPLATES.map((t) => ({ ...t, doctor_id: null }));

    const { data, error } = await supabaseAdmin
      .from("prescription_templates")
      .insert(toInsert)
      .select("id, name");

    if (error) {
      console.error("[seed-derm-templates] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Replaced system templates with ${data?.length || 0} dermatology templates`,
      templates: data?.map((t) => t.name),
    });
  } catch (err) {
    console.error("[seed-derm-templates] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
