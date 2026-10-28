import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiRequestError, type LoginOtpChallenge } from "../services/api";

const OTP_LENGTH = 6;

// Codes after which this challenge can no longer be completed; the user has to sign in again.
const DEAD_CHALLENGE_CODES = new Set(["OTP_CHALLENGE_INVALID"]);

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

interface LoginOtpFormProps {
  challenge: LoginOtpChallenge;
  /** Returns to the login form; the message (if any) is shown there. */
  onRestart: (message?: string) => void;
}

/** Second step of sign-in. The challenge lives only in the parent's memory and is dropped as soon as sign-in ends. */
export function LoginOtpForm({ challenge, onRestart }: LoginOtpFormProps) {
  const { resendLoginOtp, verifyLoginOtp } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendsExhausted, setResendsExhausted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + challenge.expires_in * 1000);
  const [resendAt, setResendAt] = useState(() => Date.now() + challenge.resend_available_in * 1000);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const secondsToExpiry = Math.max(Math.ceil((expiresAt - now) / 1000), 0);
  const secondsToResend = Math.max(Math.ceil((resendAt - now) / 1000), 0);
  const isExpired = secondsToExpiry === 0;
  const canSubmit = otp.length === OTP_LENGTH && !isVerifying && !isExpired;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError("");
    setInfo("");
    setIsVerifying(true);

    try {
      // On success the auth context stores the session and the parent redirects to the app.
      await verifyLoginOtp(challenge.challenge_token, otp);
    } catch (verifyError) {
      if (verifyError instanceof ApiRequestError && verifyError.code && DEAD_CHALLENGE_CODES.has(verifyError.code)) {
        onRestart(verifyError.message);
        return;
      }
      setError(verifyError instanceof Error ? verifyError.message : "We could not verify your code. Please try again.");
      setOtp("");
      setIsVerifying(false);
      inputRef.current?.focus();
    }
  }

  async function handleResend() {
    if (secondsToResend > 0 || isResending) return;
    setError("");
    setInfo("");
    setIsResending(true);

    try {
      const result = await resendLoginOtp(challenge.challenge_token);
      const sentAt = Date.now();
      setExpiresAt(sentAt + result.expires_in * 1000);
      setResendAt(sentAt + result.resend_available_in * 1000);
      setNow(sentAt);
      setResendsExhausted(result.resends_remaining <= 0);
      setOtp("");
      setInfo("We sent a new verification code to your email.");
      inputRef.current?.focus();
    } catch (resendError) {
      if (resendError instanceof ApiRequestError) {
        if (resendError.code && DEAD_CHALLENGE_CODES.has(resendError.code)) {
          onRestart(resendError.message);
          return;
        }
        if (resendError.code === "OTP_RESEND_LIMIT") setResendsExhausted(true);
        if (resendError.code === "OTP_RESEND_COOLDOWN") {
          const wait = Number(/(\d+)\s*second/.exec(resendError.message)?.[1]);
          if (wait > 0) setResendAt(Date.now() + wait * 1000);
        }
      }
      setError(resendError instanceof Error ? resendError.message : "We could not send a new code. Please try again.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="auth-screen min-h-screen bg-background px-4 py-6 text-foreground">
      <section className="auth-panel mx-auto flex w-full max-w-[334px] flex-col items-center border border-border/70 bg-surface px-5 pb-5 pt-7">
        <div className="mb-3 grid size-10 place-items-center rounded-full bg-surface-secondary text-foreground">
          <MailCheck className="size-5" strokeWidth={1.9} />
        </div>

        <h1 className="text-center text-[15px] font-semibold leading-5 tracking-normal text-foreground">Verify your email</h1>
        <p className="mt-4 max-w-[260px] text-center text-[15px] leading-5 text-muted">
          We've sent a 6-digit verification code to your email address
          {challenge.email ? <> <span className="font-semibold text-foreground">{challenge.email}</span></> : null}.
        </p>

        <form className="mt-4 flex w-full flex-col gap-2.5" onSubmit={handleSubmit}>
          <label className={error ? "auth-field auth-field--error" : "auth-field"}>
            <input
              ref={inputRef}
              aria-label="6-digit verification code"
              autoComplete="one-time-code"
              className="text-center text-[18px] font-semibold tracking-[0.5em]"
              inputMode="numeric"
              maxLength={OTP_LENGTH}
              pattern="\d{6}"
              placeholder="······"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
            />
          </label>

          <p className="text-center text-[13px] leading-5 text-muted" aria-live="polite">
            {isExpired ? "This code has expired. Request a new one." : `Code expires in ${formatCountdown(secondsToExpiry)}`}
          </p>

          {info && !error ? (
            <p className="rounded-xl bg-surface-secondary px-3 py-2 text-[13px] leading-5 text-foreground" role="status">
              {info}
            </p>
          ) : null}

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            className="mt-1 h-9 w-full rounded-full bg-[#0A84FF] text-[14px] font-semibold text-white shadow-none transition hover:bg-[#0077ED]"
            isDisabled={!canSubmit}
            type="submit"
          >
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>
        </form>

        <div className="mt-4 flex w-full flex-col items-center gap-2 text-[13px] leading-5 text-muted">
          {resendsExhausted ? (
            <p className="text-center">No more codes can be sent for this sign-in. Please sign in again.</p>
          ) : (
            <button
              className="font-semibold text-accent transition hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              disabled={secondsToResend > 0 || isResending || isVerifying}
              type="button"
              onClick={handleResend}
            >
              {isResending ? "Sending..." : secondsToResend > 0 ? `Resend code in ${secondsToResend}s` : "Resend code"}
            </button>
          )}

          <button
            className="inline-flex items-center gap-1 font-semibold text-accent transition hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            type="button"
            onClick={() => onRestart()}
          >
            <ArrowLeft className="size-3.5" />
            Back to log in
          </button>
        </div>
      </section>
    </main>
  );
}
