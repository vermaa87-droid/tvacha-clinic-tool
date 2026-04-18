// Region geometry for the body map. viewBox 200 × 500.
// All paths use bezier curves for a smooth, anatomically-proportioned silhouette.
//
// Front view — anatomical orientation:
//   patient's LEFT arm = viewer's RIGHT  (larger x ~138-166)
//   patient's RIGHT arm = viewer's LEFT  (smaller x ~34-62)
// Back view — anatomical orientation (patient turned around):
//   patient's LEFT arm = viewer's LEFT   (smaller x ~34-62)
//   patient's RIGHT arm = viewer's RIGHT (larger x ~138-166)

export type BodyView = "front" | "back";

export interface BodyRegion {
  key: string;
  view: BodyView;
  labelKey: string;
  path: string;
  centroid: { x: number; y: number };
}

export const BODY_REGIONS: BodyRegion[] = [
  // ── FRONT ──────────────────────────────────────────────────────────────────

  // Scalp — flat-topped pentagon (top of head)
  {
    key: "scalp",
    view: "front",
    labelKey: "bodymap_region_scalp",
    path: "M 88 10 L 112 10 L 124 36 L 76 36 Z",
    centroid: { x: 100, y: 24 },
  },

  // Forehead — straight-sided rectangle from scalp to brow
  {
    key: "forehead",
    view: "front",
    labelKey: "bodymap_region_forehead",
    path: "M 76 36 L 124 36 L 120 58 L 80 58 Z",
    centroid: { x: 100, y: 47 },
  },

  // Left cheek (patient's left = viewer's right, larger x)
  {
    key: "left_cheek",
    view: "front",
    labelKey: "bodymap_region_left_cheek",
    path: "M 109 58 L 120 58 L 120 84 L 109 84 Z",
    centroid: { x: 115, y: 71 },
  },

  // Right cheek (patient's right = viewer's left, smaller x)
  {
    key: "right_cheek",
    view: "front",
    labelKey: "bodymap_region_right_cheek",
    path: "M 80 58 L 91 58 L 91 84 L 80 84 Z",
    centroid: { x: 86, y: 71 },
  },

  // Nose (centre strip)
  {
    key: "nose",
    view: "front",
    labelKey: "bodymap_region_nose",
    path: "M 91 58 L 109 58 L 109 84 L 91 84 Z",
    centroid: { x: 100, y: 71 },
  },

  // Chin / jaw
  {
    key: "chin",
    view: "front",
    labelKey: "bodymap_region_chin",
    path: "M 80 84 L 120 84 L 116 98 L 84 98 Z",
    centroid: { x: 100, y: 91 },
  },

  // Neck
  {
    key: "neck",
    view: "front",
    labelKey: "bodymap_region_neck",
    path: "M 90 98 L 110 98 L 111 118 L 89 118 Z",
    centroid: { x: 100, y: 108 },
  },

  // Chest
  {
    key: "chest",
    view: "front",
    labelKey: "bodymap_region_chest",
    path: `M 89 118 C 80 118 63 124 57 136
           L 55 196 L 145 196
           L 143 136 C 137 124 120 118 111 118 Z`,
    centroid: { x: 100, y: 160 },
  },

  // Abdomen
  {
    key: "abdomen",
    view: "front",
    labelKey: "bodymap_region_abdomen",
    path: `M 55 198 L 145 198
           C 145 230 141 250 137 260
           L 63 260 C 59 250 55 230 55 198 Z`,
    centroid: { x: 100, y: 228 },
  },

  // Left upper arm (viewer's right, large x)
  {
    key: "left_upper_arm",
    view: "front",
    labelKey: "bodymap_region_left_upper_arm",
    path: `M 138 122 C 145 124 155 136 157 148
           L 161 196 L 143 196
           C 142 164 139 140 138 122 Z`,
    centroid: { x: 151, y: 162 },
  },

  // Right upper arm (viewer's left, small x)
  {
    key: "right_upper_arm",
    view: "front",
    labelKey: "bodymap_region_right_upper_arm",
    path: `M 62 122 C 55 124 45 136 43 148
           L 39 196 L 57 196
           C 58 164 61 140 62 122 Z`,
    centroid: { x: 49, y: 162 },
  },

  // Left forearm (viewer's right)
  {
    key: "left_forearm",
    view: "front",
    labelKey: "bodymap_region_left_forearm",
    path: "M 143 198 L 161 198 L 167 258 L 147 258 Z",
    centroid: { x: 155, y: 228 },
  },

  // Right forearm (viewer's left)
  {
    key: "right_forearm",
    view: "front",
    labelKey: "bodymap_region_right_forearm",
    path: "M 39 198 L 57 198 L 53 258 L 33 258 Z",
    centroid: { x: 45, y: 228 },
  },

  // Left hand (viewer's right)
  {
    key: "left_hand",
    view: "front",
    labelKey: "bodymap_region_left_hand",
    path: `M 147 260 L 169 260
           C 171 274 169 286 165 290
           C 160 295 150 295 146 290
           C 143 286 143 274 147 260 Z`,
    centroid: { x: 158, y: 276 },
  },

  // Right hand (viewer's left)
  {
    key: "right_hand",
    view: "front",
    labelKey: "bodymap_region_right_hand",
    path: `M 33 260 L 55 260
           C 56 274 56 286 52 290
           C 47 295 37 295 33 290
           C 30 286 30 274 33 260 Z`,
    centroid: { x: 42, y: 276 },
  },

  // Groin (centre, between thighs, below abdomen)
  {
    key: "groin",
    view: "front",
    labelKey: "bodymap_region_groin",
    path: "M 83 260 L 117 260 L 113 280 L 87 280 Z",
    centroid: { x: 100, y: 270 },
  },

  // Left thigh (viewer's right, x 100–131)
  {
    key: "left_thigh",
    view: "front",
    labelKey: "bodymap_region_left_thigh",
    path: `M 100 262 L 131 262
           C 132 298 129 332 125 366
           L 104 366
           C 100 332 98 298 100 262 Z`,
    centroid: { x: 116, y: 314 },
  },

  // Right thigh (viewer's left, x 69–100)
  {
    key: "right_thigh",
    view: "front",
    labelKey: "bodymap_region_right_thigh",
    path: `M 69 262 L 100 262
           C 100 298 98 332 94 366
           L 73 366
           C 69 332 67 298 69 262 Z`,
    centroid: { x: 84, y: 314 },
  },

  // Left lower leg (viewer's right)
  {
    key: "left_lower_leg",
    view: "front",
    labelKey: "bodymap_region_left_lower_leg",
    path: `M 104 368 L 125 368
           C 125 404 123 436 121 454
           L 106 454
           C 104 436 102 404 104 368 Z`,
    centroid: { x: 114, y: 411 },
  },

  // Right lower leg (viewer's left)
  {
    key: "right_lower_leg",
    view: "front",
    labelKey: "bodymap_region_right_lower_leg",
    path: `M 73 368 L 94 368
           C 96 404 96 436 94 454
           L 78 454
           C 76 436 74 404 73 368 Z`,
    centroid: { x: 83, y: 411 },
  },

  // Left foot (viewer's right — extends toward larger x)
  {
    key: "left_foot",
    view: "front",
    labelKey: "bodymap_region_left_foot",
    path: `M 106 455 C 106 463 109 471 117 475
           C 125 479 137 476 140 468
           C 142 461 139 455 126 455 Z`,
    centroid: { x: 121, y: 466 },
  },

  // Right foot (viewer's left — extends toward smaller x)
  {
    key: "right_foot",
    view: "front",
    labelKey: "bodymap_region_right_foot",
    path: `M 92 455 C 92 463 90 471 84 475
           C 76 479 64 476 60 468
           C 58 461 61 455 74 455 Z`,
    centroid: { x: 75, y: 466 },
  },

  // ── BACK ───────────────────────────────────────────────────────────────────
  // Back view: patient's LEFT = viewer's LEFT (small x), patient's RIGHT = viewer's RIGHT (large x)

  // Scalp — full back of head (no face regions)
  {
    key: "scalp",
    view: "back",
    labelKey: "bodymap_region_scalp",
    path: `M 100 8 C 122 8 130 24 130 44
           C 130 62 118 74 100 76
           C 82 74 70 62 70 44
           C 70 24 78 8 100 8 Z`,
    centroid: { x: 100, y: 40 },
  },

  // Neck (back)
  {
    key: "neck",
    view: "back",
    labelKey: "bodymap_region_neck",
    path: "M 90 76 C 90 84 89 102 89 118 L 111 118 C 111 102 110 84 110 76 Z",
    centroid: { x: 100, y: 97 },
  },

  // Upper back
  {
    key: "upper_back",
    view: "back",
    labelKey: "bodymap_region_upper_back",
    path: `M 89 118 C 80 118 63 124 57 136
           L 55 196 L 145 196
           L 143 136 C 137 124 120 118 111 118 Z`,
    centroid: { x: 100, y: 160 },
  },

  // Lower back
  {
    key: "lower_back",
    view: "back",
    labelKey: "bodymap_region_lower_back",
    path: `M 55 198 L 145 198
           C 145 230 141 250 137 260
           L 63 260 C 59 250 55 230 55 198 Z`,
    centroid: { x: 100, y: 228 },
  },

  // Back: patient LEFT upper arm = viewer's LEFT (small x)
  {
    key: "left_upper_arm",
    view: "back",
    labelKey: "bodymap_region_left_upper_arm",
    path: `M 62 122 C 55 124 45 136 43 148
           L 39 196 L 57 196
           C 58 164 61 140 62 122 Z`,
    centroid: { x: 49, y: 162 },
  },

  // Back: patient RIGHT upper arm = viewer's RIGHT (large x)
  {
    key: "right_upper_arm",
    view: "back",
    labelKey: "bodymap_region_right_upper_arm",
    path: `M 138 122 C 145 124 155 136 157 148
           L 161 196 L 143 196
           C 142 164 139 140 138 122 Z`,
    centroid: { x: 151, y: 162 },
  },

  // Back: patient LEFT forearm = viewer's LEFT
  {
    key: "left_forearm",
    view: "back",
    labelKey: "bodymap_region_left_forearm",
    path: "M 39 198 L 57 198 L 53 258 L 33 258 Z",
    centroid: { x: 45, y: 228 },
  },

  // Back: patient RIGHT forearm = viewer's RIGHT
  {
    key: "right_forearm",
    view: "back",
    labelKey: "bodymap_region_right_forearm",
    path: "M 143 198 L 161 198 L 167 258 L 147 258 Z",
    centroid: { x: 155, y: 228 },
  },

  // Back: patient LEFT hand = viewer's LEFT
  {
    key: "left_hand",
    view: "back",
    labelKey: "bodymap_region_left_hand",
    path: `M 33 260 L 55 260
           C 56 274 56 286 52 290
           C 47 295 37 295 33 290
           C 30 286 30 274 33 260 Z`,
    centroid: { x: 42, y: 276 },
  },

  // Back: patient RIGHT hand = viewer's RIGHT
  {
    key: "right_hand",
    view: "back",
    labelKey: "bodymap_region_right_hand",
    path: `M 147 260 L 169 260
           C 171 274 169 286 165 290
           C 160 295 150 295 146 290
           C 143 286 143 274 147 260 Z`,
    centroid: { x: 158, y: 276 },
  },

  // Back: patient LEFT thigh = viewer's LEFT (x 69–100)
  {
    key: "left_thigh",
    view: "back",
    labelKey: "bodymap_region_left_thigh",
    path: `M 69 262 L 100 262
           C 100 298 98 332 94 366
           L 73 366
           C 69 332 67 298 69 262 Z`,
    centroid: { x: 84, y: 314 },
  },

  // Back: patient RIGHT thigh = viewer's RIGHT (x 100–131)
  {
    key: "right_thigh",
    view: "back",
    labelKey: "bodymap_region_right_thigh",
    path: `M 100 262 L 131 262
           C 132 298 129 332 125 366
           L 104 366
           C 100 332 98 298 100 262 Z`,
    centroid: { x: 116, y: 314 },
  },

  // Back: patient LEFT lower leg = viewer's LEFT
  {
    key: "left_lower_leg",
    view: "back",
    labelKey: "bodymap_region_left_lower_leg",
    path: `M 73 368 L 94 368
           C 96 404 96 436 94 454
           L 78 454
           C 76 436 74 404 73 368 Z`,
    centroid: { x: 83, y: 411 },
  },

  // Back: patient RIGHT lower leg = viewer's RIGHT
  {
    key: "right_lower_leg",
    view: "back",
    labelKey: "bodymap_region_right_lower_leg",
    path: `M 104 368 L 125 368
           C 125 404 123 436 121 454
           L 106 454
           C 104 436 102 404 104 368 Z`,
    centroid: { x: 114, y: 411 },
  },

  // Back: patient LEFT foot = viewer's LEFT
  {
    key: "left_foot",
    view: "back",
    labelKey: "bodymap_region_left_foot",
    path: `M 92 455 C 92 463 90 471 84 475
           C 76 479 64 476 60 468
           C 58 461 61 455 74 455 Z`,
    centroid: { x: 75, y: 466 },
  },

  // Back: patient RIGHT foot = viewer's RIGHT
  {
    key: "right_foot",
    view: "back",
    labelKey: "bodymap_region_right_foot",
    path: `M 106 455 C 106 463 109 471 117 475
           C 125 479 137 476 140 468
           C 142 461 139 455 126 455 Z`,
    centroid: { x: 121, y: 466 },
  },
];

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

export type LesionType = (typeof LESION_TYPES)[number];
