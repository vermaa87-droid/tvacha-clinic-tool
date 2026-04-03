"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Only enable Lenis on desktop, non-dashboard pages
    if (pathname.startsWith("/dashboard")) return;

    // Disable on mobile/touch — native scroll is faster and smoother
    const isTouch = window.matchMedia("(hover: none)").matches || window.innerWidth < 768;
    if (isTouch) return;

    let lenis: Lenis | null = null;
    let animFrame: number;

    const createLenis = () => {
      if (lenis) {
        cancelAnimationFrame(animFrame);
        lenis.destroy();
      }
      lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
      function raf(time: number) {
        lenis!.raf(time);
        animFrame = requestAnimationFrame(raf);
      }
      animFrame = requestAnimationFrame(raf);
    };

    createLenis();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        createLenis();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelAnimationFrame(animFrame);
      if (lenis) lenis.destroy();
    };
  }, [pathname]);

  return <>{children}</>;
}
