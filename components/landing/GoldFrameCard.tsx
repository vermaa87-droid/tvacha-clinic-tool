"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function GoldFrameCard({ children, className = "", style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setAnimating(true);
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !visible) return;
    const onEnd = (ev: TransitionEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target?.classList?.contains("frame-line--left")) {
        setAnimating(false);
      }
    };
    el.addEventListener("transitionend", onEnd);
    return () => el.removeEventListener("transitionend", onEnd);
  }, [visible]);

  const classes = [
    "gold-frame-card",
    visible ? "is-visible" : "",
    animating ? "is-animating" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={classes} style={style}>
      <span className="frame-line frame-line--top" aria-hidden />
      <span className="frame-line frame-line--right" aria-hidden />
      <span className="frame-line frame-line--bottom" aria-hidden />
      <span className="frame-line frame-line--left" aria-hidden />
      {children}
    </div>
  );
}
