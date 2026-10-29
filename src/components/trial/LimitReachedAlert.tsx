import { Button } from "@heroui/react";
import { Gauge, OctagonAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { TRIAL_LIMIT_REACHED_EVENT } from "../../services/api";
import { getViewAs } from "../../utils/viewAs";
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

/**
 * A single, calm notice for the dashboards (never a global banner). Reached limits that are just an allowance being
 * used up (domains, mailboxes, workflows...) are a soft amber note; only the daily email limit, which really pauses
 * sending, is red. Renders nothing when no limit is reached, or in View as.
 */
export function LimitReachedAlert() {
  const { activeWorkspace, plan } = useAuth();
  const navigate = useNavigate();
  const reached = reachedLimits(plan);
  if (reached.length === 0 || !activeWorkspace || getViewAs()) return null;

  const canRequest = activeWorkspace.role !== "member" && activeWorkspace.cold_mailer_enabled;
  const critical = reached.some((item) => item.key === "emails");
  const sending = reached.find((item) => item.key === "emails");
  const allowance = reached.filter((item) => item.key !== "emails");
  const title = critical ? "Daily email limit reached" : plan?.type === "trial" ? "Your trial allowance is fully used" : "Limit reached";
  const tone = critical
    ? { box: "border-danger/30 bg-danger/5", title: "text-danger", iconColor: "text-danger", icon: OctagonAlert }
    : { box: "border-warning/30 bg-warning/5", title: "text-foreground", iconColor: "text-warning", icon: Gauge };
  const ToneIcon = tone.icon;

  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-3 rounded-2xl border p-4 text-foreground ${tone.box}`}
      data-testid="limit-alert-card"
      role="status"
    >
      <div className="flex min-w-0 flex-1 basis-72 items-start gap-3">
        <ToneIcon aria-hidden className={`mt-0.5 size-5 shrink-0 ${tone.iconColor}`} />
        <div className="min-w-0">
          <p className={`text-[14px] font-semibold ${tone.title}`}>{title}</p>
          <ul className="mt-1 space-y-0.5 text-[13px] text-foreground/80">
            {sending ? <li>{limitLine(sending)}. Sending continues automatically once it resets.</li> : null}
            {allowance.map((item) => (
              <li key={item.key}>{limitLine(item)}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-[12px] text-muted">
            {canRequest ? "Need more? Send a request and our team will raise it." : "Ask your workspace admin to request more."}
          </p>
        </div>
      </div>
      {canRequest ? (
        <Button size="sm" variant="secondary" onClick={() => navigate(`/mailer/orders?request=limits&key=${reached[0].key}`)}>
          Request more
        </Button>
      ) : null}
    </div>
  );
}
