import { useEffect, useRef, useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ApiRequestError, type LoginOtpChallenge } from "../../services/api";
import { AuthField, AuthLayout, AuthMessage } from "./AuthLayout";

const OTP_LENGTH = 6;
// After these the challenge can't be completed any more: the person has to sign in again.
const DEAD_CHALLENGE_CODES = new Set(["OTP_CHALLENGE_INVALID"]);

const countdown = (totalSeconds: number) => `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;

/** Second step of sign-in: the 6-digit code that was emailed after a correct password. The challenge only lives in memory. */
export function OtpStep({ challenge, onRestart }: { challenge: LoginOtpChallenge; onRestart: (message?: string) => void }) {
  const { verifyLoginOtp, resendLoginOtp } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [noMoreResends, setNoMoreResends] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + challenge.expires_in * 1000);
  const [resendAt, setResendAt] = useState(() => Date.now() + challenge.resend_available_in * 1000);

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const toExpiry = Math.max(Math.ceil((expiresAt - now) / 1000), 0);
  const toResend = Math.max(Math.ceil((resendAt - now) / 1000), 0);
  const expired = toExpiry === 0;
  const canSubmit = code.length === OTP_LENGTH && !verifying && !expired;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(""); setInfo(""); setVerifying(true);
    try {
      // On success the auth context stores the session and this page redirects into the app.
      await verifyLoginOtp(challenge.challenge_token, code);
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.code && DEAD_CHALLENGE_CODES.has(caught.code)) { onRestart(caught.message); return; }
      setError(caught instanceof Error ? caught.message : "We couldn't verify your code. Try again.");
      setCode(""); setVerifying(false); inputRef.current?.focus();
    }
  }

  async function resend() {
    if (toResend > 0 || resending) return;
    setError(""); setInfo(""); setResending(true);
    try {
      const result = await resendLoginOtp(challenge.challenge_token);
      const sentAt = Date.now();
      setExpiresAt(sentAt + result.expires_in * 1000); setResendAt(sentAt + result.resend_available_in * 1000); setNow(sentAt);
      setNoMoreResends(result.resends_remaining <= 0); setCode(""); setInfo("We sent a new code to your email."); inputRef.current?.focus();
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        if (caught.code && DEAD_CHALLENGE_CODES.has(caught.code)) { onRestart(caught.message); return; }
        if (caught.code === "OTP_RESEND_LIMIT") setNoMoreResends(true);
        if (caught.code === "OTP_RESEND_COOLDOWN") { const wait = Number(/(\d+)\s*second/.exec(caught.message)?.[1]); if (wait > 0) setResendAt(Date.now() + wait * 1000); }
      }
      setError(caught instanceof Error ? caught.message : "We couldn't send a new code. Try again.");
    } finally { setResending(false); }
  }

  return (
    <AuthLayout title="Check your email" subtitle={`We sent a 6-digit code to ${challenge.email}.`} termsLead="By logging in">
      <form className="sv-auth-form" onSubmit={submit}>
        <AuthField icon={KeyRound} label="6-digit code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={OTP_LENGTH} pattern="\d{6}" required invalid={Boolean(error)} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))} />
        <p className="sv-hint" style={{ margin: 0, textAlign: "center" }} aria-live="polite">{expired ? "This code has expired. Request a new one." : `The code expires in ${countdown(toExpiry)}.`}</p>
        {info && !error ? <AuthMessage tone="notice">{info}</AuthMessage> : null}
        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        <button className="sv-auth-submit" type="submit" disabled={!canSubmit}>{verifying ? "Verifying…" : "Verify and log in"}</button>
      </form>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 16 }}>
        {noMoreResends ? <p className="sv-hint" style={{ margin: 0 }}>No more codes can be sent for this sign-in. Please sign in again.</p> : (
          <button type="button" className="sv-auth-forgot" style={{ margin: 0 }} disabled={toResend > 0 || resending || verifying} onClick={() => void resend()}>{resending ? "Sending…" : toResend > 0 ? `Send a new code in ${toResend}s` : "Send a new code"}</button>
        )}
        <button type="button" className="sv-auth-forgot" style={{ margin: 0 }} onClick={() => onRestart()}>Back to log in</button>
      </div>
    </AuthLayout>
  );
}
