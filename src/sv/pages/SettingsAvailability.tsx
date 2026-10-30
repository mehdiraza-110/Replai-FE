import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { schedulingApi, type Availability, type WeekDay } from "../api/aiSdr";
import { useSvTitle } from "../layout/chrome";
import { Button, PageHeader, SettingsCard, Skeleton, Toggle } from "../ui";

const DAYS: Array<{ key: WeekDay; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];
const BUFFERS = [0, 5, 10, 15, 30, 45, 60];

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong. Try again.");

function timezones(current: string) {
  const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  const list = supported.length > 0 ? supported : ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Singapore", "Australia/Sydney"];
  return list.includes(current) ? list : [current, ...list];
}

export function SettingsAvailability() {
  useSvTitle([{ label: "Availability" }]);
  const [saved, setSaved] = useState<Availability | null>(null);
  const [form, setForm] = useState<Availability | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    schedulingApi
      .availability()
      .then((next) => {
        // Default a first-time visitor to their browser's time zone so the hours they see make sense to them.
        const initial = next.saved ? next : { ...next, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || next.timezone };
        setSaved(next);
        setForm(initial);
      })
      .catch((caught) => setError(errorText(caught)));
  }, []);

  const dirty = useMemo(() => Boolean(saved && form && (!saved.saved || JSON.stringify({ ...saved, saved: true }) !== JSON.stringify({ ...form, saved: true }))), [saved, form]);

  if (!form) return <div className="sv-page"><div className="sv-settings-col"><PageHeader title="Availability" subtitle="Choose when meetings can be booked." />{error ? <p className="sv-banner is-error">{error}</p> : (
          <div className="sv-card" style={{ padding: 16 }}>
            <div role="status" aria-label="Loading" style={{ display: "grid", gap: 16 }}>{Array.from({ length: 7 }, (_, i) => <div key={i} style={{ display: "flex", gap: 16, alignItems: "center" }}><Skeleton width={90} /><Skeleton width={160} height={32} /></div>)}</div>
          </div>
        )}</div></div>;

  const setRanges = (day: WeekDay, ranges: Array<[string, string]>) => setForm({ ...form, weekly: { ...form.weekly, [day]: ranges } });

  async function save() {
    if (!form) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const next = await schedulingApi.saveAvailability({ timezone: form.timezone, weekly: form.weekly, bufferBeforeMin: form.bufferBeforeMin, bufferAfterMin: form.bufferAfterMin });
      setSaved(next);
      setForm(next);
      setNotice("Availability saved.");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sv-page">
      <div className="sv-settings-col">
        <PageHeader title="Availability" subtitle="Choose when meetings can be booked. At least one available time is required." />
        {error ? <p className="sv-banner is-error" role="alert" style={{ marginBottom: 16 }}>{error}</p> : null}
        {notice ? <p className="sv-banner is-ok" role="status" style={{ marginBottom: 16 }}>{notice}</p> : null}

        <SettingsCard title="Time zone" description="Times you offer prospects are shown in this time zone.">
          <select className="sv-select" aria-label="Time zone" value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })}>
            {timezones(form.timezone).map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, " ")}</option>)}
          </select>
        </SettingsCard>

        <SettingsCard title="Buffer times" description="Add buffer time before and after meetings to prevent back-to-back bookings.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {(["bufferBeforeMin", "bufferAfterMin"] as const).map((key) => (
              <label key={key} className="sv-field">
                <span className="sv-field-label">{key === "bufferBeforeMin" ? "Before meeting" : "After meeting"}</span>
                <select className="sv-select" value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })}>
                  {BUFFERS.map((minutes) => <option key={minutes} value={minutes}>{minutes === 0 ? "No buffer" : `${minutes} minutes`}</option>)}
                </select>
              </label>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard title="Weekly hours" description="When you are available to take calls.">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {DAYS.map(({ key, label }, index) => {
              const ranges = form.weekly[key];
              const on = ranges.length > 0;
              return (
                <div key={key} style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 12, alignItems: "start", padding: "12px 0", borderTop: index ? "1px solid var(--ds-border)" : undefined }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 500, paddingTop: 6 }}>
                    <Toggle checked={on} label={`${label} available`} onChange={(next) => setRanges(key, next ? [["09:00", "17:00"]] : [])} />
                    {label}
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {on ? ranges.map((range, rangeIndex) => (
                      <div key={rangeIndex} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="time" className="sv-input" style={{ width: 130 }} aria-label={`${label} start`} value={range[0]} onChange={(event) => setRanges(key, ranges.map((r, i) => (i === rangeIndex ? [event.target.value, r[1]] : r)))} />
                        <span>–</span>
                        <input type="time" className="sv-input" style={{ width: 130 }} aria-label={`${label} end`} value={range[1]} onChange={(event) => setRanges(key, ranges.map((r, i) => (i === rangeIndex ? [r[0], event.target.value] : r)))} />
                        <button type="button" className="sv-icon-btn" aria-label={`Remove ${label} range`} onClick={() => setRanges(key, ranges.filter((_, i) => i !== rangeIndex))}><Trash2 className="sv-icon" aria-hidden /></button>
                      </div>
                    )) : <span className="sv-hint" style={{ paddingTop: 8 }}>Unavailable</span>}
                  </div>
                  <span className="sv-actions">
                    {on && ranges.length < 4 ? <button type="button" className="sv-icon-btn" aria-label={`Add a ${label} range`} onClick={() => setRanges(key, [...ranges, ["13:00", "17:00"]])}><Plus className="sv-icon" aria-hidden /></button> : null}
                    {on ? (
                      <button
                        type="button"
                        className="sv-icon-btn"
                        aria-label={`Copy ${label} hours to every day`}
                        onClick={() => setForm({ ...form, weekly: Object.fromEntries(DAYS.map((d) => [d.key, ranges.map((r) => [...r] as [string, string])])) as Availability["weekly"] })}
                      >
                        <Copy className="sv-icon" aria-hidden />
                      </button>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </SettingsCard>

        <div className="sv-savebar">
          <span>{dirty ? "You have unsaved changes." : "Availability is up to date."}</span>
          <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
