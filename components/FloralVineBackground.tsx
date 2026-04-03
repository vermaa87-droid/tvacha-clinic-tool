"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

/* ═══════════════════════════════════════════════════════════════════════ */
/*  COLORS                                                                */
/* ═══════════════════════════════════════════════════════════════════════ */
const C = {
  vine:        "rgba(200,162,80,0.82)",
  vineStroke:  "rgba(180,140,55,0.88)",
  branch:      "rgba(200,162,80,0.65)",
  leafFill:    "rgba(195,158,75,0.45)",
  leafStroke:  "rgba(170,132,50,0.70)",
  leafVein:    "rgba(225,195,120,0.55)",
  flowerFill:  "rgba(220,175,70,0.55)",
  flowerStroke:"rgba(190,148,60,0.70)",
  flowerCenter:"rgba(165,125,40,0.88)",
};

/* ═══════════════════════════════════════════════════════════════════════ */
/*  TYPES                                                                 */
/* ═══════════════════════════════════════════════════════════════════════ */
interface Pt { x: number; y: number }

interface Seg {
  p0: Pt; cp1: Pt; cp2: Pt; p1: Pt;
  thickness: number;
  isBranch: boolean;
  depth: number;
  spawnDist: number; // main-stem dist at which this seg's branch was spawned
}

interface Leaf {
  pos: Pt; angle: number; size: number; phase: number;
  distAlongVine: number;
}

interface Flower {
  pos: Pt; size: number; petals: number; phase: number;
  distAlongVine: number;
}

interface Orb {
  pos: Pt; radius: number; phase: number;
  distAlongVine: number;
}

interface VineData {
  segments: Seg[];      // main stem only (depth=0)
  branchSegs: Seg[];    // branches (depth≥1)
  leaves: Leaf[];
  flowers: Flower[];
  orbs: Orb[];
  totalDist: number;    // main stem distance only — used for growth pacing
  swayPhase: number;
  swayAmp: number;
  swaySpeed: number;
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  HELPERS                                                               */
/* ═══════════════════════════════════════════════════════════════════════ */
function rand(a: number, b: number) { return a + Math.random() * (b - a); }

function bPt(p0: Pt, c1: Pt, c2: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u*u*u*p0.x + 3*u*u*t*c1.x + 3*u*t*t*c2.x + t*t*t*p1.x,
    y: u*u*u*p0.y + 3*u*u*t*c1.y + 3*u*t*t*c2.y + t*t*t*p1.y,
  };
}

function bTan(p0: Pt, c1: Pt, c2: Pt, p1: Pt, t: number): number {
  const u = 1 - t;
  const dx = 3*u*u*(c1.x-p0.x) + 6*u*t*(c2.x-c1.x) + 3*t*t*(p1.x-c2.x);
  const dy = 3*u*u*(c1.y-p0.y) + 6*u*t*(c2.y-c1.y) + 3*t*t*(p1.y-c2.y);
  return Math.atan2(dy, dx);
}

