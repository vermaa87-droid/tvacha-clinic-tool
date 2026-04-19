// One-off tool: record the FloralVineBackground canvas sprawl to static videos.
// Run manually when the vine design needs to be re-rendered:
//   1) pnpm dev (or npm run dev) — in another terminal
//   2) node scripts/record-vine-video.mjs
//
// Emits under public/:
//   vine-sprawl-straight.webm   (VP9+alpha, both themes)
//   vine-sprawl-straight.mp4    (H.264, ivory baked)
//   vine-sprawl-straight-dark.mp4 (H.264, warm-dark baked)
//   vine-sprawl-curvy.webm / .mp4 / -dark.mp4 (same, curvy variant)
//   vine-poster-straight.png    (last frame, alpha)
//   vine-poster-curvy.png       (last frame, alpha)
//
// DO NOT add to the build pipeline — this is a manual tool.

import puppeteer from "puppeteer";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const DEV_URL = "http://localhost:3000/record-vine";
const FPS = 60;
const DURATION_MS = 4000;
const FRAMES = Math.ceil((DURATION_MS / 1000) * FPS) + 1; // 241 frames (0..240 inclusive)
const WIDTH = 1920;
const HEIGHT = 1080;

// Theme backgrounds — match app/globals.css --color-primary-50.
const IVORY = "0xf2efe9";
const WARM_DARK = "0x1a1612";

const FFMPEG = process.env.FFMPEG_PATH
  || "C:/Users/ASUS/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1-full_build/bin/ffmpeg.exe";

const variants = [
  { key: "straight", straight: true },
  { key: "curvy",    straight: false },
];

fs.mkdirSync(path.join(root, "scratch"), { recursive: true });
fs.mkdirSync(path.join(root, "public"), { recursive: true });

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    p.on("error", reject);
  });
}

async function recordVariant(browser, { key, straight }) {
  console.log(`\n=== Recording variant: ${key} ===`);
  const framesDir = path.join(root, "scratch", `vine-${key}-frames`);
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  // Inject recording flags BEFORE the app loads so they're read by the
  // FloralVineBackground useEffect on first mount.
  await page.evaluateOnNewDocument((s) => {
    window.__vineRecording = true;
    window.__vineStraightOverride = s;
  }, straight);

  await page.goto(DEV_URL, { waitUntil: "networkidle0", timeout: 30_000 });

  // Wait for the component to build vines and expose the manual renderer.
  await page.waitForFunction(() => window.__vineReady === true && typeof window.__vineRenderAt === "function", {
    timeout: 15_000,
  });

  // Small settle to let font loading & DPR sizing stabilize.
  await new Promise((r) => setTimeout(r, 300));

  console.log(`Capturing ${FRAMES} frames…`);
  const t0 = Date.now();
  for (let i = 0; i < FRAMES; i++) {
    const elapsed = (i / FPS) * 1000;
    await page.evaluate((e) => window.__vineRenderAt(e), elapsed);
    const file = path.join(framesDir, `frame-${String(i).padStart(5, "0")}.png`);
    await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
    if (i % 40 === 0) process.stdout.write(`  ${i}/${FRAMES}\r`);
  }
  console.log(`  ${FRAMES}/${FRAMES}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  await page.close();
  return { framesDir };
}

async function encodeVariant(key, framesDir) {
  const input = path.join(framesDir, "frame-%05d.png");
  const webm = path.join(root, "public", `vine-sprawl-${key}.webm`);
  const mp4Light = path.join(root, "public", `vine-sprawl-${key}.mp4`);
  const mp4Dark = path.join(root, "public", `vine-sprawl-${key}-dark.mp4`);
  const poster = path.join(root, "public", `vine-poster-${key}.png`);

  console.log(`\nEncoding ${key} — WebM (VP9+alpha)…`);
  await run(FFMPEG, [
    "-y",
    "-framerate", String(FPS),
    "-i", input,
    "-c:v", "libvpx-vp9",
    "-pix_fmt", "yuva420p",
    "-b:v", "1800k",
    "-auto-alt-ref", "0",
    "-deadline", "good",
    "-cpu-used", "2",
    webm,
  ]);

  const overlayFilter = (bg) =>
    `color=c=${bg}:s=${WIDTH}x${HEIGHT}:r=${FPS}[bg];[bg][0]overlay=shortest=1:format=auto,format=yuv420p`;

  console.log(`Encoding ${key} — MP4 (ivory baked)…`);
  await run(FFMPEG, [
    "-y",
    "-framerate", String(FPS),
    "-i", input,
    "-filter_complex", overlayFilter(IVORY),
    "-c:v", "libx264",
    "-crf", "23",
    "-preset", "medium",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    mp4Light,
  ]);

  console.log(`Encoding ${key} — MP4 (warm-dark baked)…`);
  await run(FFMPEG, [
    "-y",
    "-framerate", String(FPS),
    "-i", input,
    "-filter_complex", overlayFilter(WARM_DARK),
    "-c:v", "libx264",
    "-crf", "23",
    "-preset", "medium",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    mp4Dark,
  ]);

  // Last frame → poster (alpha-preserving copy)
  const files = fs.readdirSync(framesDir).filter((f) => f.endsWith(".png")).sort();
  const lastFrame = path.join(framesDir, files[files.length - 1]);
  fs.copyFileSync(lastFrame, poster);

  for (const f of [webm, mp4Light, mp4Dark, poster]) {
    const size = fs.statSync(f).size;
    console.log(`  ${path.basename(f)}: ${(size / 1024).toFixed(1)} KB`);
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--force-device-scale-factor=1",
      "--hide-scrollbars",
      `--window-size=${WIDTH},${HEIGHT}`,
    ],
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 },
  });

  try {
    for (const v of variants) {
      const { framesDir } = await recordVariant(browser, v);
      await encodeVariant(v.key, framesDir);
    }
  } finally {
    await browser.close();
  }

  console.log("\n=== Done ===");
})();
