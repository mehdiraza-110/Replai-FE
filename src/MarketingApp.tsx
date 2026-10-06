import { Navigate, Route, Routes } from "react-router-dom";
import { SmoothScroll } from "./components/marketing/SmoothScroll";
import { Landing } from "./pages/Landing";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";

export function MarketingApp() {
  return (
    <SmoothScroll>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </SmoothScroll>
  );
}
