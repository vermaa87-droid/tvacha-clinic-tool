// One-off tool: record FloralVineBackground sprawl + sway to static videos,
// for both desktop (1920x1080 landscape) and mobile (420x920 portrait).
// Run manually when the vine design needs regenerating:
//   1) npm run dev  — in another terminal
//   2) node scripts/record-vine-video.mjs

import puppeteer from "puppeteer";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const DEV_URL = "http://localhost:3000/record-vine";
const FPS = 60;
const SPRAWL_DURATION_MS = 4000;
const SPRAWL_FRAMES = Math.ceil((SPRAWL_DURATION_MS / 1000) * FPS) + 1; // 241
const SWAY_PERIOD_MS = 4000;
const SWAY_FRAMES = Math.round((SWAY_PERIOD_MS / 1000) * FPS); // 240

const IVORY = "0xf2efe9";
const WARM_DARK = "0x1a1612";

const FFMPEG = process.env.FFMPEG_PATH
  || "C:/Users/ASUS/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1-full_build/bin/ffmpeg.exe";

// keySuffix = output filename stem segment. Desktop: straight / curvy.
// Mobile: straight-mobile / curvy-mobile. Mobile-curvy and mobile-straight
// look similar at 420 width (only one column per side); we record both so
// /pricing /privacy /terms on mobile still match the curvy feel.
const variants = [
  { key: "straight",         straight: true,  width: 1920, height: 1080 },
  { key: "curvy",            straight: false, width: 1920, height: 1080 },
  { key: "straight-mobile",  straight: true,  width: 420,  height: 920  },
  { key: "curvy-mobile",     straight: false, width: 420,  height: 920  },
];

fs.mkdirSync(path.join(root, "scratch"), { recursive: true });
fs.mkdirSync(path.join(root, "public"),  { recursive: true });

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    p.on("error", reject);
  });
}

async function captureFrames(page, phase, frameCount, renderFnName, framesDir, width, height) {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  console.log(`  Capturing ${frameCount} ${phase} frames…`);
  const t0 = Date.now();
  for (let i = 0; i < frameCount; i++) {
    const elapsed = (i / FPS) * 1000;
    await page.evaluate((fn, e) => window[fn](e), renderFnName, elapsed);
    const file = path.join(framesDir, `frame-${String(i).padStart(5, "0")}.png`);
    await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width, height } });
  }
  console.log(`  ${phase}: ${frameCount} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

async function recordVariant(browser, { key, straight, width, height }) {
  console.log(`\n=== Variant: ${key}  (${width}x${height}) ===`);
  const sprawlDir = path.join(root, "scratch", `vine-${key}-sprawl`);
  const swayDir   = path.join(root, "scratch", `vine-${key}-sway`);

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 768 });
  await page.evaluateOnNewDocument((s) => {
    window.__vineRecording = true;
    window.__vineStraightOverride = s;
  }, straight);
  await page.goto(DEV_URL, { waitUntil: "networkidle0", timeout: 30_000 });
  await page.waitForFunction(
    () => window.__vineReady === true
      && typeof window.__vineRenderAt === "function"
      && typeof window.__vineRenderSwayAt === "function",
    { timeout: 15_000 }
  );
  await new Promise((r) => setTimeout(r, 300));

  await captureFrames(page, "sprawl", SPRAWL_FRAMES, "__vineRenderAt",     sprawlDir, width, height);
  await captureFrames(page, "sway",   SWAY_FRAMES,   "__vineRenderSwayAt", swayDir,   width, height);

  await page.close();
  return { sprawlDir, swayDir, width, height };
}

async function encodeAlphaWebm(framesDir, out) {
  await run(FFMPEG, [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(framesDir, "frame-%05d.png"),
    "-c:v", "libvpx-vp9",
    "-pix_fmt", "yuva420p",
    "-b:v", "1800k",
    "-auto-alt-ref", "0",
    "-deadline", "good",
    "-cpu-used", "2",
    out,
  ]);
}

async function encodeBakedMp4(framesDir, out, bg, width, height) {
  await run(FFMPEG, [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(framesDir, "frame-%05d.png"),
    "-filter_complex",
    `color=c=${bg}:s=${width}x${height}:r=${FPS}[bg];[bg][0]overlay=shortest=1:format=auto,format=yuv420p`,
    "-c:v", "libx264",
    "-crf", "23",
    "-preset", "medium",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    out,
  ]);
}

async function encodeVariant(key, sprawlDir, swayDir, width, height) {
  const pub = (name) => path.join(root, "public", name);

  console.log(`\n[${key}] Encoding sprawl WebM…`);
  await encodeAlphaWebm(sprawlDir, pub(`vine-sprawl-${key}.webm`));
  console.log(`[${key}] Encoding sprawl MP4 (ivory)…`);
  await encodeBakedMp4(sprawlDir, pub(`vine-sprawl-${key}.mp4`), IVORY, width, height);
  console.log(`[${key}] Encoding sprawl MP4 (dark)…`);
  await encodeBakedMp4(sprawlDir, pub(`vine-sprawl-${key}-dark.mp4`), WARM_DARK, width, height);

  console.log(`[${key}] Encoding sway WebM…`);
  await encodeAlphaWebm(swayDir, pub(`vine-sway-${key}.webm`));
  console.log(`[${key}] Encoding sway MP4 (ivory)…`);
  await encodeBakedMp4(swayDir, pub(`vine-sway-${key}.mp4`), IVORY, width, height);
  console.log(`[${key}] Encoding sway MP4 (dark)…`);
  await encodeBakedMp4(swayDir, pub(`vine-sway-${key}-dark.mp4`), WARM_DARK, width, height);

  const lastFrame = fs.readdirSync(sprawlDir).filter((f) => f.endsWith(".png")).sort().pop();
  fs.copyFileSync(path.join(sprawlDir, lastFrame), pub(`vine-poster-${key}.png`));

  for (const f of [
    `vine-sprawl-${key}.webm`,
    `vine-sprawl-${key}.mp4`,
    `vine-sprawl-${key}-dark.mp4`,
    `vine-sway-${key}.webm`,
    `vine-sway-${key}.mp4`,
    `vine-sway-${key}-dark.mp4`,
    `vine-poster-${key}.png`,
  ]) {
    console.log(`  ${f}: ${(fs.statSync(pub(f)).size / 1024).toFixed(1)} KB`);
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
    ],
    defaultViewport: null,
  });

  try {
    for (const v of variants) {
      const { sprawlDir, swayDir, width, height } = await recordVariant(browser, v);
      await encodeVariant(v.key, sprawlDir, swayDir, width, height);
    }
  } finally {
    await browser.close();
  }

  console.log("\n=== Done ===");
})();
