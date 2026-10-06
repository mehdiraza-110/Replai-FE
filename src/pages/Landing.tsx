import { FeatureBento } from "../components/marketing/FeatureBento";
import { FinalCta } from "../components/marketing/FinalCta";
import { Hero } from "../components/marketing/Hero";
import { HowItWorks } from "../components/marketing/HowItWorks";
import { IntegrationStrip } from "../components/marketing/IntegrationStrip";
import { MarketingFooter } from "../components/marketing/MarketingFooter";
import { MarketingNav } from "../components/marketing/MarketingNav";
import { TrustSection } from "../components/marketing/TrustSection";
import "../marketing.css";

export function Landing() {
  return (
    <div className="mkt min-h-screen">
      <MarketingNav />
      <main>
        <Hero />
        <IntegrationStrip />
        <HowItWorks />
        <FeatureBento />
        <TrustSection />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
