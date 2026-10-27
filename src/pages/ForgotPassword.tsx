import { FormEvent, useState } from "react";
import { Button } from "@heroui/react";
import { Mail, MailCheck, UserRound } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { requestPasswordReset } from "../services/authApi";

export function ForgotPassword() {
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated && !sentMessage) {
    return <Navigate replace to="/" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      setSentMessage(await requestPasswordReset(email));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not send the reset link. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen min-h-screen bg-background px-4 py-6 text-foreground">
      <section className="auth-panel mx-auto flex w-full max-w-[334px] flex-col items-center border border-border/70 bg-surface px-5 pb-5 pt-7">
        <div className="mb-3 grid size-10 place-items-center rounded-full bg-surface-secondary text-foreground">
          {sentMessage ? <MailCheck className="size-5" strokeWidth={1.9} /> : <UserRound className="size-5" strokeWidth={1.9} />}
        </div>

        <h1 className="text-center text-[15px] font-semibold leading-5 tracking-normal text-foreground">
          {sentMessage ? "Check your email" : "Forgot your password?"}
        </h1>
        <p className="mt-4 max-w-[260px] text-center text-[15px] leading-5 text-muted" role={sentMessage ? "status" : undefined}>
          {sentMessage || "Enter your work email and we'll send you a link to reset your password."}
        </p>

        {sentMessage ? (
          <p className="mt-3 max-w-[260px] text-center text-[13px] leading-5 text-muted">
            The link is valid for 60 minutes. Check your spam folder if you don't see it.
          </p>
        ) : (
          <form className="mt-4 flex w-full flex-col gap-2.5" onSubmit={handleSubmit}>
            <label className={error ? "auth-field auth-field--error" : "auth-field"}>
              <Mail className={error ? "size-4 text-danger" : "size-4 text-muted"} />
              <input
                aria-label="Email"
                autoComplete="email"
                placeholder="Email"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            {error ? (
              <p className="auth-error" role="alert">
                {error}
              </p>
            ) : null}

            <Button
              className="mt-1 h-9 w-full rounded-full bg-[#0A84FF] text-[14px] font-semibold text-white shadow-none transition hover:bg-[#0077ED]"
              isDisabled={!email.trim() || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Please wait..." : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-[13px] leading-5 text-muted">
          <Link
            className="font-semibold text-accent transition hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            to="/login"
          >
            Back to log in
          </Link>
        </p>
      </section>
    </main>
  );
}
