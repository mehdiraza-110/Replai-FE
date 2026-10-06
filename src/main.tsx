import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { MarketingApp } from "./MarketingApp";
import { AuthProvider } from "./context/AuthContext";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./styles.css";

const isAppRoute = window.location.pathname === "/app" || window.location.pathname.startsWith("/app/");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isAppRoute ? (
      <AuthProvider>
        <BrowserRouter basename="/app">
          <App />
        </BrowserRouter>
      </AuthProvider>
    ) : (
      <BrowserRouter>
        <MarketingApp />
      </BrowserRouter>
    )}
  </StrictMode>,
);
