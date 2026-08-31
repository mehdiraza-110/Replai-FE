import { FormEvent, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound, X } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type AuthMode = "login" | "signup";

export function Auth() {
  const { isAuthenticated, login, register } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasError = Boolean(error);

  const copy = useMemo(
    () =>
      mode === "login"
        ? {
            title: "Welcome back",
            subtitle: "Log in with your work email and password.",
            button: "Log In",
            toggleLead: "Don't have an account?",
            toggleAction: "Sign up!",
          }
        : {
            title: "Create an account",
            subtitle: "Use your work email and a secure password.",
            button: "Sign Up",
            toggleLead: "Already have an account?",
            toggleAction: "Log in!",
          },
    [mode],
  );

  if (isAuthenticated) {
    const destination = typeof location.state?.from === "string" ? location.state.from : "/";
    return <Navigate replace to={destination} />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login({ email: email.trim(), password });
      } else {
        await register({ fullName, email: email.trim(), password });
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode() {
    setMode((current) => (current === "login" ? "signup" : "login"));
    setError("");
  }

  function resetForm() {
    setFullName("");
    setEmail("");
    setPassword("");
    setError("");
  }

  function handleGoogleSignIn() {
    setError("Google Sign-In is not connected yet. Use email and password for now.");
  }

  return (
    <main className="auth-screen min-h-screen bg-[#F2F3F5] px-4 py-6 text-foreground">
      <section className="auth-panel mx-auto flex w-full max-w-[334px] flex-col items-center border border-border/70 bg-surface px-5 pb-5 pt-7">
        <button
          className="absolute right-3 top-3 grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          type="button"
          aria-label="Clear auth form"
          onClick={resetForm}
        >
          <X className="size-5" strokeWidth={2.2} />
        </button>

        <div className="mb-3 grid size-10 place-items-center rounded-full bg-[#F0F1F3] text-foreground">
          <UserRound className="size-5" strokeWidth={1.9} />
        </div>

        <h1 className="text-center text-[15px] font-semibold leading-5 tracking-normal text-[#111318]">{copy.title}</h1>
        <p className="mt-4 max-w-[240px] text-center text-[15px] leading-5 text-[#5D6675]">{copy.subtitle}</p>

        <form className="mt-4 flex w-full flex-col gap-2.5" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <label className="auth-field">
              <UserRound className="size-4 text-muted" />
              <input
                autoComplete="name"
                placeholder="Full name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
          ) : null}

          <label className={hasError ? "auth-field auth-field--error" : "auth-field"}>
            <Mail className={hasError ? "size-4 text-[#D92D20]" : "size-4 text-muted"} />
            <input
              autoComplete="email"
              placeholder="Email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className={hasError ? "auth-field auth-field--error" : "auth-field"}>
            <LockKeyhole className={hasError ? "size-4 text-[#D92D20]" : "size-4 text-muted"} />
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              placeholder="Password"
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

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            className="mt-1 h-9 w-full rounded-full bg-[#0A84FF] text-[14px] font-semibold text-white shadow-none transition hover:bg-[#0077ED]"
            isDisabled={!email.trim() || !password || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Please wait..." : copy.button}
          </Button>
        </form>

        <div className="my-4 flex w-full items-center gap-3 text-[11px] font-medium text-[#6B7280]">
          <span className="h-px flex-1 bg-separator" />
          <span>OR</span>
          <span className="h-px flex-1 bg-separator" />
        </div>

        <button
          className="auth-social-button"
          type="button"
          onClick={handleGoogleSignIn}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="mt-4 text-center text-[13px] leading-5 text-[#5D6675]">
          {copy.toggleLead}{" "}
          <button
            className="font-semibold text-[#0A66CC] transition hover:text-[#004A99] focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            type="button"
            onClick={switchMode}
          >
            {copy.toggleAction}
          </button>
        </p>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
