import { DemoModalProvider } from "@/components/landing/DemoModalProvider";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { DownloadSection } from "@/components/landing/DownloadSection";
import { AIHighlightsSection } from "@/components/landing/AIHighlightsSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

/**
 * Server component. Composes the marketing landing page from pre-built
 * client islands:
 *
 *   - <DemoModalProvider>  owns the demo-video modal state + MotionConfig
 *   - <LandingNav>         scroll-shadow nav + mobile menu
 *   - <HeroSection>        + friends: existing framer-motion sections
 *   - <CtaSection>         reads openDemo from the provider context
 *
 * Having this page be a server component means the shell HTML ships without
 * the nav/modal JS until the islands hydrate.
 */
// Shared style for below-fold sections: skip rendering until near viewport.
// contain-intrinsic-size gives the browser a placeholder height so the
// scrollbar doesn't jump when sections are first painted.
const belowFold: React.CSSProperties = {
  contentVisibility: "auto",
  containIntrinsicSize: "0 800px",
};

export default function Home() {
  return (
    <DemoModalProvider>
      <main className="min-h-screen">
        <LandingNav />
        <HeroSection />
        <div style={belowFold}><DownloadSection /></div>
        <div style={belowFold}><FeaturesSection /></div>
        <div style={belowFold}><PricingSection /></div>
        <div style={belowFold}><AIHighlightsSection /></div>
        <div style={belowFold}><CtaSection /></div>
        <div style={belowFold}><LandingFooter /></div>
      </main>
    </DemoModalProvider>
  );
}
