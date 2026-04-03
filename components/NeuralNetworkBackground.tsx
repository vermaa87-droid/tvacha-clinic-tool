"use client";

import { useEffect, useRef, useCallback } from "react";

// --- Types ---
interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  baseOpacity: number;
  isAccent: boolean;
  breatheOffset: number;
  flashUntil: number; // timestamp when flash fades
  layer: "input" | "hidden" | "output";
}

interface DataFlow {
  currentNodeIdx: number;
  nextNodeIdx: number;
  progress: number; // 0-1 between current and next
  path: number[]; // indices of nodes to visit
  pathIdx: number;
  active: boolean;
  spawnTime: number;
}

interface PulseRipple {
  sourceIdx: number;
  startTime: number;
  duration: number;
  visitedEdges: Set<string>; // "i-j" strings
  wavefront: number[]; // node indices at current edge
  waveStep: number;
}

// --- Constants ---
const GOLD = { r: 212, g: 168, b: 45 };
const CONNECTION_RADIUS = 180;
const MOUSE_ATTRACT_RADIUS = 120;
const MOUSE_HIGHLIGHT_RADIUS = 150;
const PULSE_INTERVAL = 2500;
const DATA_FLOW_INTERVAL = 6000;
const MAX_DATA_FLOWS = 3;
const BREATHE_PERIOD = 3500;

