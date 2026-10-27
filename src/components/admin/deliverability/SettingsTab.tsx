import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { errorMessage } from "../../../services/adminApi";
import { warmnetApi, type WarmnetConfig } from "../../../services/warmnetApi";
import { ErrorBanner } from "../AdminModal";
import { Field, inputClass } from "../AdminBits";
import { Skeleton } from "../../ui/Skeleton";
import { Panel, useLoad, type Notify } from "./Bits";

type NumKey = Exclude<keyof WarmnetConfig, "timezone">;

interface FieldDef {
  key: NumKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  step?: number;
  /** Stored 0-1, shown as a percentage. */
  percent?: boolean;
  unit?: string;
}

const GROUPS: Array<{ title: string; description: string; fields: FieldDef[] }> = [
  {
    title: "Daily volume",
    description: "How much each mailbox sends to the seed inboxes. The ramp moves up one step per day while the previous day's target was met.",
    fields: [
      { key: "startPerDay", label: "Day 1 volume", hint: "Emails per mailbox on its first day.", min: 1, max: 20, unit: "per day" },
      { key: "incrementPerDay", label: "Daily increase", hint: "Added each day the ramp advances.", min: 0, max: 5, step: 0.5, unit: "per day" },
      { key: "maxPerDay", label: "Ramp ceiling", hint: "Highest daily volume while warming.", min: 1, max: 60, unit: "per day" },
      { key: "maintenancePerDay", label: "After release", hint: "Low volume kept running once a mailbox is handed over.", min: 0, max: 30, unit: "per day" },
      { key: "weekendFactor", label: "Weekend volume", hint: "Share of a normal day sent on Saturday and Sunday.", min: 0, max: 100, step: 5, percent: true, unit: "%" },
    ],
  },
  {
    title: "Sending window",
    description: "Warm-up mail is only sent inside this window, so it looks like working-hours traffic.",
    fields: [
      { key: "windowStartHour", label: "Starts at", hint: "Hour of day, 0 to 23.", min: 0, max: 23, unit: "h" },
      { key: "windowEndHour", label: "Ends at", hint: "Hour of day, 1 to 24. Must be after the start.", min: 1, max: 24, unit: "h" },
    ],
  },
  {
    title: "Seed behaviour",
    description: "How the seed inboxes react to the mail they receive.",
    fields: [
      { key: "replyRate", label: "Seed replies", hint: "Share of received emails a seed answers.", min: 0, max: 100, step: 5, percent: true, unit: "%" },
      { key: "counterReplyRate", label: "Mailbox answers the reply", hint: "Share of seed replies our mailbox answers, closing the thread.", min: 0, max: 100, step: 5, percent: true, unit: "%" },
      { key: "starRate", label: "Seed stars the email", hint: "Share of received emails the seed stars.", min: 0, max: 100, step: 5, percent: true, unit: "%" },
    ],
  },
  {
    title: "Ready to release",
    description: "A mailbox is marked Ready when it has warmed long enough with a high inbox rate. You still release it by hand.",
    fields: [
      { key: "readyAfterDays", label: "Minimum days warming", hint: "7 to 90.", min: 7, max: 90, unit: "days" },
      { key: "readyMinInboxRate", label: "Inbox rate needed", hint: "Over the last 14 days.", min: 30, max: 100, step: 5, percent: true, unit: "%" },
      { key: "readyMinPlaced", label: "Messages measured", hint: "Seed-checked emails needed before the rate counts.", min: 5, max: 500, unit: "emails" },
    ],
  },
  {
    title: "Safety",
    description: "Protects the domains when mail lands in spam or sending breaks.",
    fields: [
      { key: "holdBelowInboxRate", label: "Hold the ramp below", hint: "If the 7-day inbox rate drops under this, volume stops rising until it recovers.", min: 0, max: 100, step: 5, percent: true, unit: "%" },
      { key: "holdMinPlaced", label: "Messages before holding", hint: "Seed-checked emails needed before the hold can trigger.", min: 3, max: 200, unit: "emails" },
      { key: "maxConsecutiveFailures", label: "Pause after failed sends", hint: "A mailbox pauses itself after this many failures in a row.", min: 2, max: 50, unit: "sends" },
      { key: "maxSendsPerTick", label: "Sends per engine run", hint: "Upper limit for one 3-minute run, across all mailboxes.", min: 10, max: 500, unit: "emails" },
    ],
  },
];

type Draft = Record<NumKey, string> & { timezone: string };

function toDraft(c: WarmnetConfig): Draft {
  const out = { timezone: c.timezone } as Draft;
  for (const g of GROUPS) for (const f of g.fields) out[f.key] = String(f.percent ? Math.round(c[f.key] * 1000) / 10 : c[f.key]);
  return out;
}

export function SettingsTab({ notify }: { notify: Notify }) {
  const settings = useLoad(() => warmnetApi.getSettings(), []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data) setDraft(toDraft(settings.data.config));
  }, [settings.data]);

  if (settings.error && !settings.data) return <ErrorBanner message={settings.error} onRetry={() => void settings.reload()} />;
  if (!settings.data || !draft) return <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton className="h-40 w-full rounded-2xl" key={i} />)}</div>;

  const current = toDraft(settings.data.config);
  const defaults = toDraft(settings.data.defaults);
  const dirty = (Object.keys(current) as Array<keyof Draft>).some((k) => current[k] !== draft[k]);

  async function save() {
    if (!draft) return;
    const config: Partial<WarmnetConfig> = { timezone: draft.timezone.trim() };
    for (const g of GROUPS) {
      for (const f of g.fields) {
        const n = Number(draft[f.key]);
        if (draft[f.key].trim() === "" || !Number.isFinite(n)) {
          setError(`"${f.label}" needs a number.`);
          return;
        }
        config[f.key] = f.percent ? n / 100 : n;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const next = await warmnetApi.updateSettings({ config });
      settings.setData(next);
      notify("Warm-up settings saved.");
    } catch (e) {
      setError(errorMessage(e, "Unable to save the settings."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorBanner message={error} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">Changes apply from the next engine run. Defaults are shown under each field.</p>
        <div className="flex gap-2">
          <Button isDisabled={busy} size="sm" variant="secondary" onClick={() => setDraft(defaults)}>Reset to defaults</Button>
          <Button isDisabled={busy || !dirty} size="sm" variant="primary" onClick={() => void save()}>{busy ? "Saving..." : "Save settings"}</Button>
        </div>
      </div>

      {GROUPS.map((g) => (
        <Panel description={g.description} key={g.title} title={g.title}>
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.fields.map((f) => (
              <Field hint={`${f.hint} Default ${defaults[f.key]}${f.unit && f.percent ? "%" : f.unit ? ` ${f.unit}` : ""}.`} key={f.key} label={`${f.label}${f.unit ? ` (${f.unit})` : ""}`}>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  max={f.max}
                  min={f.min}
                  step={f.step ?? 1}
                  type="number"
                  value={draft[f.key]}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                />
              </Field>
            ))}
            {g.title === "Sending window" ? (
              <Field hint={`A timezone name such as America/New_York. Default ${defaults.timezone}.`} label="Timezone">
                <input className={inputClass} value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} />
              </Field>
            ) : null}
          </div>
        </Panel>
      ))}
    </div>
  );
}
