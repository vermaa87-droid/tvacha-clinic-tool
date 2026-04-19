// Pre-renders subtle noise grain to static WebP bitmaps.
// Run manually when regeneration is needed: `node scripts/render-grain.mjs`.
// Do NOT add to the build pipeline — this is a one-off tool.
//
// Why: Chrome evaluates SVG filter effects (feTurbulence fractal noise with
// numOctaves=4) on the CPU at raster time. Inlined as a data: URI on
// <body background-image>, this caused per-tile raster costs of ~15ms and
// 20% dropped frames on authenticated dashboard pages. Pre-rendering to WebP
// collapses the cost to a cached bitmap blit.
//
// The SVG sources in scripts/grain-{light,dark}.svg are the visual intent,
// but librsvg (used by sharp) does not render feTurbulence with correct
// intensity. So we generate equivalent noise programmatically here: flat
// base color + uniform-random pixel jitter matching the original opacity
// (0.02 light = ~5/255, 0.01 dark = ~2.5/255).

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const SIZE = 1200;

// Deterministic PRNG so repeated runs produce the same grain (sfc32).
function makeRng(seed) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = seed >>> 0;
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = ((c << 21) | (c >>> 11));
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

// Generates an RGB buffer: base fill with per-pixel signed jitter.
// `darkenByMax` is the max channel delta (approximates original opacity*255).
// `sign` is +1 (brighten) or -1 (darken) — matches original intent
// (light: #000 noise on light bg = darken; dark: #fff noise on dark bg = brighten).
function generate({ baseRgb, sign, maxDelta, seed }) {
  const buf = Buffer.alloc(SIZE * SIZE * 3);
  const rng = makeRng(seed);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const d = Math.floor(rng() * (maxDelta + 1)) * sign;
    buf[i * 3 + 0] = Math.max(0, Math.min(255, baseRgb[0] + d));
    buf[i * 3 + 1] = Math.max(0, Math.min(255, baseRgb[1] + d));
    buf[i * 3 + 2] = Math.max(0, Math.min(255, baseRgb[2] + d));
  }
  return buf;
}

const variants = [
  {
    label: "light",
    out: "public/grain.webp",
    baseRgb: [0xf2, 0xef, 0xe9], // #F2EFE9
    sign: -1,                     // darken (original: #000 @ 0.02)
    maxDelta: 5,                  // ≈ 0.02 * 255
    seed: 0xa51c,
  },
  {
    label: "dark",
    out: "public/grain-dark.webp",
    baseRgb: [0x1a, 0x16, 0x12], // #1a1612
    sign: +1,                     // brighten (original: #fff @ 0.01)
    maxDelta: 3,                  // ≈ 0.01 * 255
    seed: 0x3e77,
  },
];

for (const v of variants) {
  const buf = generate(v);
  const outPath = path.join(root, v.out);
  await sharp(buf, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .webp({ quality: 85, effort: 6 })
    .toFile(outPath);
  const { size } = fs.statSync(outPath);
  console.log(`${v.out}  ${(size / 1024).toFixed(1)} KB  (${v.label})`);
}