function segLen(s: Seg): number {
  let len = 0; let prev = s.p0;
  for (let i = 1; i <= 10; i++) {
    const p = bPt(s.p0, s.cp1, s.cp2, s.p1, i / 10);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  VINE GENERATION                                                       */
/* ═══════════════════════════════════════════════════════════════════════ */
function genBranch(
  startX: number, startY: number, startAngle: number, segs: number,
  thickness: number, dist: number,
  out: { segments: Seg[]; leaves: Leaf[]; flowers: Flower[]; orbs: Orb[] },
  depth: number,
  side: "left" | "right",
  straight: boolean
) {
  let x = startX, y = startY, angle = startAngle;
  let d = dist;
  let leafSide: 1 | -1 = 1;

  // On main page: ±15° from vertical. Elsewhere: ±50°
  const spread = straight ? 0.083 : 0.28;
  const angleMin = -Math.PI * (0.5 + spread);
  const angleMax = -Math.PI * (0.5 - spread);

  for (let i = 0; i < segs; i++) {
    // Lean inward very slightly toward center
    const centerBias = side === "left" ? 0.03 : -0.03;
    angle += (Math.random() - 0.5) * 0.45 + centerBias;
    angle = Math.max(angleMin, Math.min(angleMax, angle));

    const sLen = rand(55, 85);
    const nx = x + Math.cos(angle) * sLen;
    const ny = y + Math.sin(angle) * sLen;
    const cp1: Pt = { x: x + Math.cos(angle) * sLen * 0.33 + rand(-18, 18), y: y + Math.sin(angle) * sLen * 0.33 + rand(-12, 12) };
    const cp2: Pt = { x: x + Math.cos(angle) * sLen * 0.66 + rand(-18, 18), y: y + Math.sin(angle) * sLen * 0.66 + rand(-12, 12) };

    const seg: Seg = { p0: {x, y}, cp1, cp2, p1: {x: nx, y: ny}, thickness, isBranch: depth > 0, depth, spawnDist: dist };
    out.segments.push(seg);
    const sl = segLen(seg);
    d += sl;

    // leaf on each segment
    leafSide = (leafSide * -1) as 1 | -1;
    const lt = 0.6;
    const lp = bPt(seg.p0, seg.cp1, seg.cp2, seg.p1, lt);
    const la = bTan(seg.p0, seg.cp1, seg.cp2, seg.p1, lt);
    // Bigger leaves: 18-32px for depth=0, 14-24px for branches
    const leafSize = depth === 0 ? rand(18, 32) : rand(12, 22);
    out.leaves.push({
      pos: lp, angle: la + leafSide * rand(0.5, 1.0),
      size: leafSize, phase: rand(0, Math.PI * 2),
      distAlongVine: d - sl * 0.4,
    });

    // extra leaf
    if (Math.random() < 0.5) {
      const lt2 = 0.32;
      const lp2 = bPt(seg.p0, seg.cp1, seg.cp2, seg.p1, lt2);
      const la2 = bTan(seg.p0, seg.cp1, seg.cp2, seg.p1, lt2);
      out.leaves.push({
        pos: lp2, angle: la2 - leafSide * rand(0.4, 0.8),
        size: depth === 0 ? rand(14, 24) : rand(10, 18), phase: rand(0, Math.PI * 2),
        distAlongVine: d - sl * 0.68,
      });
    }

    // orb
    if (Math.random() < 0.25) {
      const op = bPt(seg.p0, seg.cp1, seg.cp2, seg.p1, rand(0.3, 0.8));
      out.orbs.push({ pos: op, radius: rand(4, 7), phase: rand(0, Math.PI * 2), distAlongVine: d - sl * 0.3 });
    }

    // flower
    if (i > 1 && Math.random() < 0.18 && out.flowers.length < 20) {
      out.flowers.push({
        pos: { x: nx, y: ny }, size: rand(14, 22), petals: Math.random() < 0.4 ? 4 : 5,
        phase: rand(0, Math.PI * 2), distAlongVine: d,
      });
    }

    // sub-branch — only depth 0→1, not deeper, to avoid tangling
    if (depth < 1 && Math.random() < 0.28 && i > 1) {
      // Branch curves AWAY from main vine (outward)
      const awayDir = side === "left" ? -1 : 1;
      const bAngle = angle + awayDir * rand(0.5, 1.1);
      const branchSegs = Math.floor(rand(3, 6));
      genBranch(nx, ny, bAngle, branchSegs, thickness * 0.60, d, out, depth + 1, side, straight);
    }

    x = nx; y = ny;
    // Gentle taper: 8.5px → ~3px over 60 segments
    thickness = Math.max(2.2, thickness - 0.07);
  }
}

function generateVine(
  startX: number, startY: number,
  side: "left" | "right",
  isMobile: boolean,
  docH: number,
  heightFrac: number,
  straight: boolean
): VineData {
  const out = { segments: [] as Seg[], leaves: [] as Leaf[], flowers: [] as Flower[], orbs: [] as Orb[] };
  const inwardBias = side === "left" ? 0.05 : -0.05;
  const baseAngle = -Math.PI / 2 + inwardBias;
  const targetH = docH * heightFrac;
  const segs = Math.max(isMobile ? 10 : 15, Math.ceil(targetH / 50));
  const thickness = isMobile ? 4 : 6.5;

  genBranch(startX, startY, baseAngle, segs, thickness, 0, out, 0, side, straight);

  // Split into main stem (depth=0) and branches (depth≥1)
  const mainSegs = out.segments.filter(s => s.depth === 0);
  const branchSegs = out.segments.filter(s => s.depth > 0);

  // totalDist counts only main stem so growth pacing matches visual stem position
  let totalDist = 0;
  for (const s of mainSegs) totalDist += segLen(s);

  return {
    segments: mainSegs,
    branchSegs,
    leaves: out.leaves,
    flowers: out.flowers,
    orbs: out.orbs,
    totalDist,
    swayPhase: rand(0, Math.PI * 2),
    swayAmp: rand(3, 6),
    swaySpeed: rand(0.0006, 0.001),
  };
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  DRAWING                                                               */
/* ═══════════════════════════════════════════════════════════════════════ */
function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, scale: number) {
  if (scale < 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // Petiole (stem connecting leaf to vine)
  const petioleLen = size * 0.38;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(petioleLen, 0);
  ctx.strokeStyle = C.leafStroke;
  ctx.lineWidth = 1.0;
  ctx.lineCap = "round";
  ctx.stroke();

  // Leaf shape starting at end of petiole
  ctx.translate(petioleLen, 0);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(size * 0.22, -size * 0.50, size * 0.72, -size * 0.55, size, -size * 0.08);
  ctx.bezierCurveTo(size * 0.72, size * 0.38, size * 0.22, size * 0.50, 0, 0);
  ctx.fillStyle = C.leafFill;
  ctx.fill();
  ctx.strokeStyle = C.leafStroke;
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // Center vein
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.5, -size * 0.09, size * 0.88, -size * 0.06);
  ctx.strokeStyle = C.leafVein;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.restore();
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, petals: number, scale: number, rot: number) {
  if (scale < 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const pr = size * 0.4;
  for (let i = 0; i < petals; i++) {
    ctx.save();
    ctx.rotate((i / petals) * Math.PI * 2 + rot);
    ctx.beginPath();
    ctx.ellipse(0, -pr * 0.7, pr * 0.38, pr, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.flowerFill;
    ctx.fill();
    ctx.strokeStyle = C.flowerStroke;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = C.flowerCenter;
  ctx.fill();

  ctx.restore();
}

function drawOrb(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, brightness: number) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(225,185,70,${0.88 * brightness})`);
  grad.addColorStop(0.5, `rgba(200,162,80,${0.35 * brightness})`);
  grad.addColorStop(1, "rgba(200,162,80,0)");
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  COMPONENT                                                             */
/* ═══════════════════════════════════════════════════════════════════════ */
export function FloralVineBackground() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const vinesRef = useRef<VineData[]>([]);
  const mouseRef = useRef<Pt>({ x: -9999, y: -9999 });
  const startRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const reducedRef = useRef(false);
  const mobileRef = useRef(false);
  const lastWidthRef = useRef(0);

  /* ── build 4 vines in distinct zones ── */
  const build = useCallback((w: number, h: number, straight: boolean) => {
    const mobile = w < 768;
    mobileRef.current = mobile;
    const vines: VineData[] = [];

    if (mobile) {
      // 2 vines on mobile
      vines.push(generateVine(rand(w * 0.01, w * 0.05), h + 20, "left",  true,  h, 1.0,  straight));
      vines.push(generateVine(rand(w * 0.95, w * 0.99), h + 20, "right", true,  h, 1.0,  straight));
    } else {
      // LEFT — 2 vines in distinct x lanes, decreasing height toward center
      vines.push(generateVine(rand(w * 0.01, w * 0.03), h + 20, "left",  false, h, 1.0,  straight));
      vines.push(generateVine(rand(w * 0.06, w * 0.09), h + 20, "left",  false, h, 0.75, straight));

      // RIGHT — mirror zones
      vines.push(generateVine(rand(w * 0.97, w * 0.99), h + 20, "right", false, h, 1.0,  straight));
      vines.push(generateVine(rand(w * 0.91, w * 0.94), h + 20, "right", false, h, 0.75, straight));
    }

    vinesRef.current = vines;
    startRef.current = performance.now();
  }, []);

  /* ── render frame ── */
  const render = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    const reduced = reducedRef.current;
    const mobile = mobileRef.current;
    const mouse = mouseRef.current;

    ctx.clearRect(0, 0, w, h);

    const elapsed = now - startRef.current;
    const growT = reduced ? 1 : Math.min(1, elapsed / 4000);

    for (const vine of vinesRef.current) {
      const drawnDist = vine.totalDist * growT;
      const sway = reduced ? 0 : Math.sin(now * vine.swaySpeed + vine.swayPhase) * vine.swayAmp;

      /* ── helper: sample bezier segment into pts array ── */
      const sampleSeg = (seg: Seg, frac: number, pts: { x: number; y: number }[]) => {
        const steps = Math.max(8, Math.ceil(frac * 20));
        const start = pts.length === 0 ? 0 : 1; // skip first point if continuing path
        for (let i = start; i <= steps; i++) {
          const t = Math.min(i / steps, frac);
          const pt = bPt(seg.p0, seg.cp1, seg.cp2, seg.p1, t);
          const swF = 1 - pt.y / (h + 20);
          pts.push({ x: pt.x + sway * swF, y: pt.y });
          if (t >= frac) break;
        }
      };

      /* ── helper: stroke a pts array with 3-layer style ── */
      const strokePath = (pts: { x: number; y: number }[], baseWidth: number, isBranch: boolean) => {
        if (pts.length < 2) return;
        const applyPath = () => {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
        };
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        applyPath();
        ctx.lineWidth = baseWidth + 2.5;
        ctx.strokeStyle = isBranch ? "rgba(140,105,30,0.14)" : "rgba(140,105,30,0.25)";
        ctx.stroke();
        applyPath();
        ctx.lineWidth = baseWidth;
        ctx.strokeStyle = isBranch ? C.branch : C.vine;
        ctx.stroke();
        applyPath();
        ctx.lineWidth = baseWidth * 0.32;
        ctx.strokeStyle = "rgba(225,195,160,0.28)";
        ctx.stroke();
      };

      /* ── draw main stem as one continuous path ── */
      {
        const pts: { x: number; y: number }[] = [];
        let accDist = 0;
        let baseWidth = vine.segments[0]?.thickness ?? 6;
        for (const seg of vine.segments) {
          const sl = segLen(seg);
          if (accDist > drawnDist) break;
          const frac = Math.min(1, (drawnDist - accDist) / sl);
          accDist += sl;
          sampleSeg(seg, frac, pts);
          if (frac < 1) break;
        }
        strokePath(pts, baseWidth, false);
      }

      /* ── draw each branch as its own continuous path ── */
      {
        // Group branch segs by spawnDist (each branch shares the same spawnDist)
        const branches = new Map<number, Seg[]>();
        for (const seg of vine.branchSegs) {
          if (drawnDist < seg.spawnDist) continue;
          const key = seg.spawnDist;
          if (!branches.has(key)) branches.set(key, []);
          branches.get(key)!.push(seg);
        }
        for (const [spawnDist, segs] of branches) {
          const branchProgress = Math.min(1, (drawnDist - spawnDist) / (vine.totalDist * 0.18 + 1));
          const pts: { x: number; y: number }[] = [];
          let bAccDist = 0;
          const bTotal = segs.reduce((sum, s) => sum + segLen(s), 0);
          const bDrawn = bTotal * branchProgress;
          for (const seg of segs) {
            const sl = segLen(seg);
            if (bAccDist > bDrawn) break;
            const frac = Math.min(1, (bDrawn - bAccDist) / sl);
            bAccDist += sl;
            sampleSeg(seg, frac, pts);
            if (frac < 1) break;
          }
          strokePath(pts, segs[0].thickness, true);
        }
      }

      /* ── draw leaves ── */
      for (const leaf of vine.leaves) {
        if (growT < 1 && drawnDist < leaf.distAlongVine) continue;
        const scale = growT < 1
          ? Math.min(1, (drawnDist - leaf.distAlongVine) / 20)
          : 1;
        if (scale < 0.02) continue;

        const swF = 1 - leaf.pos.y / (h + 20);
        let lx = leaf.pos.x + sway * swF;
        let ly = leaf.pos.y;
        let la = leaf.angle + (reduced ? 0 : Math.sin(now * 0.001 + leaf.phase) * 0.07);

        if (!mobile && !reduced) {
          const dx = lx - mouse.x, dy = ly - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120 && dist > 0) {
            const f = (1 - dist / 120) * 15;
            lx += (dx / dist) * f;
            ly += (dy / dist) * f;
            la += (1 - dist / 120) * 0.14;
          }
        }

        drawLeaf(ctx, lx, ly, la, leaf.size, scale);
      }

      /* ── draw flowers ── */
      for (const fl of vine.flowers) {
        if (growT < 1 && drawnDist < fl.distAlongVine) continue;
        const scale = growT < 1
          ? Math.min(1, (drawnDist - fl.distAlongVine) / 25)
          : 1 + (reduced ? 0 : Math.sin(now * 0.0012 + fl.phase) * 0.05);
        if (scale < 0.02) continue;

        const swF = 1 - fl.pos.y / (h + 20);
        let fx = fl.pos.x + sway * swF;
        let fy = fl.pos.y;

        if (!mobile && !reduced) {
          const dx = fx - mouse.x, dy = fy - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120 && dist > 0) {
            const f = (1 - dist / 120) * 12;
            fx += (dx / dist) * f;
            fy += (dy / dist) * f;
          }
        }

        const rot = reduced ? 0 : now * 0.00005 + fl.phase;
        drawFlower(ctx, fx, fy, fl.size, fl.petals, Math.min(scale, 1.1), rot);
      }

      /* ── draw orbs ── */
      for (const orb of vine.orbs) {
        if (growT < 1 && drawnDist < orb.distAlongVine) continue;
        let opacity = growT < 1
          ? Math.min(1, (drawnDist - orb.distAlongVine) / 20)
          : 1;
        if (opacity < 0.02) continue;

        const pulse = reduced ? 1 : 1 + Math.sin(now * 0.002 + orb.phase) * 0.3;
        const swF = 1 - orb.pos.y / (h + 20);
        let ox = orb.pos.x + sway * swF;
        let oy = orb.pos.y;

        if (!mobile && !reduced) {
          const dx = ox - mouse.x, dy = oy - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120 && dist > 0) {
            const f = (1 - dist / 120) * 10;
            ox += (dx / dist) * f;
            oy += (dy / dist) * f;
            opacity = Math.min(1.4, opacity + (1 - dist / 120) * 0.3);
          }
        }

        drawOrb(ctx, ox, oy, orb.radius * pulse, opacity);
      }
    }

    rafRef.current = requestAnimationFrame(render);
  }, []);

  /* ── setup effect ── */
  useEffect(() => {
    if (pathname.startsWith("/dashboard") || pathname === "/how-it-works") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setup = (rebuildVines: boolean) => {
      const w = window.innerWidth;
      // Full document height — canvas is absolute so it scrolls with the page
      const h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = "100%";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      if (rebuildVines) {
        lastWidthRef.current = w;
        build(w, h, pathname === "/");
      }
    };

    setup(true);

    if (!window.matchMedia("(hover: none)").matches) {
      const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
      window.addEventListener("mousemove", onMove, { passive: true });
      (canvas as any).__onMove = onMove;
    }

    rafRef.current = requestAnimationFrame(render);

    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const newWidth = window.innerWidth;
        const widthChanged = Math.abs(newWidth - lastWidthRef.current) > 50;
        setup(widthChanged);
      }, 300);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if ((canvas as any).__onMove) window.removeEventListener("mousemove", (canvas as any).__onMove);
      window.removeEventListener("resize", onResize);
      clearTimeout(timer);
    };
  }, [pathname, build, render]);

  if (pathname.startsWith("/dashboard") || pathname === "/how-it-works") return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, left: 0, width: "100%", zIndex: 0, pointerEvents: "none" }}
    />
  );
}
