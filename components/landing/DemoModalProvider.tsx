"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { MotionConfig } from "framer-motion";
import { X } from "lucide-react";
import { useIsMobile } from "@/lib/use-mobile";

/**
 * Client island that owns:
 *   - the demo-video modal state (+ modal rendered via portal)
 *   - MotionConfig so framer-motion sections inside the marketing pages can
 *     honour the reduced-motion preference on mobile
 *   - a context so the Hero's Play button and the CTA section can both open
 *     the modal without prop-drilling
 *
 * Wrapping the landing page in this provider is what lets app/(marketing)/page.tsx
 * stay a server component.
 */
const DemoModalContext = createContext<{ openDemo: () => void }>({
  openDemo: () => {},
});

export function useDemoModal() {
  return useContext(DemoModalContext);
}

export function DemoModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const openDemo = useCallback(() => setOpen(true), []);

  return (
    <DemoModalContext.Provider value={{ openDemo }}>
      <MotionConfig reducedMotion={isMobile ? "always" : "never"}>
        {children}
      </MotionConfig>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                background: "rgba(0,0,0,0.88)",
              }}
              onClick={() => setOpen(false)}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 800,
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "#000",
                  border: "1px solid rgba(184,147,106,0.3)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    zIndex: 10,
                    padding: 8,
                    borderRadius: 9999,
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                  }}
                >
                  <X size={20} />
                </button>
                <div style={{ aspectRatio: "16/9", width: "100%", background: "#000" }}>
                  <video
                    controls
                    autoPlay
                    muted
                    playsInline
                    style={{ width: "100%", height: "100%" }}
                    src="https://hvqeeokspruhbqdbrswg.supabase.co/storage/v1/object/public/assets/demo-video.mp4"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      const fallback = document.createElement("div");
                      fallback.style.cssText =
                        "display:flex;align-items:center;justify-content:center;height:100%;color:#b8936a;font-size:16px;font-family:Outfit,sans-serif;text-align:center;padding:20px";
                      fallback.textContent =
                        "Demo video loading failed. Please try again later.";
                      el.parentElement?.appendChild(fallback);
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </DemoModalContext.Provider>
  );
}
