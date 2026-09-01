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
