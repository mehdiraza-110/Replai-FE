import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { footerNav, mainNav } from "../nav";
import { Badge } from "../ui";
import "../sv.css";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg className="sv-auth-logo" width={size} height={(size * 28) / 32} viewBox="0 0 32 28" fill="none" aria-hidden>
      <path d="M4 5 16 23 28 5" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="4.5" r="3" fill="currentColor" />
    </svg>
  );
}

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  icon: LucideIcon;
  label: string;
  type?: "text" | "email" | "password";
  invalid?: boolean;
}

/** Icon-prefixed input. Password fields get a show/hide toggle. */
export function AuthField({ icon: Icon, label, type = "text", invalid, ...rest }: AuthFieldProps) {
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";

  return (
    <label className={`sv-auth-field${invalid ? " has-error" : ""}`}>
      <Icon className="sv-icon" aria-hidden />
      <input aria-label={label} placeholder={label} type={isPassword && shown ? "text" : type} aria-invalid={invalid || undefined} {...rest} />
      {isPassword ? (
        <button type="button" className="sv-eye" aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown} onClick={() => setShown((current) => !current)}>
          {shown ? <EyeOff className="sv-icon" aria-hidden /> : <Eye className="sv-icon" aria-hidden />}
        </button>
      ) : null}
    </label>
  );
}

export function AuthMessage({ tone, children }: { tone: "error" | "notice" | "ok"; children: ReactNode }) {
  return (
    <p className={`sv-auth-msg is-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function AuthAlt({ lead, to, action }: { lead: string; to: string; action: string }) {
  return (
    <p className="sv-auth-alt">
      {lead}
      <Link to={to}>{action}</Link>
    </p>
  );
}

const sampleThreads = [
  { name: "Jordan Lee", subject: "Re: quick question about hiring", time: "12m", tone: "green" as const, tag: "Meeting Booked", interest: "Very High Interest" },
  { name: "Priya Shah", subject: "Re: staffing for Q4", time: "1h", tone: "blue" as const, tag: "Replied", interest: "Medium Interest" },
  { name: "Sam Rivera", subject: "Automatic reply: out of office", time: "2h", tone: "neutral" as const, tag: "Out of Office", interest: "" },
  { name: "Dana Whitfield", subject: "Re: follow-up 1", time: "3h", tone: "orange" as const, tag: "Escalated", interest: "Low Interest" },
];

function AppPreview() {
  const items = [...mainNav.flatMap((group) => group.items), ...footerNav].slice(0, 7);
  return (
    <div className="sv-mock" aria-hidden>
      <div className="sv-mock-side">
        <div className="sv-account">
          <span className="sv-avatar">Y</span>
          <span className="sv-account-name">Your company</span>
        </div>
        {items.map((item, index) => (
          <div key={item.to} className={`sv-nav-item${index === 3 ? " is-active" : ""}`}>
            <item.icon className="sv-icon" />
            <span className="sv-nav-label">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="sv-mock-main">
        <h3 className="sv-h1" style={{ fontSize: 20, lineHeight: "28px", marginBottom: 8 }}>
          AI SDR Inbox
        </h3>
        {sampleThreads.map((thread) => (
          <div key={thread.name} className="sv-mock-row">
            <div className="sv-mock-row-top">
              <span>{thread.name}</span>
              <span>{thread.time} ago</span>
            </div>
            <p>{thread.subject}</p>
            <div className="sv-mock-badges">
              <Badge tone={thread.tone}>{thread.tag}</Badge>
              {thread.interest ? <Badge tone={thread.interest.startsWith("Very") ? "green" : "yellow"}>{thread.interest}</Badge> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard() {
  return (
    <div className="sv-feature">
      <h2>Every reply answered. Every meeting booked.</h2>
      <ul>
        <li>Cold email campaigns on your own warmed-up inboxes</li>
        <li>An AI SDR that reads replies and writes back in your voice</li>
        <li>Meetings land straight on your calendar</li>
      </ul>
    </div>
  );
}

/** Right-hand panel: slowly cross-fades between a product preview and a short value statement. */
export function AuthShowcase() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % 2), 7000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <aside className="sv-auth-aside" aria-hidden>
      <div className={`sv-slide${slide === 0 ? " is-active" : ""}`}>
        <AppPreview />
      </div>
      <div className={`sv-slide${slide === 1 ? " is-active" : ""}`}>
        <FeatureCard />
      </div>
    </aside>
  );
}

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  /** Text before "Terms of Use" in the footer, e.g. "By logging in". Omit to hide the footer. */
  termsLead?: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, termsLead, children }: AuthLayoutProps) {
  return (
    <div className="sv-root sv-force-light sv-auth">
      <main className="sv-auth-left">
        <div className="sv-auth-card">
          <Logo />
          <h1 className="sv-auth-title">{title}</h1>
          {subtitle ? <p className="sv-auth-sub">{subtitle}</p> : null}
          {children}
        </div>
        {termsLead ? (
          <p className="sv-auth-terms">
            {termsLead}, you agree to the{" "}
            <a href="/terms" target="_blank" rel="noreferrer">
              Terms of Use
            </a>{" "}
            and the{" "}
            <a href="/privacy" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            .
          </p>
        ) : null}
      </main>
      <AuthShowcase />
    </div>
  );
}
