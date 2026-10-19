import { Gauge } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiRequestError } from "../../services/api";

/**
 * Inline error text. When the error says an AI provider key is missing, it also links to the AI Keys page so
 * the person can fix it right away. Accepts a caught error or a ready-made message.
 */
export function ErrorNotice({ error, className = "text-sm font-medium text-danger" }: { error: unknown; className?: string }) {
  if (!error) return null;

  const message = typeof error === "string" ? error : error instanceof Error ? error.message : "Something went wrong. Please try again.";
  const needsAiKey = error instanceof ApiRequestError && error.code === "AI_PROVIDER_KEY_MISSING";

  const isTrialLimit = error instanceof ApiRequestError && error.code === "TRIAL_LIMIT_REACHED";

  return (
    <p className={className} role="alert">
      {isTrialLimit ? (
        <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 align-middle text-[11px] font-semibold text-warning">
          <Gauge aria-hidden className="size-3" />
          Trial limit
        </span>
      ) : null}
      {message}
      {needsAiKey ? (
        <>
          {" "}
          <Link className="font-semibold underline underline-offset-2" to="/ai-keys">
            Open AI Keys
          </Link>
        </>
      ) : null}
    </p>
  );
}
