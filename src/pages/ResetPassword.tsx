import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { CheckCircle2, Eye, EyeOff, LinkIcon, LockKeyhole, UserRound } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resetPassword, validateResetToken } from "../services/authApi";

type LinkState = "checking" | "valid" | "invalid" | "unreachable";

function getStrength(password: string) {
  const checks = {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const missing: string[] = [];
  if (!checks.length) missing.push("at least 8 characters");
  if (!checks.letter) missing.push("a letter");
  if (!checks.number) missing.push("a number");
  const score = Object.values(checks).filter(Boolean).length + (password.length >= 12 && /[^A-Za-z0-9]/.test(password) ? 1 : 0);
  const label = missing.length > 0 ? `Needs ${missing.join(", ")}` : score >= 4 ? "Strong password" : "Good password";
  return { ok: missing.length === 0 && password.length <= 128, score, label };
}

export function ResetPassword() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [linkState, setLinkState] = useState<LinkState>(token ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const strength = useMemo(() => getStrength(password), [password]);

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

  if (isAuthenticated && !successMessage) {
    return <Navigate replace to="/" />;
  }

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = strength.ok && password === confirm && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError("");
    setIsSubmitting(true);
    try {
      setSuccessMessage(await resetPassword(token, password));
      setPassword("");
      setConfirm("");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "We could not update your password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const linkClass =
    "font-semibold text-accent transition hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const primaryButton = "mt-1 h-9 w-full rounded-full bg-[#0A84FF] text-[14px] font-semibold text-white shadow-none transition hover:bg-[#0077ED]";

  let icon = <UserRound className="size-5" strokeWidth={1.9} />;
  let title = "Choose a new password";
  let subtitle = "Use at least 8 characters with a letter and a number.";
  let body: React.ReactNode = null;

  if (successMessage) {
    icon = <CheckCircle2 className="size-5" strokeWidth={1.9} />;
    title = "Password updated";
    subtitle = successMessage;
    body = (
      <Button className={`${primaryButton} mt-4`} onPress={() => navigate("/login", { replace: true })} type="button">
        Sign in
      </Button>
    );
  } else if (linkState === "checking") {
    subtitle = "Checking your reset link...";
  } else if (linkState === "invalid" || linkState === "unreachable") {
    icon = <LinkIcon className="size-5" strokeWidth={1.9} />;
    title = linkState === "invalid" ? "This link has expired" : "We could not check this link";
    subtitle =
      linkState === "invalid"
        ? "This reset link is invalid or has expired. Request a new one."
        : "We could not reach the server. Please check your connection and reload the page.";
    body =
      linkState === "invalid" ? (
        <Button className={`${primaryButton} mt-4`} onPress={() => navigate("/forgot-password")} type="button">
          Request a new link
        </Button>
      ) : null;
  } else {
    body = (
      <form className="mt-4 flex w-full flex-col gap-2.5" onSubmit={handleSubmit}>
        <label className={error ? "auth-field auth-field--error" : "auth-field"}>
          <LockKeyhole className={error ? "size-4 text-danger" : "size-4 text-muted"} />
          <input
            aria-label="New password"
            autoComplete="new-password"
            maxLength={128}
            placeholder="New password"
            required
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            className="auth-password-toggle"
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </label>

        {password ? (
          <div aria-live="polite">
            <div className="flex gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((step) => (
                <span
                  key={step}
                  className={`h-1 flex-1 rounded-full ${step <= strength.score ? (strength.ok ? "bg-success" : "bg-warning") : "bg-surface-tertiary"}`}
                />
              ))}
            </div>
            <p className={`mt-1 text-[12px] leading-4 ${strength.ok ? "text-success" : "text-muted"}`}>{strength.label}</p>
          </div>
        ) : null}

        <label className={mismatch ? "auth-field auth-field--error" : "auth-field"}>
          <LockKeyhole className={mismatch ? "size-4 text-danger" : "size-4 text-muted"} />
          <input
            aria-label="Confirm new password"
            autoComplete="new-password"
            maxLength={128}
            placeholder="Confirm new password"
            required
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>
        {mismatch ? <p className="text-[12px] leading-4 text-danger">Passwords do not match.</p> : null}

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <Button className={primaryButton} isDisabled={!canSubmit} type="submit">
          {isSubmitting ? "Please wait..." : "Update password"}
        </Button>
      </form>
    );
  }

  return (
    <main className="auth-screen min-h-screen bg-background px-4 py-6 text-foreground">
      <section className="auth-panel mx-auto flex w-full max-w-[334px] flex-col items-center border border-border/70 bg-surface px-5 pb-5 pt-7">
        <div className="mb-3 grid size-10 place-items-center rounded-full bg-surface-secondary text-foreground">{icon}</div>
        <h1 className="text-center text-[15px] font-semibold leading-5 tracking-normal text-foreground">{title}</h1>
        <p className="mt-4 max-w-[260px] text-center text-[15px] leading-5 text-muted" role={linkState === "checking" ? "status" : undefined}>
          {subtitle}
        </p>
        {body}
        {!successMessage ? (
          <p className="mt-4 text-center text-[13px] leading-5 text-muted">
            <Link className={linkClass} to="/login">
              Back to log in
            </Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
