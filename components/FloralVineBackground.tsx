"use client";

// Video-based vine background. Replaces the earlier canvas simulation that
// tanked FPS on weak GPUs during the 4s sprawl phase.
//
// Sprawl is a pre-rendered WebM (alpha) / MP4 (baked bg) captured from the
// canvas version via scripts/record-vine-video.mjs. After the video ends, it
// crossfades to a static PNG of the final frame and the <video> is unmounted
// to free the decoder.
//
// Variants:
//   / (landing home)           → straight vines
//   /pricing, /privacy, /terms → curvy vines (original canvas behavior)

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme-context";

const CROSSFADE_MS = 300;

export function FloralVineBackground() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sprawlDone, setSprawlDone] = useState(false);
  const [videoMounted, setVideoMounted] = useState(true);

  useEffect(() => {
    setMounted(true);
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(rm.matches);
    setIsMobile(window.innerWidth < 768);
    const onRm = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => setIsMobile(window.innerWidth < 768), 200);
    };
    rm.addEventListener("change", onRm);
    window.addEventListener("resize", onResize);
    return () => {
      rm.removeEventListener("change", onRm);
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  if (
    pathname.startsWith("/dashboard") ||
    pathname === "/how-it-works" ||
    pathname === "/login" ||
    pathname === "/signup"
  ) {
    return null;
  }

  if (!mounted) return null;

  const variant = pathname === "/" ? "straight" : "curvy";
  const webm = `/vine-sprawl-${variant}.webm`;
  const mp4 = theme === "dark"
    ? `/vine-sprawl-${variant}-dark.mp4`
    : `/vine-sprawl-${variant}.mp4`;
  const poster = `/vine-poster-${variant}.png`;

  const container: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    overflow: "hidden",
  };
  const layer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: `opacity ${CROSSFADE_MS}ms ease-out`,
  };

  if (reducedMotion || isMobile) {
    return (
      <div aria-hidden style={container}>
        <img src={poster} alt="" style={{ ...layer, opacity: 1, transition: undefined }} />
      </div>
    );
  }

  const onSprawlEnd = () => {
    setSprawlDone(true);
    setTimeout(() => setVideoMounted(false), CROSSFADE_MS + 50);
  };

  return (
    <div aria-hidden style={container}>
      <img
        src={poster}
        alt=""
        style={{ ...layer, opacity: sprawlDone ? 1 : 0 }}
      />
      {videoMounted && (
        <video
          key={`${variant}-${theme}`}
          autoPlay
          muted
          playsInline
          preload="auto"
          poster={poster}
          onEnded={onSprawlEnd}
          style={{ ...layer, opacity: sprawlDone ? 0 : 1 }}
        >
          <source src={webm} type="video/webm" />
          <source src={mp4} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
