// Vocabulary of dermatology lesion morphology types. The body-region geometry
// that used to live here has been replaced by react-body-highlighter's polygon
// data plus the custom overlay shapes in PatientBodyMapTab; only this constant
// is still consumed (by the lesion-marking popover).

export const LESION_TYPES = [
  "macule",
  "papule",
  "plaque",
  "nodule",
  "vesicle",
  "pustule",
  "wheal",
  "scale",
  "crust",
  "ulcer",
  "erosion",
  "fissure",
  "excoriation",
  "scar",
  "atrophy",
] as const;
