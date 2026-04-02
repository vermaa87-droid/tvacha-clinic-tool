"use client";

import { useEffect, useRef, useState } from "react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Disable entirely on touch devices / small screens
    const isTouch = window.matchMedia("(hover: none)").matches || window.innerWidth < 768;
    if (isTouch) return;

    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      if (!visible) setVisible(true);
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    // Event delegation instead of MutationObserver — no per-element listeners
    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, .card, [data-cursor]")) {
        setHovered(true);
      }
    };
    const onOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, .card, [data-cursor]")) {
        setHovered(false);
      }
    };
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });

    let raf: number;
    const lerp = 0.35;
    const loop = () => {
      current.current.x += (mouse.current.x - current.current.x) * lerp;
      current.current.y += (mouse.current.y - current.current.y) * lerp;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      cancelAnimationFrame(raf);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={cursorRef}
      className="custom-cursor hidden md:block"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: hovered ? 40 : 8,
        height: hovered ? 40 : 8,
        marginLeft: hovered ? -20 : -4,
        marginTop: hovered ? -20 : -4,
        borderRadius: "50%",
        background: hovered ? "transparent" : "#b8936a",
        border: hovered ? "1.5px solid #b8936a" : "none",
        pointerEvents: "none",
        zIndex: 9999,
        mixBlendMode: "multiply",
        willChange: "transform",
        transition: "width 0.15s, height 0.15s, margin 0.15s, background 0.15s, border 0.15s",
      }}
    />
  );
}
