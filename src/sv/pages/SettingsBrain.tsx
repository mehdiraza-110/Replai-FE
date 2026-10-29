import { useEffect, useMemo, useState } from "react";
import { aiSdrApi, type Brain } from "../api/aiSdr";
import { useSvTitle } from "../layout/chrome";
import { Button, Field, PageHeader, SettingsCard } from "../ui";

const EMPTY: Brain = { companyName: "", website: "", whoYouSellTo: "", whatYouSell: "", podcastName: "", senderFirstName: "", senderLastName: "", senderTitle: "", senderEmail: "", senderContact: "", senderAddress: "" };

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong. Try again.");

export function SettingsBrain() {
  useSvTitle([{ label: "Brain" }]);
  const [saved, setSaved] = useState<Brain | null>(null);
  const [form, setForm] = useState<Brain>(EMPTY);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    aiSdrApi
      .settings()
      .then((bundle) => {
        setSaved(bundle.brain);
        setForm(bundle.brain);
      })
      .catch((caught) => setError(errorText(caught)));
  }, []);

  const dirty = saved !== null && JSON.stringify(saved) !== JSON.stringify(form);
  const set = (key: keyof Brain) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value });

  const done = useMemo(() => [form.companyName, form.website, form.whoYouSellTo, form.whatYouSell, form.senderFirstName && form.senderTitle].filter(Boolean).length, [form]);
  const senderName = [form.senderFirstName, form.senderLastName].filter(Boolean).join(" ");
  const example = useMemo(() => {
    if (!form.whoYouSellTo.trim() && !form.whatYouSell.trim()) return "";
    return `${form.companyName || "We"} help${form.companyName ? "s" : ""} ${form.whoYouSellTo.trim() || "businesses"}${form.whatYouSell.trim() ? `: ${form.whatYouSell.trim()}` : "."}`;
  }, [form]);

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const next = await aiSdrApi.saveBrain(form);
      setSaved(next);
      setForm(next);
      setNotice("Saved. Changes apply to the next reply.");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sv-page">
      <div className="sv-settings-col">
        <PageHeader title="Brain" subtitle="What the AI knows about your business. The AI SDR uses it in replies, and your title and company sign every email." />
        <p className="sv-hint" style={{ marginBottom: 16 }}>{done} of 5 done</p>
        {error ? <p className="sv-banner is-error" role="alert" style={{ marginBottom: 16 }}>{error}</p> : null}
        {notice ? <p className="sv-banner" role="status" style={{ marginBottom: 16, background: "var(--ds-green-bg)", border: "1px solid var(--ds-green-border)", color: "var(--ds-green-text)" }}>{notice}</p> : null}

        <SettingsCard title="Your business" description="The AI SDR and the AI chat use this to describe what you do.">
          <Field label="Company" htmlFor="brain-company"><input id="brain-company" className="sv-input" value={form.companyName} onChange={set("companyName")} /></Field>
          <Field label="Website" htmlFor="brain-website"><input id="brain-website" className="sv-input" placeholder="https://" value={form.website} onChange={set("website")} /></Field>
          <Field label="Who you sell to" htmlFor="brain-who">
            <textarea id="brain-who" className="sv-textarea" value={form.whoYouSellTo} onChange={set("whoYouSellTo")} />
            <p className="sv-hint">The type of business and the people you want to reach.</p>
          </Field>
          <Field label="What you sell" htmlFor="brain-what">
            <textarea id="brain-what" className="sv-textarea" value={form.whatYouSell} onChange={set("whatYouSell")} />
            <p className="sv-hint">What you do for them and the result they get.</p>
          </Field>
          <Field label="Podcast name" htmlFor="brain-podcast">
            <input id="brain-podcast" className="sv-input" value={form.podcastName} onChange={set("podcastName")} />
            <p className="sv-hint">Used when a campaign invites people onto your show.</p>
          </Field>
        </SettingsCard>

        <SettingsCard title="What the AI will use" description="How emails sign off.">
          <div className="sv-brain-sign">
            <div style={{ fontWeight: 500 }}>[Inbox name]</div>
            <div className="sv-hint">{[form.senderTitle, form.companyName].filter(Boolean).join(" | ") || "Title | Company"}</div>
          </div>
          <p className="sv-hint">Each inbox signs with its own name. Your title and company go underneath.</p>
          <div>
            <div className="sv-field-label">Example of how the AI SDR describes you</div>
            <p className="sv-set-desc">{example || "Add who you sell to and what you sell to see an example."}</p>
          </div>
        </SettingsCard>

        <SettingsCard title="You" description="Used as your name in podcast invites and as the person on the call. Each email is signed by the inbox that sends it, with your title and company underneath.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="First name" htmlFor="brain-first"><input id="brain-first" className="sv-input" value={form.senderFirstName} onChange={set("senderFirstName")} /></Field>
            <Field label="Last name" htmlFor="brain-last"><input id="brain-last" className="sv-input" value={form.senderLastName} onChange={set("senderLastName")} /></Field>
          </div>
          <Field label="Job title" htmlFor="brain-title">
            <input id="brain-title" className="sv-input" value={form.senderTitle} onChange={set("senderTitle")} />
            <p className="sv-hint">Signs every email{senderName ? `, e.g. "${senderName}, ${form.senderTitle || "Title"}"` : ""}, with your company.</p>
          </Field>
          <div>
            <button type="button" className="sv-link" onClick={() => setMoreOpen((open) => !open)}>{moreOpen ? "Hide more contact details" : "More contact details (optional)"}</button>
          </div>
          {moreOpen ? (
            <>
              <Field label="Email" htmlFor="brain-email"><input id="brain-email" type="email" className="sv-input" value={form.senderEmail} onChange={set("senderEmail")} /></Field>
              <Field label="Phone or other contact" htmlFor="brain-contact"><input id="brain-contact" className="sv-input" value={form.senderContact} onChange={set("senderContact")} /></Field>
              <Field label="Address" htmlFor="brain-address"><input id="brain-address" className="sv-input" value={form.senderAddress} onChange={set("senderAddress")} /></Field>
            </>
          ) : null}
        </SettingsCard>

        <div className="sv-savebar">
          <span>{dirty ? "You have unsaved changes." : "The AI SDR writes each reply fresh. Changes apply after you save."}</span>
          <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
