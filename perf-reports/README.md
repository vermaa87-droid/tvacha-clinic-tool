# Performance Reports & Runbook

Phase 5 of the perf optimisation pass added the tooling below. This folder holds the artefacts those tools produce.

> **Anything in `perf-reports/` other than this README is gitignored.** Run the commands locally to regenerate; commit only when you're saving a meaningful baseline.

## Commands

```bash
# Bundle waterfall — opens HTML treemaps in your browser.
npm run analyze

# Per-route + shared-chunk size budgets. Fails non-zero if any limit
# is breached. Treat as a blocking check in PRs.
npm run size

# Lighthouse CI — boots `next start`, runs Chrome headless against
# the URLs in .lighthouserc.json, asserts perf/a11y thresholds.
npm run lhci
```

## Current size-limit budgets

Brotli-compressed sizes from the Phase 4 baseline (`after-phase-4-build.txt`).
Budgets are set ~10 % above the measured baseline so small drift is allowed
but a regression that ships a new heavy library will trip the check.

| Entry | Baseline (brotli) | Limit | Headroom |
|---|--:|--:|--:|
| Shared JS (every route) | 144.66 KB | **152 KB** | ~5 % |
| `/` (landing) | 8.55 KB | **9.5 KB** | ~11 % |
| `/pricing` | 2.43 KB | **3 KB** | ~23 % |
| `/how-it-works` | 7.49 KB | **8.5 KB** | ~13 % |
| `/login` | 6.00 KB | **7 KB** | ~17 % |
| `/signup` | 7.58 KB | **8.5 KB** | ~12 % |
| `/dashboard` | 6.47 KB | **7.5 KB** | ~16 % |
| `/dashboard/analytics` | 6.08 KB | **7 KB** | ~15 % |
| `/dashboard/patients/[id]` | 25.72 KB | **28.5 KB** | ~11 % |
| `/dashboard/register` | 15.84 KB | **17.5 KB** | ~10 % |
| `/dashboard/prescriptions` | 14.14 KB | **15.5 KB** | ~10 % |

> Budgets cover **per-route page chunks** + **the shared bundle**. They do *not*
> cover dynamic chunks loaded later (recharts on `/analytics`, react-body-highlighter on
> `/dashboard/patients/[id]`, etc.) — those code-split chunks are intentionally lazy
> and don't count against first-load JS.

## Lighthouse thresholds

`.lighthouserc.json` enforces, on `/`, `/login`, `/pricing`:

| Metric | Threshold | Severity |
|---|--:|--|
| Performance score | ≥ 0.85 | error |
| Accessibility score | ≥ 0.90 | error |
| First Contentful Paint | ≤ 2 s | warn |
| Largest Contentful Paint | ≤ 3 s | error |
| Total Blocking Time | ≤ 300 ms | warn |
| Cumulative Layout Shift | ≤ 0.1 | error |

These are the sane defaults from the Phase 5 spec. **Run `npm run lhci`
once locally and tighten any threshold to ~5 % below your measured value
so future regressions trip the check.** They have not been calibrated
against this app's actual scores yet.

## Historical first-load JS per route

Pulled from each phase's build log. All numbers are gzipped (Next.js
build-output convention), not brotli — that's why they look bigger than
the size-limit budgets above.

| Route | Phase 1 → 2 | Phase 2 → 3 | Phase 3 → 4 |
|---|--:|--:|--:|
| `/` | — → 201 KB | 201 → **176 KB** (−25) | 176 → 176 KB |
| `/login` | — → 208 KB | 208 → **184 KB** (−24) | 184 → 184 KB |
| `/dashboard` | — → 260 KB | 260 → **236 KB** (−24) | 236 → 236 KB |
| `/dashboard/analytics` | — → 317 KB | 317 → **187 KB** (**−130**, −41 %) | 187 → 187 KB |
| `/dashboard/prescriptions` | — → 216 KB | 216 → **192 KB** (−24) | 192 → 192 KB |
| `/dashboard/patients/[id]` | — → 316 KB | 316 → **288 KB** (−28) | 288 → 288 KB |
| `/dashboard/register` | — → 232 KB | 232 → **193 KB** (−39) | 193 → 193 KB |
| Shared bundle | — → 87.8 KB | 87.8 → 87.9 KB | 87.9 → 87.9 KB |

(Phase 4 was a code-cleanup pass with no bundle impact.)

## Things that will trip these budgets

- Importing `@react-pdf/renderer` from a client component (currently API-route only).
- Adding a new chart library, or accidentally importing all of `recharts` from a top-level dashboard page instead of via the lazy `AnalyticsCharts` chunk.
- Adding a heavy date library (`moment`, full Luxon) — `date-fns` is the only allowed one.
- Adding a UI kit (MUI, Chakra, Mantine) — Tvacha is hand-built Tailwind, mixing kits doubles bundle weight.
- Eagerly importing the Hindi translations (`lib/i18n/hi.ts`) anywhere outside `lib/language-context.tsx`.
- Static `import { ... } from "react-body-highlighter"` from any page that isn't a leaf — it must stay behind `dynamic()`.
- Removing `experimental.optimizePackageImports` from `next.config.js` — that's what tree-shakes recharts/lucide/date-fns/framer-motion.

## Folder layout

```
perf-reports/
├── README.md         ← this file (committed)
├── analyze/          ← @next/bundle-analyzer HTML output (gitignored)
├── lhci/             ← lighthouse CI HTML/JSON output (gitignored)
└── profiler/         ← React profiler traces (gitignored except for *.example.json baselines)
```

## Hygiene cadence

- **On every PR**: `npm run size` should pass. If it fails, the PR added something heavy and must justify or split it out.
- **Before any new dependency**: `npm run analyze` and inspect the treemap.
- **Quarterly**: re-run the full Phase 1 audit (dep usage, knip, dead code) as the codebase grows.
