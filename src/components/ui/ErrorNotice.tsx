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

  return (
    <p className={className} role="alert">
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
