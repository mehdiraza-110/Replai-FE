import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";
import { SESSION_EXPIRED_NOTICE_KEY, useAuth } from "../../context/AuthContext";
import { requestPasswordReset, resetPassword, validateResetToken } from "../../services/authApi";
import { svPath } from "../nav";
import { AuthAlt, AuthField, AuthLayout, AuthMessage } from "./AuthLayout";

const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

export function SignInPage() {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [expired] = useState(() => {
    try {
      const flag = window.sessionStorage.getItem(SESSION_EXPIRED_NOTICE_KEY) === "1";
      window.sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
      return flag;
    } catch {
      return false;
    }
  });

  if (isAuthenticated) {
    const from = typeof location.state?.from === "string" && location.state.from.startsWith(svPath("")) ? location.state.from : svPath("dashboard");
    return <Navigate replace to={from} />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login({ email: email.trim(), password });
    } catch (caught) {
      setError(errorText(caught, "We couldn't sign you in. Check your details and try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Sign in to SendVybe" termsLead="By logging in">
      <form className="sv-auth-form" onSubmit={submit}>
        {expired && !error ? <AuthMessage tone="notice">Your session has expired. Please sign in again.</AuthMessage> : null}
        <AuthField icon={Mail} label="Email address" type="email" autoComplete="email" required invalid={Boolean(error)} value={email} onChange={(event) => setEmail(event.target.value)} />
        <AuthField icon={Lock} label="Password" type="password" autoComplete="current-password" required invalid={Boolean(error)} value={password} onChange={(event) => setPassword(event.target.value)} />
        <Link className="sv-auth-forgot" to={svPath("auth/forgot-password")}>
          Forgot password?
        </Link>
        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        <button className="sv-auth-submit" type="submit" disabled={!email.trim() || !password || busy}>
          {busy ? "Please wait…" : "Log in"}
        </button>
      </form>
      <AuthAlt lead="Don't have an account?" to={svPath("auth/sign-up")} action="Sign up" />
    </AuthLayout>
  );
}

export function SignUpPage() {
  const { isAuthenticated, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate replace to={svPath("dashboard")} />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register({ fullName: name.trim(), email: email.trim(), password });
    } catch (caught) {
      setError(errorText(caught, "We couldn't create your account. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Create an account" termsLead="By signing up">
      <form className="sv-auth-form" onSubmit={submit}>
        <AuthField icon={User} label="Name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
        <AuthField icon={Mail} label="Email address" type="email" autoComplete="email" required invalid={Boolean(error)} value={email} onChange={(event) => setEmail(event.target.value)} />
        <AuthField icon={Lock} label="Password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        <button className="sv-auth-submit" type="submit" disabled={!name.trim() || !email.trim() || password.length < 8 || busy}>
          {busy ? "Please wait…" : "Sign up"}
        </button>
      </form>
      <AuthAlt lead="Already have an account?" to={svPath("auth/sign-in")} action="Sign in" />
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate replace to={svPath("dashboard")} />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      setSent(await requestPasswordReset(email));
    } catch (caught) {
      setError(errorText(caught, "We couldn't send the reset link. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we'll send you a secure reset link.">
      <form className="sv-auth-form" style={{ marginTop: 32 }} onSubmit={submit}>
        {sent ? <AuthMessage tone="ok">{sent}</AuthMessage> : null}
        <AuthField icon={Mail} label="Email address" type="email" autoComplete="email" required invalid={Boolean(error)} value={email} onChange={(event) => setEmail(event.target.value)} />
        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        <button className="sv-auth-submit" type="submit" disabled={!email.trim() || busy}>
          {busy ? "Please wait…" : sent ? "Send again" : "Send reset link"}
        </button>
      </form>
      <AuthAlt lead="Remembered your password?" to={svPath("auth/sign-in")} action="Sign in" />
    </AuthLayout>
  );
}

function passwordStrength(password: string) {
  const missing: string[] = [];
  if (password.length < 8) missing.push("at least 8 characters");
  if (!/[A-Za-z]/.test(password)) missing.push("a letter");
  if (!/[0-9]/.test(password)) missing.push("a number");
  const strong = password.length >= 12 && /[^A-Za-z0-9]/.test(password);
  return {
    ok: missing.length === 0 && password.length <= 128,
    label: missing.length > 0 ? `Needs ${missing.join(", ")}` : strong ? "Strong password" : "Good password",
  };
}

type LinkState = "checking" | "valid" | "invalid" | "unreachable";

export function ResetPasswordPage() {
  const { isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [linkState, setLinkState] = useState<LinkState>(token ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const strength = useMemo(() => passwordStrength(password), [password]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLinkState("checking");
    validateResetToken(token)
      .then((valid) => !cancelled && setLinkState(valid ? "valid" : "invalid"))
      .catch(() => !cancelled && setLinkState("unreachable"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (isAuthenticated && !done) return <Navigate replace to={svPath("dashboard")} />;

  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!strength.ok || password !== confirm) return;
    setError("");
    setBusy(true);
    try {
      setDone(await resetPassword(token, password));
      setPassword("");
      setConfirm("");
    } catch (caught) {
      setError(errorText(caught, "We couldn't update your password. Try again."));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle={done}>
        <div className="sv-auth-form" style={{ marginTop: 32 }}>
          <Link className="sv-auth-submit" style={{ display: "grid", placeItems: "center", marginTop: 0 }} to={svPath("auth/sign-in")}>
            Sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (linkState === "checking") {
    return <AuthLayout title="Choose a new password" subtitle="Checking your reset link…">{null}</AuthLayout>;
  }

  if (linkState !== "valid") {
    const expiredLink = linkState === "invalid";
    return (
      <AuthLayout
        title={expiredLink ? "This link has expired" : "We couldn't check this link"}
        subtitle={expiredLink ? "This reset link is invalid or has expired. Request a new one." : "We couldn't reach the server. Check your connection and reload the page."}
      >
        {expiredLink ? (
          <div className="sv-auth-form" style={{ marginTop: 32 }}>
            <Link className="sv-auth-submit" style={{ display: "grid", placeItems: "center", marginTop: 0 }} to={svPath("auth/forgot-password")}>
              Request a new link
            </Link>
          </div>
        ) : null}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Use at least 8 characters with a letter and a number.">
      <form className="sv-auth-form" style={{ marginTop: 32 }} onSubmit={submit}>
        <AuthField icon={Lock} label="New password" type="password" autoComplete="new-password" maxLength={128} required invalid={Boolean(error)} value={password} onChange={(event) => setPassword(event.target.value)} />
        {password ? <p className="sv-auth-strength">{strength.label}</p> : null}
        <AuthField icon={Lock} label="Confirm password" type="password" autoComplete="new-password" maxLength={128} required invalid={mismatch} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        {mismatch ? <AuthMessage tone="error">Passwords don't match.</AuthMessage> : null}
        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        <button className="sv-auth-submit" type="submit" disabled={!strength.ok || password !== confirm || busy}>
          {busy ? "Please wait…" : "Update password"}
        </button>
      </form>
    </AuthLayout>
  );
}
