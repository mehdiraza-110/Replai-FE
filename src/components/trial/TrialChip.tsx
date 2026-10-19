import { Clock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { pluralDays, trialTone } from "./trialUtils";

const toneClass = {
  default: "border-border/70 bg-surface text-foreground hover:bg-surface-secondary/70",
  warning: "border-warning/40 bg-warning/10 text-warning hover:bg-warning/15",
  danger: "border-danger/40 bg-danger/10 text-danger hover:bg-danger/15",
};

/** Small persistent trial indicator; clicking it re-opens the trial info modal. */
export function TrialChip() {
  const { isTrialEnded, openTrialModal, plan } = useAuth();
  if (!plan || plan.type !== "trial") return null;

  const tone = isTrialEnded ? "danger" : trialTone(plan);
  const label = isTrialEnded ? "Trial ended" : `Trial · ${pluralDays(plan.days_left)} left`;

  return (
    <button
      aria-label={`${label}. View trial details`}
      className={`inline-flex h-[30px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[12px] font-semibold transition ${toneClass[tone]}`}
      type="button"
      onClick={openTrialModal}
    >
      <Clock aria-hidden className="size-3.5" />
      {label}
    </button>
  );
}
