import { FinalCta } from "../components/marketing/FinalCta";
import { Hero } from "../components/marketing/Hero";
import { Ledger } from "../components/marketing/Ledger";
import { MarketingFooter } from "../components/marketing/MarketingFooter";
import { MarketingNav } from "../components/marketing/MarketingNav";
import { Outcomes } from "../components/marketing/Outcomes";
import { Pipeline } from "../components/marketing/Pipeline";
import { Security } from "../components/marketing/Security";
import { useTheme } from "../hooks/useTheme";
import "../marketing.css";

export function Landing() {
  // Same store as the app's toggle (key "sendvybe.theme"), so both stay in sync.
  const { theme, setPreference } = useTheme();
  const toggleTheme = () => setPreference(theme === "dark" ? "light" : "dark");

  return (
    <div className="mkt min-h-screen" data-theme={theme}>
      <MarketingNav onToggleTheme={toggleTheme} theme={theme} />
      <main>
        <Hero />
        <Outcomes />
        <Pipeline />
        <Ledger />
        <Security />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