function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${r},${g},${b},${a})`;
}

function goldRgba(a: number) {
  return rgba(GOLD.r, GOLD.g, GOLD.b, a);
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function NeuralNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });
  const dataFlowsRef = useRef<DataFlow[]>([]);
  const pulsesRef = useRef<PulseRipple[]>([]);
  const lastPulseRef = useRef(0);
  const lastDataFlowRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const reducedMotionRef = useRef(false);
  const isMobileRef = useRef(false);
  const adjacencyRef = useRef<Map<number, number[]>>(new Map());

  // --- Init nodes ---
  const initNodes = useCallback((w: number, h: number) => {
    const isMobile = w < 768;
    isMobileRef.current = isMobile;
    // Scale node count with canvas area so tall pages (like how-it-works) stay dense.
    // Target: avg inter-node spacing < CONNECTION_RADIUS so lines actually form.
    // For good connectivity: count ≈ area / (CONNECTION_RADIUS²) gives ~1 node per radius²
    const area = w * h;
    const count = isMobile
      ? Math.min(Math.floor(area / 9000), 80)
      : Math.min(Math.floor(area / 13000), 250);
    const nodes: Node[] = [];

    for (let i = 0; i < count; i++) {
      // Determine layer with soft distribution
      const xNorm = Math.random();
      let layer: "input" | "hidden" | "output";
      let x: number;

      if (xNorm < 0.18) {
        layer = "input";
        x = Math.random() * w * 0.15;
      } else if (xNorm > 0.85) {
        layer = "output";
        x = w * 0.85 + Math.random() * w * 0.15;
      } else {
        layer = "hidden";
        x = w * 0.12 + Math.random() * w * 0.76;
      }

      const y = Math.random() * h;
      const isAccent = Math.random() < 0.1;
      const sizeRoll = Math.random();
      const radius = sizeRoll < 0.5 ? 1.5 : sizeRoll < 0.85 ? 2.5 : 4;
      const baseOpacity = isAccent ? 0.95 : (Math.random() < 0.5 ? 0.60 : 0.80);

      nodes.push({
        x, y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: layer === "output" ? radius * 1.3 : radius,
        opacity: baseOpacity,
        baseOpacity,
        isAccent,
        breatheOffset: Math.random() * Math.PI * 2,
        flashUntil: 0,
        layer,
      });
    }
    nodesRef.current = nodes;
    sizeRef.current = { w, h };
    rebuildAdjacency();
  }, []);

  const rebuildAdjacency = () => {
    const adj = new Map<number, number[]>();
    const nodes = nodesRef.current;
    for (let i = 0; i < nodes.length; i++) {
      adj.set(i, []);
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = dist(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
        if (d < CONNECTION_RADIUS) {
          adj.get(i)!.push(j);
          adj.get(j)!.push(i);
        }
      }
    }
    adjacencyRef.current = adj;
  };

  // --- Drawing ---
  const draw = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    const nodes = nodesRef.current;
    const mouse = mouseRef.current;
    const reduced = reducedMotionRef.current;
    const isMobile = isMobileRef.current;

    ctx.clearRect(0, 0, w, h);

    // --- Update node positions (floating) ---
    if (!reduced) {
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off boundaries softly
        if (node.x < 0 || node.x > w) { node.vx *= -1; node.x = Math.max(0, Math.min(w, node.x)); }
        if (node.y < 0 || node.y > h) { node.vy *= -1; node.y = Math.max(0, Math.min(h, node.y)); }

        // Gentle random drift
        node.vx += (Math.random() - 0.5) * 0.02;
        node.vy += (Math.random() - 0.5) * 0.02;
        node.vx = Math.max(-0.5, Math.min(0.5, node.vx));
        node.vy = Math.max(-0.5, Math.min(0.5, node.vy));

        // Mouse attraction (desktop only)
        if (mouse.active && !isMobile) {
          const d = dist(node.x, node.y, mouse.x, mouse.y);
          if (d < MOUSE_ATTRACT_RADIUS && d > 5) {
            const force = (1 - d / MOUSE_ATTRACT_RADIUS) * 0.3;
            node.x += (mouse.x - node.x) * force * 0.02;
            node.y += (mouse.y - node.y) * force * 0.02;
          }
        } else {
          // Drift back toward base position very gently
          node.x += (node.baseX - node.x) * 0.001;
          node.y += (node.baseY - node.y) * 0.001;
        }

        // Breathing glow for accent nodes
        if (node.isAccent) {
          const breathe = Math.sin((now / BREATHE_PERIOD) * Math.PI * 2 + node.breatheOffset);
          node.opacity = lerp(0.80, 1.0, (breathe + 1) / 2);
        }

        // Flash decay
        if (node.flashUntil > now) {
          const flashStrength = (node.flashUntil - now) / 400;
          node.opacity = Math.min(1, node.baseOpacity + flashStrength * 0.5);
        }
      }
    }

    // --- Draw connections ---
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = dist(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
        if (d > CONNECTION_RADIUS) continue;

        let alpha = 0.35 * (1 - d / CONNECTION_RADIUS);

        // Mouse highlight
        if (mouse.active && !isMobile) {
          const midX = (nodes[i].x + nodes[j].x) / 2;
          const midY = (nodes[i].y + nodes[j].y) / 2;
          const dMouse = dist(midX, midY, mouse.x, mouse.y);
          if (dMouse < MOUSE_HIGHLIGHT_RADIUS) {
            alpha = Math.max(alpha, 0.2 * (1 - dMouse / MOUSE_HIGHLIGHT_RADIUS));
          }
        }

        // Pulse ripple highlight
        for (const pulse of pulsesRef.current) {
          const key1 = `${i}-${j}`;
          const key2 = `${j}-${i}`;
          if (pulse.visitedEdges.has(key1) || pulse.visitedEdges.has(key2)) {
            const age = (now - pulse.startTime) / pulse.duration;
            const edgeGlow = Math.max(0, 1 - age) * 0.75;
            alpha = Math.max(alpha, edgeGlow);
          }
        }

        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.strokeStyle = goldRgba(alpha);
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    // --- Draw data flows ---
    if (!reduced) {
      for (const flow of dataFlowsRef.current) {
        if (!flow.active) continue;
        const from = nodes[flow.currentNodeIdx];
        const to = nodes[flow.nextNodeIdx];
        if (!from || !to) continue;

        const fx = lerp(from.x, to.x, flow.progress);
        const fy = lerp(from.y, to.y, flow.progress);

        // Draw the traveling dot
        ctx.beginPath();
        ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = goldRgba(0.75);
        ctx.fill();

        // Glow around it
        ctx.beginPath();
        ctx.arc(fx, fy, 6, 0, Math.PI * 2);
        ctx.fillStyle = goldRgba(0.12);
        ctx.fill();

        // Highlight the connection it's traveling on
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = goldRgba(0.3);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Advance
        flow.progress += 0.012;
        if (flow.progress >= 1) {
          // Flash the arrived node
          nodes[flow.nextNodeIdx].flashUntil = now + 300;

          flow.pathIdx++;
          if (flow.pathIdx >= flow.path.length - 1) {
            // Reached output — pulse the final node
            nodes[flow.nextNodeIdx].flashUntil = now + 600;
            flow.active = false;
          } else {
            flow.currentNodeIdx = flow.nextNodeIdx;
            flow.nextNodeIdx = flow.path[flow.pathIdx + 1];
            flow.progress = 0;
          }
        }
      }

      // Clean up dead flows
      dataFlowsRef.current = dataFlowsRef.current.filter(f => f.active);
    }

    // --- Update pulse ripples ---
    if (!reduced) {
      pulsesRef.current = pulsesRef.current.filter(p => now - p.startTime < p.duration);
    }

    // --- Draw nodes ---
    for (const node of nodes) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = goldRgba(node.opacity);
      ctx.fill();
    }

    // --- Trigger periodic pulse ---
    if (!reduced && now - lastPulseRef.current > PULSE_INTERVAL) {
      lastPulseRef.current = now;
      triggerPulse(now);
    }

    // --- Trigger periodic data flow ---
    if (!reduced && now - lastDataFlowRef.current > DATA_FLOW_INTERVAL) {
      lastDataFlowRef.current = now;
      spawnDataFlow(now);
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  // --- Pulse ripple from a random accent node ---
  const triggerPulse = (now: number, fromIdx?: number) => {
    const nodes = nodesRef.current;
    const adj = adjacencyRef.current;

    let srcIdx = fromIdx;
    if (srcIdx === undefined) {
      const accentIndices = nodes.map((n, i) => n.isAccent ? i : -1).filter(i => i >= 0);
      if (accentIndices.length === 0) srcIdx = Math.floor(Math.random() * nodes.length);
      else srcIdx = accentIndices[Math.floor(Math.random() * accentIndices.length)];
    }

    // BFS ripple up to 3 levels
    const visited = new Set<string>();
    let frontier = [srcIdx];
    const allVisited = new Set<number>([srcIdx]);

    for (let depth = 0; depth < 3; depth++) {
      const nextFrontier: number[] = [];
      for (const ni of frontier) {
        const neighbors = adj.get(ni) || [];
        for (const nj of neighbors) {
          if (allVisited.has(nj)) continue;
          allVisited.add(nj);
          nextFrontier.push(nj);
          visited.add(`${ni}-${nj}`);
          nodes[nj].flashUntil = now + 400 - depth * 100;
        }
      }
      frontier = nextFrontier;
    }

    nodes[srcIdx].flashUntil = now + 500;

    pulsesRef.current.push({
      sourceIdx: srcIdx,
      startTime: now,
      duration: 1200,
      visitedEdges: visited,
      wavefront: frontier,
      waveStep: 0,
    });
  };

  // --- Spawn a data flow from input to output ---
  const spawnDataFlow = (_now: number) => {
    if (dataFlowsRef.current.length >= MAX_DATA_FLOWS) return;

    const nodes = nodesRef.current;
    const adj = adjacencyRef.current;

    // Pick a random input node
    const inputNodes = nodes.map((n, i) => n.layer === "input" ? i : -1).filter(i => i >= 0);
    const outputNodes = nodes.map((n, i) => n.layer === "output" ? i : -1).filter(i => i >= 0);

    if (inputNodes.length === 0 || outputNodes.length === 0) return;

    const startIdx = inputNodes[Math.floor(Math.random() * inputNodes.length)];

    // BFS/random walk toward right side
    const path = [startIdx];
    const visited = new Set<number>([startIdx]);
    let current = startIdx;

    for (let step = 0; step < 15; step++) {
      const neighbors = (adj.get(current) || []).filter(n => !visited.has(n));
      if (neighbors.length === 0) break;

      // Prefer rightward movement
      neighbors.sort((a, b) => nodes[b].x - nodes[a].x);
      const pick = neighbors[Math.floor(Math.random() * Math.min(3, neighbors.length))];
      visited.add(pick);
      path.push(pick);
      current = pick;

      // Stop if we reached output layer
      if (nodes[pick].layer === "output") break;
    }

    if (path.length < 3) return;

    dataFlowsRef.current.push({
      currentNodeIdx: path[0],
      nextNodeIdx: path[1],
      progress: 0,
      path,
      pathIdx: 0,
      active: true,
      spawnTime: _now,
    });
  };

  // --- Setup ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check reduced motion
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setupCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = rect.height;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);

      // Re-init or reposition nodes
      const targetCount = isMobileRef.current
        ? Math.min(Math.floor((w * h) / 9000), 80)
        : Math.min(Math.floor((w * h) / 13000), 250);
      if (nodesRef.current.length === 0 || Math.abs(nodesRef.current.length - targetCount) > targetCount * 0.3) {
        // Re-init when canvas is first created, or when the target count differs by >30% (e.g. page grew taller)
        initNodes(w, h);
      } else {
        // Proportionally reposition
        const oldW = sizeRef.current.w || w;
        const oldH = sizeRef.current.h || h;
        for (const node of nodesRef.current) {
          node.x = (node.x / oldW) * w;
          node.y = (node.y / oldH) * h;
          node.baseX = (node.baseX / oldW) * w;
          node.baseY = (node.baseY / oldH) * h;
        }
        sizeRef.current = { w, h };
        rebuildAdjacency();
      }
    };

    setupCanvas();

    // Resize observer
    const ro = new ResizeObserver(() => setupCanvas());
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // Mouse events
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };
    const onMouseLeave = () => {
      mouseRef.current = { ...mouseRef.current, active: false };
    };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Find closest node and trigger ripple
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < nodesRef.current.length; i++) {
        const d = dist(nodesRef.current[i].x, nodesRef.current[i].y, mx, my);
        if (d < closestDist) { closestDist = d; closestIdx = i; }
      }
      triggerPulse(performance.now(), closestIdx);
    };

    // Touch events
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top, active: true };
    };
    const onTouchEnd = () => {
      mouseRef.current = { ...mouseRef.current, active: false };
    };
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < nodesRef.current.length; i++) {
        const d = dist(nodesRef.current[i].x, nodesRef.current[i].y, mx, my);
        if (d < closestDist) { closestDist = d; closestIdx = i; }
      }
      triggerPulse(performance.now(), closestIdx);
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });

    // Start animation
    lastPulseRef.current = performance.now();
    lastDataFlowRef.current = performance.now();
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchstart", onTouchStart);
    };
  }, [draw, initNodes]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "all",
        zIndex: 0,
      }}
    />
  );
}
