"use client";

import { useEffect, useRef } from "react";

/* ── Same colors as FloralVineBackground ── */
const C = {
  vine:         "rgba(200,162,80,0.82)",
  vineStroke:   "rgba(180,140,55,0.88)",
  branch:       "rgba(200,162,80,0.65)",
  leafFill:     "rgba(195,158,75,0.45)",
  leafStroke:   "rgba(170,132,50,0.70)",
  leafVein:     "rgba(225,195,120,0.55)",
  flowerFill:   "rgba(220,175,70,0.55)",
  flowerStroke: "rgba(190,148,60,0.70)",
  flowerCenter: "rgba(165,125,40,0.88)",
};

/* ── Helpers (identical to FloralVineBackground) ── */
interface Pt { x: number; y: number }

interface Seg {
  p0: Pt; cp1: Pt; cp2: Pt; p1: Pt;
  thickness: number;
  depth: number;
  spawnDist: number;
}

interface Leaf   { pos: Pt; angle: number; size: number; phase: number; distAlongVine: number }
interface Flower { pos: Pt; size: number; petals: number; phase: number; distAlongVine: number }
interface Orb    { pos: Pt; radius: number; phase: number; distAlongVine: number }

interface VineData {
  segments: Seg[];
  branchSegs: Seg[];
  leaves: Leaf[];
  flowers: Flower[];
  orbs: Orb[];
}

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

function genBranch(
  startX: number, startY: number, startAngle: number, segs: number,
  thickness: number, dist: number,
  out: { segments: Seg[]; leaves: Leaf[]; flowers: Flower[]; orbs: Orb[] },
  depth: number,
  side: "left" | "right",
) {
  let x = startX, y = startY, angle = startAngle;
  let d = dist;
  let leafSide: 1 | -1 = 1;

  const spread = 0.083; // straight/upright — same as landing page main page
  const angleMin = -Math.PI * (0.5 + spread);
  const angleMax = -Math.PI * (0.5 - spread);

  for (let i = 0; i < segs; i++) {
    const centerBias = side === "left" ? 0.03 : -0.03;
    angle += (Math.random() - 0.5) * 0.45 + centerBias;
    angle = Math.max(angleMin, Math.min(angleMax, angle));

    const sLen = rand(55, 85);
    const nx = x + Math.cos(angle) * sLen;
    const ny = y + Math.sin(angle) * sLen;
    const cp1: Pt = { x: x + Math.cos(angle)*sLen*0.33 + rand(-18,18), y: y + Math.sin(angle)*sLen*0.33 + rand(-12,12) };
    const cp2: Pt = { x: x + Math.cos(angle)*sLen*0.66 + rand(-18,18), y: y + Math.sin(angle)*sLen*0.66 + rand(-12,12) };

    const seg: Seg = { p0:{x,y}, cp1, cp2, p1:{x:nx,y:ny}, thickness, depth, spawnDist: dist };
    out.segments.push(seg);
    const sl = segLen(seg);
    d += sl;

    leafSide = (leafSide * -1) as 1 | -1;
    const lt = 0.6;
    const lp = bPt(seg.p0, seg.cp1, seg.cp2, seg.p1, lt);
    const la = bTan(seg.p0, seg.cp1, seg.cp2, seg.p1, lt);
    const leafSize = depth === 0 ? rand(18, 32) : rand(12, 22);
    out.leaves.push({ pos:lp, angle: la + leafSide*rand(0.5,1.0), size:leafSize, phase:rand(0,Math.PI*2), distAlongVine:d-sl*0.4 });

    if (Math.random() < 0.5) {
      const lt2 = 0.32;
      const lp2 = bPt(seg.p0, seg.cp1, seg.cp2, seg.p1, lt2);
      const la2 = bTan(seg.p0, seg.cp1, seg.cp2, seg.p1, lt2);
      out.leaves.push({ pos:lp2, angle:la2-leafSide*rand(0.4,0.8), size:depth===0?rand(14,24):rand(10,18), phase:rand(0,Math.PI*2), distAlongVine:d-sl*0.68 });
    }

    if (Math.random() < 0.25) {
      const op = bPt(seg.p0, seg.cp1, seg.cp2, seg.p1, rand(0.3,0.8));
      out.orbs.push({ pos:op, radius:rand(4,7), phase:rand(0,Math.PI*2), distAlongVine:d-sl*0.3 });
    }

    if (i > 1 && Math.random() < 0.18 && out.flowers.length < 20) {
      out.flowers.push({ pos:{x:nx,y:ny}, size:rand(14,22), petals:Math.random()<0.4?4:5, phase:rand(0,Math.PI*2), distAlongVine:d });
    }

    if (depth < 1 && Math.random() < 0.28 && i > 1) {
      const awayDir = side === "left" ? -1 : 1;
      const bAngle = angle + awayDir * rand(0.5, 1.1);
      genBranch(nx, ny, bAngle, Math.floor(rand(3,6)), thickness*0.60, d, out, depth+1, side);
    }

    x = nx; y = ny;
    thickness = Math.max(1.0, thickness - 0.04);
  }
}

