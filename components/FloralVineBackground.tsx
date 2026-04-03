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
  spawnDist: number;
  len: number; // cached segment length
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
  segments: Seg[];
  branchSegs: Seg[];
  leaves: Leaf[];
  flowers: Flower[];
  orbs: Orb[];
  totalDist: number;
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

function computeSegLen(s: { p0: Pt; cp1: Pt; cp2: Pt; p1: Pt }): number {
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

  const spread = straight ? 0.083 : 0.28;
  const angleMin = -Math.PI * (0.5 + spread);
  const angleMax = -Math.PI * (0.5 - spread);

  for (let i = 0; i < segs; i++) {
    const centerBias = side === "left" ? 0.03 : -0.03;
    angle += (Math.random() - 0.5) * 0.45 + centerBias;
    angle = Math.max(angleMin, Math.min(angleMax, angle));

    const sLen = rand(55, 85);
    const nx = x + Math.cos(angle) * sLen;
    const ny = y + Math.sin(angle) * sLen;
    const cp1: Pt = { x: x + Math.cos(angle) * sLen * 0.33 + rand(-18, 18), y: y + Math.sin(angle) * sLen * 0.33 + rand(-12, 12) };
    const cp2: Pt = { x: x + Math.cos(angle) * sLen * 0.66 + rand(-18, 18), y: y + Math.sin(angle) * sLen * 0.66 + rand(-12, 12) };

    const seg: Seg = { p0: {x, y}, cp1, cp2, p1: {x: nx, y: ny}, thickness, isBranch: depth > 0, depth, spawnDist: dist, len: 0 };
    seg.len = computeSegLen(seg);
    out.segments.push(seg);
    const sl = seg.len;
    d += sl;

    leafSide = (leafSide * -1) as 1 | -1;
    const lt = 0.6;
    const lp = bPt(seg.p0, seg.cp1, seg.cp2, seg.p1, lt);
    const la = bTan(seg.p0, seg.cp1, seg.cp2, seg.p1, lt);
    const leafSize = depth === 0 ? rand(18, 32) : rand(12, 22);
    out.leaves.push({
      pos: lp, angle: la + leafSide * rand(0.5, 1.0),
      size: leafSize, phase: rand(0, Math.PI * 2),
      distAlongVine: d - sl * 0.4,
    });

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

    if (Math.random() < 0.25) {
      const op = bPt(seg.p0, seg.cp1, seg.cp2, seg.p1, rand(0.3, 0.8));
      out.orbs.push({ pos: op, radius: rand(4, 7), phase: rand(0, Math.PI * 2), distAlongVine: d - sl * 0.3 });
    }

    if (i > 1 && Math.random() < 0.18 && out.flowers.length < 20) {
      out.flowers.push({
        pos: { x: nx, y: ny }, size: rand(14, 22), petals: Math.random() < 0.4 ? 4 : 5,
        phase: rand(0, Math.PI * 2), distAlongVine: d,
      });
    }

    if (depth < 1 && Math.random() < 0.28 && i > 1) {
      const awayDir = side === "left" ? -1 : 1;
      const bAngle = angle + awayDir * rand(0.5, 1.1);
      const branchSegs = Math.floor(rand(3, 6));
      genBranch(nx, ny, bAngle, branchSegs, thickness * 0.60, d, out, depth + 1, side, straight);
    }

    x = nx; y = ny;
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

  const mainSegs = out.segments.filter(s => s.depth === 0);
  const branchSegs = out.segments.filter(s => s.depth > 0);

  let totalDist = 0;
  for (const s of mainSegs) totalDist += s.len;

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

  const petioleLen = size * 0.38;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(petioleLen, 0);
  ctx.strokeStyle = C.leafStroke;
  ctx.lineWidth = 1.0;
  ctx.lineCap = "round";
  ctx.stroke();

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
/*  STATIC RENDER — paint all vines at full growth, no animation          */
/* ═══════════════════════════════════════════════════════════════════════ */
function renderStatic(
  ctx: CanvasRenderingContext2D,
  vines: VineData[],
  w: number, h: number,
) {
  ctx.clearRect(0, 0, w, h);

  for (const vine of vines) {
    const drawnDist = vine.totalDist;

    /* ── sample bezier segment into pts array ── */
    const sampleSeg = (seg: Seg, frac: number, pts: Pt[]) => {
      const steps = Math.max(8, Math.ceil(frac * 20));
      const start = pts.length === 0 ? 0 : 1;
      for (let i = start; i <= steps; i++) {
        const t = Math.min(i / steps, frac);
        const pt = bPt(seg.p0, seg.cp1, seg.cp2, seg.p1, t);
        pts.push({ x: pt.x, y: pt.y });
        if (t >= frac) break;
      }
    };

    /* ── stroke a pts array with 3-layer style ── */
    const strokePath = (pts: Pt[], baseWidth: number, isBranch: boolean) => {
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

    /* ── main stem ── */
    {
      const pts: Pt[] = [];
      const baseWidth = vine.segments[0]?.thickness ?? 6;
      for (const seg of vine.segments) {
        sampleSeg(seg, 1, pts);
      }
      strokePath(pts, baseWidth, false);
    }

    /* ── branches ── */
    {
      const branches = new Map<number, Seg[]>();
      for (const seg of vine.branchSegs) {
        const key = seg.spawnDist;
        if (!branches.has(key)) branches.set(key, []);
        branches.get(key)!.push(seg);
      }
      for (const segs of branches.values()) {
        const pts: Pt[] = [];
        for (const seg of segs) {
          sampleSeg(seg, 1, pts);
        }
        strokePath(pts, segs[0].thickness, true);
      }
    }

    /* ── leaves ── */
    for (const leaf of vine.leaves) {
      drawLeaf(ctx, leaf.pos.x, leaf.pos.y, leaf.angle, leaf.size, 1);
    }

    /* ── flowers ── */
    for (const fl of vine.flowers) {
      drawFlower(ctx, fl.pos.x, fl.pos.y, fl.size, fl.petals, 1, fl.phase);
    }

    /* ── orbs ── */
    for (const orb of vine.orbs) {
      drawOrb(ctx, orb.pos.x, orb.pos.y, orb.radius, 1);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  GROWTH ANIMATION — runs only during the first 4 seconds              */
/* ═══════════════════════════════════════════════════════════════════════ */
function renderGrowth(
  ctx: CanvasRenderingContext2D,
  vines: VineData[],
  w: number, h: number,
  growT: number,
) {
  ctx.clearRect(0, 0, w, h);

  for (const vine of vines) {
    const drawnDist = vine.totalDist * growT;

    const sampleSeg = (seg: Seg, frac: number, pts: Pt[]) => {
      const steps = Math.max(8, Math.ceil(frac * 20));
      const start = pts.length === 0 ? 0 : 1;
      for (let i = start; i <= steps; i++) {
        const t = Math.min(i / steps, frac);
        const pt = bPt(seg.p0, seg.cp1, seg.cp2, seg.p1, t);
        pts.push({ x: pt.x, y: pt.y });
        if (t >= frac) break;
      }
    };

    const strokePath = (pts: Pt[], baseWidth: number, isBranch: boolean) => {
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

    /* ── main stem with growth ── */
    {
      const pts: Pt[] = [];
      let accDist = 0;
      const baseWidth = vine.segments[0]?.thickness ?? 6;
      for (const seg of vine.segments) {
        const sl = seg.len;
        if (accDist > drawnDist) break;
        const frac = Math.min(1, (drawnDist - accDist) / sl);
        accDist += sl;
        sampleSeg(seg, frac, pts);
        if (frac < 1) break;
      }
      strokePath(pts, baseWidth, false);
    }

    /* ── branches with growth ── */
    {
      const branches = new Map<number, Seg[]>();
      for (const seg of vine.branchSegs) {
        if (drawnDist < seg.spawnDist) continue;
        const key = seg.spawnDist;
        if (!branches.has(key)) branches.set(key, []);
        branches.get(key)!.push(seg);
      }
      for (const [spawnDist, segs] of branches) {
        const branchProgress = Math.min(1, (drawnDist - spawnDist) / (vine.totalDist * 0.18 + 1));
        const pts: Pt[] = [];
        let bAccDist = 0;
        const bTotal = segs.reduce((sum, s) => sum + s.len, 0);
        const bDrawn = bTotal * branchProgress;
        for (const seg of segs) {
          const sl = seg.len;
          if (bAccDist > bDrawn) break;
          const frac = Math.min(1, (bDrawn - bAccDist) / sl);
          bAccDist += sl;
          sampleSeg(seg, frac, pts);
          if (frac < 1) break;
        }
        strokePath(pts, segs[0].thickness, true);
      }
    }

    /* ── leaves with growth ── */
    for (const leaf of vine.leaves) {
      if (drawnDist < leaf.distAlongVine) continue;
      const scale = Math.min(1, (drawnDist - leaf.distAlongVine) / 20);
      if (scale < 0.02) continue;
      drawLeaf(ctx, leaf.pos.x, leaf.pos.y, leaf.angle, leaf.size, scale);
    }

    /* ── flowers with growth ── */
    for (const fl of vine.flowers) {
      if (drawnDist < fl.distAlongVine) continue;
      const scale = Math.min(1, (drawnDist - fl.distAlongVine) / 25);
      if (scale < 0.02) continue;
      drawFlower(ctx, fl.pos.x, fl.pos.y, fl.size, fl.petals, scale, fl.phase);
    }

    /* ── orbs with growth ── */
    for (const orb of vine.orbs) {
      if (drawnDist < orb.distAlongVine) continue;
      const opacity = Math.min(1, (drawnDist - orb.distAlongVine) / 20);
      if (opacity < 0.02) continue;
      drawOrb(ctx, orb.pos.x, orb.pos.y, orb.radius, opacity);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  COMPONENT                                                             */
/* ═══════════════════════════════════════════════════════════════════════ */
const GROWTH_DURATION = 4000; // ms

export function FloralVineBackground() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const vinesRef = useRef<VineData[]>([]);
  const startRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const lastWidthRef = useRef(0);
  const doneRef = useRef(false); // true once growth animation is finished

  /* ── build vines ── */
  const build = useCallback((w: number, h: number, straight: boolean) => {
    const mobile = w < 768;
    const vines: VineData[] = [];

    if (mobile) {
      vines.push(generateVine(rand(w * 0.01, w * 0.05), h + 20, "left",  true,  h, 1.0,  straight));
      vines.push(generateVine(rand(w * 0.95, w * 0.99), h + 20, "right", true,  h, 1.0,  straight));
    } else {
      vines.push(generateVine(rand(w * 0.01, w * 0.03), h + 20, "left",  false, h, 1.0,  straight));
      vines.push(generateVine(rand(w * 0.06, w * 0.09), h + 20, "left",  false, h, 0.75, straight));
      vines.push(generateVine(rand(w * 0.97, w * 0.99), h + 20, "right", false, h, 1.0,  straight));
      vines.push(generateVine(rand(w * 0.91, w * 0.94), h + 20, "right", false, h, 0.75, straight));
    }

    vinesRef.current = vines;
    startRef.current = performance.now();
    doneRef.current = false;
  }, []);

  /* ── growth animation loop — runs only until growth completes, then paints static and stops ── */
  const animate = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    const elapsed = now - startRef.current;
    const growT = Math.min(1, elapsed / GROWTH_DURATION);

    if (growT < 1) {
      renderGrowth(ctx, vinesRef.current, w, h, growT);
      rafRef.current = requestAnimationFrame(animate);
    } else {
      // Growth done — render final static frame and stop the loop
      renderStatic(ctx, vinesRef.current, w, h);
      doneRef.current = true;
      rafRef.current = 0;
    }
  }, []);

  /* ── setup effect ── */
  useEffect(() => {
    if (pathname.startsWith("/dashboard") || pathname === "/how-it-works") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.innerWidth < 768;

    const setup = (rebuildVines: boolean) => {
      const w = window.innerWidth;
      const h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      // DPR 1 on mobile to keep canvas buffer small (huge canvas = jank)
      const dpr = mobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
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

        if (reduced || mobile) {
          // Skip animation on mobile & reduced-motion — paint static immediately
          if (ctx) renderStatic(ctx, vinesRef.current, w, h);
          doneRef.current = true;
        } else {
          // Start growth animation (desktop only)
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(animate);
        }
      } else if (doneRef.current) {
        // Resize without rebuilding — just repaint static
        if (ctx) renderStatic(ctx, vinesRef.current, w, h);
      }
    };

    setup(true);

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
      window.removeEventListener("resize", onResize);
      clearTimeout(timer);
    };
  }, [pathname, build, animate]);

  if (pathname.startsWith("/dashboard") || pathname === "/how-it-works") return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, left: 0, width: "100%", zIndex: 0, pointerEvents: "none" }}
    />
  );
}
