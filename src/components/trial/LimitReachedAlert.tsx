import { Button } from "@heroui/react";
import { OctagonAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { isSystemEnabled } from "../../constants/systems";
import { useAuth } from "../../context/AuthContext";
import { TRIAL_LIMIT_REACHED_EVENT } from "../../services/api";
import { limitLine, reachedLimits } from "./trialUtils";

const REFRESH_EVERY_MS = 60_000;
const MIN_GAP_MS = 3_000;

/**
 * Keeps the plan (and with it the reached-limit notice) fresh: on mount, on window focus, every 60 s, and right away
 * when any API call answers TRIAL_LIMIT_REACHED. Mount it once, in the app shell.
 */
export function usePlanFreshness(enabled: boolean) {
  const { refreshPlan } = useAuth();
  const last = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const run = (force = false) => {
      const now = Date.now();
      if (!force && now - last.current < MIN_GAP_MS) return;
      last.current = now;
      void refreshPlan();
    };
    const onFocus = () => run();
    const onVisible = () => document.visibilityState === "visible" && run();
    const onLimit = () => run(true);
    run();
    const timer = window.setInterval(() => run(true), REFRESH_EVERY_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(TRIAL_LIMIT_REACHED_EVENT, onLimit);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(TRIAL_LIMIT_REACHED_EVENT, onLimit);
    };
  }, [enabled, refreshPlan]);
}

/** Red alert listing every limit that has been reached. Renders nothing when none is. */
export function LimitReachedAlert({ variant }: { variant: "banner" | "card" }) {
  const { activeWorkspace, plan } = useAuth();
  const navigate = useNavigate();
  const reached = reachedLimits(plan);
  if (reached.length === 0 || !activeWorkspace) return null;

  const canRequest = activeWorkspace.role !== "member" && isSystemEnabled("mailer", activeWorkspace);
  const title = plan?.type === "trial" ? "Trial limit reached" : "Limit reached";
  const card = variant === "card";

  return (
    <div
      className={`${card ? "rounded-2xl p-4" : "px-4 py-2.5 sm:px-5 lg:ml-[212px]"} flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border border-danger/40 bg-danger/10 text-foreground ${card ? "" : "border-x-0 border-t-0"}`}
      data-testid={`limit-alert-${variant}`}
      role="alert"
    >
      <div className="flex min-w-0 flex-1 basis-72 items-start gap-2.5">
        <OctagonAlert aria-hidden className={`mt-0.5 shrink-0 text-danger ${card ? "size-5" : "size-4"}`} />
        <div className="min-w-0">
          <p className={`${card ? "text-[15px]" : "text-[13px]"} font-semibold text-danger`}>{title}</p>
          <ul className={`mt-0.5 space-y-0.5 ${card ? "text-[13px]" : "text-[12px]"}`}>
            {reached.map((item) => (
              <li key={item.key}>{limitLine(item)}</li>
            ))}
          </ul>
          {!canRequest ? <p className="mt-1 text-[12px] text-muted">Ask your workspace admin to request more.</p> : null}
        </div>
      </div>
      {canRequest ? (
        <Button size="sm" variant="danger" onClick={() => navigate(`/mailer/orders?request=limits&key=${reached[0].key}`)}>
          Request more
        </Button>
      ) : null}
    </div>
  );
}
