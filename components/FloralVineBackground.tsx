"use client";

// Video-based vine background. Replaces the earlier canvas simulation that
// tanked FPS on weak GPUs during the 4s sprawl phase.
//
// Sequence: sprawl video plays once (pre-rendered WebM alpha / MP4 baked-bg),
// then crossfades to a looping sway video (gentle pendulum motion, seamless
// 4s loop). Both videos are captured via scripts/record-vine-video.mjs.
//
// Variants:
//   / (landing home)           → straight vines
//   /pricing, /privacy, /terms → curvy vines

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme-context";

const CROSSFADE_MS = 400;
// Sway was recorded at a 4s period; slow the playback so it feels gentler.
// Effective period = 4s / SWAY_PLAYBACK_RATE (0.35 → ~11.4s per cycle).
const SWAY_PLAYBACK_RATE = 0.35;

export function FloralVineBackground() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sprawlDone, setSprawlDone] = useState(false);
  const [sprawlMounted, setSprawlMounted] = useState(true);

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

  const baseVariant = pathname === "/" ? "straight" : "curvy";
  // Mobile gets a portrait-recorded variant (vines repositioned for narrow
  // viewports — the landscape files would crop the edge vines out entirely).
  const variant = isMobile ? `${baseVariant}-mobile` : baseVariant;
  const isDark = theme === "dark";

  const sprawlWebm = `/vine-sprawl-${variant}.webm`;
  const sprawlMp4 = isDark
    ? `/vine-sprawl-${variant}-dark.mp4`
    : `/vine-sprawl-${variant}.mp4`;
  const swayWebm = `/vine-sway-${variant}.webm`;
  const swayMp4 = isDark
    ? `/vine-sway-${variant}-dark.mp4`
    : `/vine-sway-${variant}.mp4`;
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

  if (reducedMotion) {
    return (
      <div aria-hidden style={container}>
        <img src={poster} alt="" style={{ ...layer, opacity: 1, transition: undefined }} />
      </div>
    );
  }

  const onSprawlEnd = () => {
    setSprawlDone(true);
    // Unmount sprawl video after crossfade completes to free the decoder.
    setTimeout(() => setSprawlMounted(false), CROSSFADE_MS + 50);
  };

  return (
    <div aria-hidden style={container}>
      {/* Sway (looping) — preloaded under sprawl, fades in when sprawl ends */}
      <video
        key={`sway-${variant}-${isDark ? "dark" : "light"}`}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        onLoadedMetadata={(e) => {
          (e.currentTarget as HTMLVideoElement).playbackRate = SWAY_PLAYBACK_RATE;
        }}
        style={{ ...layer, opacity: sprawlDone ? 1 : 0 }}
      >
        <source src={swayWebm} type="video/webm" />
        <source src={swayMp4} type="video/mp4" />
      </video>
      {/* Sprawl — plays once, then unmounts */}
      {sprawlMounted && (
        <video
          key={`sprawl-${variant}-${isDark ? "dark" : "light"}`}
          autoPlay
          muted
          playsInline
          preload="auto"
          poster={poster}
          onEnded={onSprawlEnd}
          style={{ ...layer, opacity: sprawlDone ? 0 : 1 }}
        >
          <source src={sprawlWebm} type="video/webm" />
          <source src={sprawlMp4} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
