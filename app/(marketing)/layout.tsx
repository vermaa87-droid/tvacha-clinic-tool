import { SmoothScroll } from "@/components/SmoothScroll";
import { CustomCursor } from "@/components/CustomCursor";
import { FloralVineBackground } from "@/components/FloralVineBackground";

/**
 * Layout for the public/marketing routes (landing, pricing, privacy, terms,
 * how-it-works). Hosts the decorative chrome that used to live in the root
 * layout so the dashboard doesn't pay the JS/runtime cost of Lenis, the canvas
 * vine background, or the custom cursor.
 *
 * Providers (Theme, Language, Auth) are inherited from the root layout.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScroll>
      <FloralVineBackground />
      <CustomCursor />
      <div style={{ position: "relative", zIndex: 1, zoom: 1.25 }}>{children}</div>
    </SmoothScroll>
  );
}