function generateVine(startX: number, startY: number, side: "left"|"right", h: number, heightFrac: number): VineData {
  const out = { segments:[] as Seg[], leaves:[] as Leaf[], flowers:[] as Flower[], orbs:[] as Orb[] };
  const baseAngle = -Math.PI/2 + (side==="left" ? 0.05 : -0.05);
  const targetH = h * heightFrac;
  const segs = Math.max(12, Math.ceil(targetH / 50));
  genBranch(startX, startY, baseAngle, segs, 2.2, 0, out, 0, side);
  return {
    segments:   out.segments.filter(s => s.depth === 0),
    branchSegs: out.segments.filter(s => s.depth > 0),
    leaves: out.leaves,
    flowers: out.flowers,
    orbs: out.orbs,
  };
}

/* ── Drawing (identical to FloralVineBackground) ── */
function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

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
  ctx.bezierCurveTo(size*0.22, -size*0.50, size*0.72, -size*0.55, size, -size*0.08);
  ctx.bezierCurveTo(size*0.72,  size*0.38, size*0.22,  size*0.50, 0, 0);
  ctx.fillStyle = C.leafFill;
  ctx.fill();
  ctx.strokeStyle = C.leafStroke;
  ctx.lineWidth = 0.7;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size*0.5, -size*0.09, size*0.88, -size*0.06);
  ctx.strokeStyle = C.leafVein;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.restore();
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, petals: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);

  const pr = size * 0.4;
  for (let i = 0; i < petals; i++) {
    ctx.save();
    ctx.rotate((i / petals) * Math.PI * 2 + rot);
    ctx.beginPath();
    ctx.ellipse(0, -pr*0.7, pr*0.38, pr, 0, 0, Math.PI*2);
    ctx.fillStyle = C.flowerFill;
    ctx.fill();
    ctx.strokeStyle = C.flowerStroke;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, size*0.12, 0, Math.PI*2);
  ctx.fillStyle = C.flowerCenter;
  ctx.fill();
  ctx.restore();
}

function drawOrb(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0,   "rgba(225,185,70,0.88)");
  grad.addColorStop(0.5, "rgba(200,162,80,0.35)");
  grad.addColorStop(1,   "rgba(200,162,80,0)");
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI*2);
  ctx.fillStyle = grad;
  ctx.fill();
}

function strokeStem(ctx: CanvasRenderingContext2D, segs: Seg[], isBranch: boolean) {
  const pts: Pt[] = [];
  for (const seg of segs) {
    const steps = 20;
    const start = pts.length === 0 ? 0 : 1;
    for (let i = start; i <= steps; i++) {
      pts.push(bPt(seg.p0, seg.cp1, seg.cp2, seg.p1, i / steps));
    }
  }
  if (pts.length < 2) return;
  const baseWidth = segs[0].thickness;

  const applyPath = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
  };
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  applyPath(); ctx.lineWidth = baseWidth + 2.5; ctx.strokeStyle = isBranch ? "rgba(140,105,30,0.14)" : "rgba(140,105,30,0.25)"; ctx.stroke();
  applyPath(); ctx.lineWidth = baseWidth;        ctx.strokeStyle = isBranch ? C.branch : C.vine;  ctx.stroke();
  applyPath(); ctx.lineWidth = baseWidth * 0.32; ctx.strokeStyle = "rgba(225,195,160,0.28)";       ctx.stroke();
}

/* ── Component ── */
export function SidebarVine() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const w = parent?.offsetWidth  ?? 256;
    const h = parent?.offsetHeight ?? window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 2 vines: far-left and far-right only
    const vines = [
      generateVine(rand(w*0.02, w*0.06), h+20, "left",  h, 1.0),
      generateVine(rand(w*0.94, w*0.98), h+20, "right", h, 1.0),
    ];

    ctx.clearRect(0, 0, w, h);

    for (const vine of vines) {
      strokeStem(ctx, vine.segments, false);

      const groups = new Map<number, Seg[]>();
      for (const seg of vine.branchSegs) {
        if (!groups.has(seg.spawnDist)) groups.set(seg.spawnDist, []);
        groups.get(seg.spawnDist)!.push(seg);
      }
      for (const segs of groups.values()) strokeStem(ctx, segs, true);

      for (const leaf of vine.leaves)     drawLeaf(ctx,   leaf.pos.x, leaf.pos.y, leaf.angle, leaf.size);
      for (const fl   of vine.flowers)    drawFlower(ctx, fl.pos.x,   fl.pos.y,   fl.size, fl.petals, fl.phase);
      for (const orb  of vine.orbs)       drawOrb(ctx,    orb.pos.x,  orb.pos.y,  orb.radius);
    }
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{ zIndex: -1, opacity: 0.45 }}
    />
  );
}
