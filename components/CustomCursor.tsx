"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-context";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

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

  // Outer div: static size, will-change:transform for the RAF translate loop.
  // Inner div: scale toggle for hover — transform is composited, no layout change.
  // Previously width/height/margin were toggled on hover → layout thrash every hover.
  return (
    <div
      ref={cursorRef}
      className="hidden md:block"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        marginLeft: -20,
        marginTop: -20,
        pointerEvents: "none",
        zIndex: 9999,
        willChange: "transform",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: hovered ? "transparent" : "#b8936a",
          border: hovered ? "1.5px solid #b8936a" : "none",
          transform: `scale(${hovered ? 1 : 0.2})`,
          transition: "transform 0.15s, background 0.15s, border 0.15s",
          mixBlendMode: isDark ? "screen" : "multiply",
        }}
      />
    </div>
  );
}
