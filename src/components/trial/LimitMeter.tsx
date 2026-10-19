import type { PlanLimitUsage } from "../../types";
import { periodLabel } from "./trialUtils";

export function LimitMeter({ item }: { item: PlanLimitUsage }) {
  const unlimited = item.limit === null;
  const percent = unlimited || !item.limit ? 0 : Math.min(100, Math.round((item.used / item.limit) * 100));
  const tone = percent >= 100 ? "bg-danger" : percent >= 80 ? "bg-warning" : "bg-accent";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium text-foreground">{item.label}</span>
        <span className="tabular-nums text-muted">
          {unlimited ? (
            <>{item.used.toLocaleString()} used, unlimited</>
          ) : (
            <>
              {item.used.toLocaleString()} of {item.limit!.toLocaleString()} <span className="text-[12px]">{periodLabel(item.period)}</span>
            </>
          )}
        </span>
      </div>
      {unlimited ? null : (
        <div
          aria-label={`${item.label}: ${item.used} of ${item.limit}`}
          aria-valuemax={item.limit ?? 0}
          aria-valuemin={0}
          aria-valuenow={Math.min(item.used, item.limit ?? 0)}
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-default-200"
          role="progressbar"
        >
          <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
