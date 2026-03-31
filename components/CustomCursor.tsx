"use client";

import { useEffect, useRef, useState } from "react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      if (!visible) setVisible(true);
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const handleEnter = () => setHovered(true);
    const handleLeave = () => setHovered(false);

    const attachListeners = () => {
      const els = document.querySelectorAll("a, button, .card, [data-cursor]");
      els.forEach((el) => {
        el.addEventListener("mouseenter", handleEnter);
        el.addEventListener("mouseleave", handleLeave);
      });
    };

    attachListeners();
    const observer = new MutationObserver(attachListeners);
    observer.observe(document.body, { childList: true, subtree: true });

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
      observer.disconnect();
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
