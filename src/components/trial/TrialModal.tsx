import { Button } from "@heroui/react";
import { Sparkles } from "lucide-react";
import { AdminModal } from "../admin/AdminModal";
import { useAuth } from "../../context/AuthContext";
import { LimitMeter } from "./LimitMeter";
import { sortedLimits, trialEndsText } from "./trialUtils";

/** Shown once per sign-in for trial workspaces, and whenever the trial chip is clicked. */
export function TrialModal() {
  const { closeTrialModal, plan, trialModalOpen } = useAuth();
  const open = trialModalOpen && plan?.type === "trial" && !plan.ended;
  if (!plan) return null;
  const limits = sortedLimits(plan);

  return (
    <AdminModal
      footer={
        <Button size="sm" variant="primary" onClick={closeTrialModal}>
          Got it
        </Button>
      }
      isOpen={open}
      title="You're on a free trial"
      onClose={closeTrialModal}
    >
      <div className="grid gap-4">
        <p className="flex items-start gap-2 text-sm leading-6 text-foreground">
          <Sparkles aria-hidden className="mt-1 size-4 shrink-0 text-accent" />
          {trialEndsText(plan)}.
        </p>
        {limits.length > 0 ? (
          <div className="grid gap-3 rounded-xl border border-border/70 bg-surface-secondary/50 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Trial limits</p>
            {limits.map((item) => (
              <LimitMeter item={item} key={item.key} />
            ))}
          </div>
        ) : null}
        <p className="text-[13px] leading-5 text-muted">
          When a limit is reached that action pauses until it frees up, and when the trial ends the workspace is locked. Contact support to continue.
        </p>
      </div>
    </AdminModal>
  );
}
