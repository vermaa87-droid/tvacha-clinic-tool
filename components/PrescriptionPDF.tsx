import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

// ---------------------------------------------------------------------------
// Register Hindi font for bilingual prescriptions
// ---------------------------------------------------------------------------
Font.register({
  family: "NotoSansDevanagari",
  fonts: [
    { src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-devanagari@5.2.8/files/noto-sans-devanagari-devanagari-400-normal.woff", fontWeight: 400 },
    { src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-devanagari@5.2.8/files/noto-sans-devanagari-devanagari-600-normal.woff", fontWeight: 600 },
  ],
});

// Disable hyphenation to prevent word-breaking
Font.registerHyphenationCallback((word) => [word]);

// ---------------------------------------------------------------------------
// Color constants
// ---------------------------------------------------------------------------
const GOLD = "#b8936a";
const BG = "#faf8f4";
const DARK = "#1a1612";
const MUTED = "#9a8a76";
const SECTION_BG = "#f5f0e8";
const TEAL = "#2d4a3e";
const BORDER = "#e0d5c5";

// ---------------------------------------------------------------------------
// Data interface
// ---------------------------------------------------------------------------
export interface PrescriptionPDFData {
  doctor: {
    name: string;
    qualifications: string;
    regNumber: string;
    clinicName: string;
    clinicAddress: string;
    clinicCity?: string;
    clinicState?: string;
    phone: string;
    signatureUrl?: string;
    logoUrl?: string;
  };
  patient: {
    name: string;
    age: number | null;
    gender: string | null;
    patientId: string;
  };
  diagnosis: string;
  severity?: string;
  medicines: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  specialInstructions?: string;
  specialInstructionsHi?: string;
  followUpDate?: string;
  consultationDate: string;
  referenceNumber: string;
  fees?: number;
}

// ---------------------------------------------------------------------------
// Hindi timing lookup
// ---------------------------------------------------------------------------
const TIMING_HINDI: Record<string, string> = {
  "After food": "खाने के बाद",
  "Before food": "खाने से पहले",
  "For external use": "केवल बाहरी उपयोग के लिए",
  "For bathing": "नहाने के लिए",
  "At bedtime": "सोने से पहले",
  "As needed": "ज़रूरत अनुसार",
  "EMERGENCY": "आपातकालीन",
  "For external use only": "केवल बाहरी इस्तेमाल के लिए",
  "After food (morning)": "खाने के बाद (सुबह)",
  "After food (with fat)": "खाने के बाद (तेल/घी वाले खाने के साथ)",
  "On empty stomach": "खाली पेट",
  "Once daily": "दिन में एक बार",
  "Twice daily": "दिन में दो बार",
  "Thrice daily": "दिन में तीन बार",
};

function getHindiTiming(eng: string): string {
  if (!eng) return "";
  // Try exact match first
  if (TIMING_HINDI[eng]) return TIMING_HINDI[eng];
  // Try partial match
  for (const [key, val] of Object.entries(TIMING_HINDI)) {
    if (eng.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cleanText(text: string | undefined | null): string {
  if (!text) return "";
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "")
    .trim();
}

// Medical abbreviations used on Indian prescriptions
const FREQ_ABBREV: Record<string, string> = {
  "once daily": "OD",
  "twice daily": "BD",
  "three times daily": "TDS",
  "thrice daily": "TDS",
  "four times daily": "QID",
  "at bedtime": "HS",
  "as needed": "SOS",
  "before food": "AC",
  "after food": "PC",
};

function abbreviateFreq(freq: string): string {
  if (!freq) return "";
  const lower = freq.toLowerCase();
  for (const [key, abbr] of Object.entries(FREQ_ABBREV)) {
    if (lower === key || lower.startsWith(key)) return abbr;
  }
  return freq;
}

function formatGender(gender: string | null): string {
  if (!gender) return "-";
  const g = gender.trim().toLowerCase();
  if (g === "male" || g === "m") return "M";
  if (g === "female" || g === "f") return "F";
  if (g === "other" || g === "o") return "O";
  return gender;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  /* ---- Page ---- */
  page: {
    width: "148mm",
    height: "210mm",
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    color: DARK,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    flexGrow: 1,
  },

  /* ---- Accent bars ---- */
  accentBarTop: {
    height: 3,
    backgroundColor: GOLD,
    width: "100%",
  },
  accentBarBottom: {
    height: 3,
    backgroundColor: GOLD,
    width: "100%",
  },

  /* ---- Header ---- */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  headerLeft: {
    flexShrink: 1,
    maxWidth: "55%",
  },
  headerRight: {
    alignItems: "flex-end",
    maxWidth: "45%",
  },
  doctorName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: TEAL,
    marginBottom: 2,
  },
  qualifications: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 1,
  },
  regNumber: {
    fontSize: 8,
    color: MUTED,
  },
  clinicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  clinicLogo: {
    width: 50,
    height: 50,
    marginRight: 6,
    objectFit: "contain",
  },
  clinicName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  clinicDetail: {
    fontSize: 8,
    color: MUTED,
    textAlign: "right",
    marginBottom: 1,
  },

  /* ---- Divider ---- */
  divider: {
    height: 0.75,
    backgroundColor: BORDER,
    width: "100%",
    marginVertical: 8,
  },

  /* ---- Patient info ---- */
  patientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  patientCol: {
    flexDirection: "column",
  },
  patientLine: {
    flexDirection: "row",
    marginBottom: 2,
  },
  label: {
    fontSize: 9,
    color: MUTED,
  },
  value: {
    fontSize: 9,
    color: DARK,
    fontFamily: "Helvetica-Bold",
  },

  /* ---- Diagnosis ---- */
  diagnosisRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginBottom: 2,
  },
  diagnosisLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
  },
  diagnosisValue: {
    fontSize: 9,
    color: DARK,
    fontFamily: "Helvetica-Bold",
  },
  severityLabel: {
    fontSize: 9,
    color: MUTED,
    marginLeft: 12,
  },
  severityValue: {
    fontSize: 9,
    color: DARK,
    fontFamily: "Helvetica-Bold",
  },

  /* ---- Rx symbol ---- */
  rxSymbol: {
    fontSize: 20,
    color: GOLD,
    marginTop: 6,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },

  /* ---- Medicines table ---- */
  table: {
    width: "100%",
    borderWidth: 0.5,
    borderColor: BORDER,
    borderStyle: "solid",
    marginBottom: 8,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: SECTION_BG,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: BG,
  },
  /* Column widths: #=7%, Medicine=38%, Dosage=30%, Duration=25% */
  colIndex: {
    width: "7%",
  },
  colMedicine: {
    width: "38%",
    paddingRight: 4,
  },
  colDosage: {
    width: "30%",
    paddingRight: 4,
  },
  colDuration: {
    width: "25%",
  },
  tableHeaderText: {
    fontSize: 8,
    color: MUTED,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  tableCellText: {
    fontSize: 9,
    color: DARK,
  },
  medicineInstructions: {
    fontSize: 7,
    color: MUTED,
    fontStyle: "italic",
    marginTop: 1,
  },

  /* ---- Instructions box ---- */
  instructionsBox: {
    backgroundColor: SECTION_BG,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  instructionsLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  instructionsText: {
    fontSize: 8,
    color: DARK,
    lineHeight: 1.4,
  },

  /* ---- Footer ---- */
  footerSection: {
    marginTop: "auto",
  },
  followUpRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  followUpLabel: {
    fontSize: 9,
    color: MUTED,
  },
  followUpValue: {
    fontSize: 9,
    color: DARK,
    fontFamily: "Helvetica-Bold",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  referenceText: {
    fontSize: 8,
    color: MUTED,
  },
  signatureBlock: {
    alignItems: "center",
  },
  signatureImage: {
    width: 100,
    height: 50,
    objectFit: "contain",
    marginBottom: 2,
  },
  signatureLine: {
    width: 70,
    height: 0.5,
    backgroundColor: BORDER,
    marginBottom: 2,
  },
  signatureName: {
    fontSize: 7,
    color: MUTED,
    textAlign: "center",
  },
  generatedText: {
    fontSize: 7,
    color: MUTED,
    textAlign: "center",
    marginBottom: 6,
  },
  feesRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  feesLabel: {
    fontSize: 8,
    color: MUTED,
  },
  feesValue: {
    fontSize: 8,
    color: DARK,
    fontFamily: "Helvetica-Bold",
  },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PrescriptionPDF({ data }: { data: PrescriptionPDFData }) {
  const {
    doctor,
    patient,
    diagnosis,
    severity,
    medicines,
    specialInstructions,
    followUpDate,
    consultationDate,
    referenceNumber,
    fees,
  } = data;

  const genderDisplay = formatGender(patient.gender);
  const ageDisplay = patient.age != null ? String(patient.age) : "-";

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        {/* ===== Top gold accent bar ===== */}
        <View style={styles.accentBarTop} />

        <View style={styles.body}>
          {/* ===== Header ===== */}
          <View style={styles.headerRow}>
            {/* Left — doctor info */}
            <View style={styles.headerLeft}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.qualifications}>
                {doctor.qualifications}
              </Text>
              <Text style={styles.regNumber}>
                Reg. No: {doctor.regNumber}
              </Text>
            </View>

            {/* Right — clinic info */}
            <View style={styles.headerRight}>
              <View style={styles.clinicRow}>
                {doctor.logoUrl ? (
                  <Image src={doctor.logoUrl} style={styles.clinicLogo} />
                ) : null}
                <Text style={styles.clinicName}>{doctor.clinicName}</Text>
              </View>
              <Text style={styles.clinicDetail}>{doctor.clinicAddress}</Text>
              {(doctor.clinicCity || doctor.clinicState) && (
                <Text style={styles.clinicDetail}>
                  {[doctor.clinicCity, doctor.clinicState]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              )}
              <Text style={styles.clinicDetail}>
                Ph: {doctor.phone}
              </Text>
            </View>
          </View>

          {/* ===== Divider ===== */}
          <View style={styles.divider} />

          {/* ===== Patient info ===== */}
          <View style={styles.patientRow}>
            <View style={styles.patientCol}>
              <View style={styles.patientLine}>
                <Text style={styles.label}>Patient: </Text>
                <Text style={styles.value}>{patient.name}</Text>
              </View>
              <View style={styles.patientLine}>
                <Text style={styles.label}>Date: </Text>
                <Text style={styles.value}>{consultationDate}</Text>
              </View>
            </View>

            <View style={styles.patientCol}>
              <View style={styles.patientLine}>
                <Text style={styles.label}>Age/Sex: </Text>
                <Text style={styles.value}>
                  {ageDisplay}/{genderDisplay}
                </Text>
              </View>
              <View style={styles.patientLine}>
                <Text style={styles.label}>ID: </Text>
                <Text style={styles.value}>{patient.patientId}</Text>
              </View>
            </View>
          </View>

          {/* ===== Diagnosis ===== */}
          <View style={styles.diagnosisRow}>
            <Text style={styles.diagnosisLabel}>Diagnosis: </Text>
            <Text style={styles.diagnosisValue}>{diagnosis}</Text>
            {severity ? (
              <>
                <Text style={styles.severityLabel}>Severity: </Text>
                <Text style={styles.severityValue}>{severity}</Text>
              </>
            ) : null}
          </View>

          {/* ===== Rx Symbol ===== */}
          <Text style={styles.rxSymbol}>Rx</Text>

          {/* ===== Medicines Table ===== */}
          {medicines.length > 0 && (
            <View style={styles.table}>
              {/* Header */}
              <View style={styles.tableHeaderRow}>
                <View style={styles.colIndex}>
                  <Text style={styles.tableHeaderText}>#</Text>
                </View>
                <View style={styles.colMedicine}>
                  <Text style={styles.tableHeaderText}>Medicine</Text>
                </View>
                <View style={styles.colDosage}>
                  <Text style={styles.tableHeaderText}>Dosage</Text>
                </View>
                <View style={styles.colDuration}>
                  <Text style={styles.tableHeaderText}>Duration</Text>
                </View>
              </View>

              {/* Data rows */}
              {medicines.map((med, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.tableRow,
                    idx % 2 === 1 ? styles.tableRowAlt : {},
                    idx === medicines.length - 1
                      ? { borderBottomWidth: 0 }
                      : {},
                  ]}
                >
                  <View style={styles.colIndex}>
                    <Text style={styles.tableCellText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.colMedicine}>
                    <Text style={styles.tableCellText}>{cleanText(med.name)}</Text>
                    {med.instructions ? (
                      <>
                        <Text style={styles.medicineInstructions}>{cleanText(med.instructions)}</Text>
                        {getHindiTiming(med.instructions) ? (
                          <Text style={{ fontFamily: "NotoSansDevanagari", fontSize: 6, color: "#6b5d4f", marginTop: 1 }}>
                            {getHindiTiming(med.instructions)}
                          </Text>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                  <View style={styles.colDosage}>
                    <Text style={styles.tableCellText}>
                      {cleanText(med.dosage)}{med.frequency ? ` - ${abbreviateFreq(cleanText(med.frequency))}` : ""}
                    </Text>
                    {med.frequency && getHindiTiming(med.frequency) ? (
                      <Text style={{ fontFamily: "NotoSansDevanagari", fontSize: 6, color: "#6b5d4f", marginTop: 1 }}>
                        {getHindiTiming(med.frequency)}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.colDuration}>
                    <Text style={styles.tableCellText}>{cleanText(med.duration)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ===== Special Instructions (Bilingual) ===== */}
          {specialInstructions ? (
            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsLabel}>INSTRUCTIONS</Text>
              <Text style={styles.instructionsText}>
                {cleanText(specialInstructions)}
              </Text>
              {data.specialInstructionsHi ? (
                <>
                  <View style={{ height: 0.5, backgroundColor: BORDER, marginVertical: 4 }} />
                  <Text style={{ fontFamily: "NotoSansDevanagari", fontSize: 7, color: "#6b5d4f", lineHeight: 1.5 }}>
                    {cleanText(data.specialInstructionsHi)}
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}

          {/* ===== Footer section (pushed to bottom) ===== */}
          <View style={styles.footerSection}>
            {/* Follow-up */}
            {followUpDate ? (
              <View>
                <View style={styles.followUpRow}>
                  <Text style={styles.followUpLabel}>Follow-up: </Text>
                  <Text style={styles.followUpValue}>{cleanText(followUpDate)}</Text>
                </View>
                <Text style={{ fontFamily: "NotoSansDevanagari", fontSize: 7, color: "#6b5d4f", marginTop: 1 }}>
                  अगली मुलाकात: {cleanText(followUpDate)}
                </Text>
              </View>
            ) : null}

            {/* Fees */}
            {fees != null && fees > 0 && (
              <View style={styles.feesRow}>
                <Text style={styles.feesLabel}>Consultation Fee: </Text>
                <Text style={styles.feesValue}>
                  Rs. {fees.toLocaleString("en-IN")}
                </Text>
              </View>
            )}

            {/* Reference + Signature */}
            <View style={styles.footerRow}>
              <View>
                <Text style={styles.referenceText}>
                  Ref: {referenceNumber}
                </Text>
              </View>

              <View style={styles.signatureBlock}>
                {doctor.signatureUrl ? (
                  <Image
                    src={doctor.signatureUrl}
                    style={styles.signatureImage}
                  />
                ) : (
                  <View style={styles.signatureLine} />
                )}
                <Text style={styles.signatureName}>{doctor.name}</Text>
              </View>
            </View>

            {/* Generated-by notice */}
            <Text style={styles.generatedText}>
              Generated via Tvacha Clinic
            </Text>
          </View>
        </View>

        {/* ===== Bottom gold accent bar ===== */}
        <View style={styles.accentBarBottom} />
      </Page>
    </Document>
  );
}
