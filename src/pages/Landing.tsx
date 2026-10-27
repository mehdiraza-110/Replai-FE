import { MotionConfig } from "motion/react";
import { AnnouncementBar } from "../components/marketing/AnnouncementBar";
import { Examples } from "../components/marketing/Examples";
import { FinalCta } from "../components/marketing/FinalCta";
import { Hero } from "../components/marketing/Hero";
import { HowItWorks } from "../components/marketing/HowItWorks";
import { IntegrationStrip } from "../components/marketing/IntegrationStrip";
import { MarketingFooter } from "../components/marketing/MarketingFooter";
import { MarketingNav } from "../components/marketing/MarketingNav";
import { Products } from "../components/marketing/Products";
import { TrustSection } from "../components/marketing/TrustSection";
import { useTheme } from "../hooks/useTheme";
import "../marketing.css";

export function Landing() {
  // Same store as the app's toggle (key "sendvybe.theme"), so both stay in sync.
  const { theme, setPreference } = useTheme();
  const toggleTheme = () => setPreference(theme === "dark" ? "light" : "dark");

  return (
    <MotionConfig reducedMotion="user">
      <div className="mkt min-h-screen" data-theme={theme}>
        <AnnouncementBar onToggleTheme={toggleTheme} theme={theme} />
        <MarketingNav onToggleTheme={toggleTheme} theme={theme} />
        <main>
          <Hero />
          <IntegrationStrip />
          <Products />
          <Examples />
          <HowItWorks />
          <TrustSection />
          <FinalCta theme={theme} />
        </main>
        <MarketingFooter />
      </div>
    </MotionConfig>
  );
}
