import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Pencil, Plus, RotateCw, Trash2 } from "lucide-react";
import { aiSdrApi, type CampaignOverride, type MeetingType, type MeetingTypeInput, type OverrideInput, type SdrSettingsBundle } from "../api/aiSdr";
import { useSvTitle } from "../layout/chrome";
import { Badge, Button, Field, Modal, PageHeader, SettingsCard, Toggle } from "../ui";

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong. Try again.");

interface Form {
  enabled: boolean;
  requireApproval: boolean;
  knowledgeBase: string;
  callHandlerUserId: number | null;
  bookingLink: string;
  webhookUrl: string;
  followupEnabled: boolean;
  followupDelayDays: number;
  followupMax: number;
}

const toForm = (bundle: SdrSettingsBundle): Form => ({
  enabled: bundle.settings.enabled,
  requireApproval: bundle.settings.requireApproval,
  knowledgeBase: bundle.settings.knowledgeBase,
  callHandlerUserId: bundle.settings.callHandlerUserId,
  bookingLink: bundle.settings.bookingLink,
  webhookUrl: bundle.settings.webhookUrl,
  followupEnabled: bundle.settings.followupEnabled,
  followupDelayDays: bundle.settings.followupDelayDays,
  followupMax: bundle.settings.followupMax,
});

function Row({ title, description, control }: { title: string; description: string; control: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
      <div>
        <div style={{ fontWeight: 500 }}>{title}</div>
        <p className="sv-set-desc" style={{ margin: "2px 0 0" }}>{description}</p>
      </div>
      {control}
    </div>
  );
}

const emptyType: MeetingTypeInput = { name: "", campaignType: "Direct", durationMinutes: 30, calendarTitle: "" };

export function MeetingTypeModal({ initial, onClose, onSaved }: { initial: MeetingType | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<MeetingTypeInput>(initial ? { name: initial.name, campaignType: initial.campaignType, durationMinutes: initial.durationMinutes, calendarTitle: initial.calendarTitle } : emptyType);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    try {
      if (initial) await aiSdrApi.updateMeetingType(initial.id, form);
      else await aiSdrApi.createMeetingType(form);
      onSaved();
      onClose();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={initial ? "Edit meeting type" : "Add meeting type"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={busy || !form.name.trim()} onClick={() => void save()}>Save</Button>
        </>
      }
    >
      {error ? <p className="sv-banner is-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
      <Field label="Name" htmlFor="mt-name">
        <input id="mt-name" className="sv-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </Field>
      <Field label="Campaign type" htmlFor="mt-type">
        <input id="mt-type" className="sv-input" value={form.campaignType} onChange={(event) => setForm({ ...form, campaignType: event.target.value })} />
      </Field>
      <Field label="Duration (minutes)" htmlFor="mt-duration">
        <input id="mt-duration" type="number" min={5} max={480} className="sv-input" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} />
      </Field>
      <Field label="Calendar title" htmlFor="mt-title">
        <input id="mt-title" className="sv-input" value={form.calendarTitle} placeholder={`${form.name || "Call"} - Prospect Name`} onChange={(event) => setForm({ ...form, calendarTitle: event.target.value })} />
      </Field>
    </Modal>
  );
}

const triValue = (value: boolean | null) => (value === null ? "" : value ? "on" : "off");
const fromTri = (value: string): boolean | null => (value === "" ? null : value === "on");

function OverrideModal({ item, meetingTypes, onClose, onSaved }: { item: CampaignOverride; meetingTypes: MeetingType[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<OverrideInput>({ enabled: item.enabled, requireApproval: item.requireApproval, meetingTypeId: item.meetingTypeId, bookingLink: item.bookingLink, notes: item.notes });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      onSaved();
      onClose();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={`Campaign settings: ${item.campaignName}`}
      onClose={onClose}
      footer={
        <>
          {item.hasOverride ? <Button disabled={busy} onClick={() => void run(() => aiSdrApi.clearOverride(item.campaignId))}>Use workspace defaults</Button> : null}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={busy} onClick={() => void run(() => aiSdrApi.saveOverride(item.campaignId, form))}>Save</Button>
        </>
      }
    >
      {error ? <p className="sv-banner is-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
      <p className="sv-hint">Anything you leave on "Same as workspace" follows the workspace settings.</p>
      <Field label="AI SDR for this campaign" htmlFor="ov-enabled">
        <select id="ov-enabled" className="sv-select" value={triValue(form.enabled)} onChange={(event) => setForm({ ...form, enabled: fromTri(event.target.value) })}>
          <option value="">Same as workspace</option>
          <option value="on">Always on</option>
          <option value="off">Off (a person handles replies)</option>
        </select>
      </Field>
      <Field label="Approve replies before sending" htmlFor="ov-approval">
        <select id="ov-approval" className="sv-select" value={triValue(form.requireApproval)} onChange={(event) => setForm({ ...form, requireApproval: fromTri(event.target.value) })}>
          <option value="">Same as workspace</option>
          <option value="on">Always ask me first</option>
          <option value="off">Send automatically</option>
        </select>
      </Field>
      <Field label="Meeting type" htmlFor="ov-type">
        <select id="ov-type" className="sv-select" value={form.meetingTypeId ?? ""} onChange={(event) => setForm({ ...form, meetingTypeId: event.target.value ? Number(event.target.value) : null })}>
          <option value="">Default meeting type</option>
          {meetingTypes.map((type) => <option key={type.id} value={type.id}>{type.name} ({type.durationMinutes} min)</option>)}
        </select>
      </Field>
      <Field label="Booking link" htmlFor="ov-link">
        <input id="ov-link" className="sv-input" placeholder="Same as workspace" value={form.bookingLink} onChange={(event) => setForm({ ...form, bookingLink: event.target.value })} />
      </Field>
      <Field label="Notes for this campaign" htmlFor="ov-notes">
        <textarea id="ov-notes" className="sv-textarea" rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Extra context that only applies here, e.g. who the offer is aimed at." />
      </Field>
    </Modal>
  );
}

export function SettingsAiSdr() {
  useSvTitle([{ label: "AI SDR Agent" }]);
  const [bundle, setBundle] = useState<SdrSettingsBundle | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState("");
  const [typeModal, setTypeModal] = useState<MeetingType | "new" | null>(null);
  const [resource, setResource] = useState({ title: "", url: "" });
  const [secret, setSecret] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<CampaignOverride[]>([]);
  const [overrideModal, setOverrideModal] = useState<CampaignOverride | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await aiSdrApi.settings();
      setBundle(next);
      setForm((current) => current ?? toForm(next));
      setError("");
    } catch (caught) {
      setError(errorText(caught));
    }
  }, []);

  const loadOverrides = useCallback(() => aiSdrApi.overrides().then(setOverrides).catch(() => undefined), []);

  useEffect(() => {
    void load();
    void loadOverrides();
  }, [load, loadOverrides]);

  const dirty = useMemo(() => Boolean(bundle && form && JSON.stringify(form) !== JSON.stringify(toForm(bundle))), [bundle, form]);

  async function guarded(action: () => Promise<unknown>, success?: string) {
    setError("");
    setNotice("");
    try {
      await action();
      if (success) setNotice(success);
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function saveForm() {
    if (!form) return;
    setSaving(true);
    await guarded(async () => {
      const next = await aiSdrApi.saveSettings(form);
      setBundle(next);
      setForm(toForm(next));
    }, "Settings saved.");
    setSaving(false);
  }

  if (!bundle || !form) {
    return (
      <div className="sv-page"><div className="sv-settings-col"><PageHeader title="AI SDR Agent Settings" subtitle="Configure your AI SDR agent settings and call assignment preferences" />
        <p className={error ? "sv-banner is-error" : "sv-hint"} role={error ? "alert" : undefined}>{error || "Loading…"}</p></div></div>
    );
  }

  return (
    <div className="sv-page">
      <div className="sv-settings-col">
        <PageHeader title="AI SDR Agent Settings" subtitle="Configure your AI SDR agent settings and call assignment preferences" />
        {error ? <p className="sv-banner is-error" role="alert" style={{ marginBottom: 16 }}>{error}</p> : null}
        {notice ? <p className="sv-banner" role="status" style={{ marginBottom: 16, background: "var(--ds-green-bg)", border: "1px solid var(--ds-green-border)", color: "var(--ds-green-text)" }}>{notice}</p> : null}

        <SettingsCard title="AI SDR status" description={form.enabled ? "The AI SDR is processing new campaign replies and can book meetings." : "The AI SDR is paused. Replies are still labelled, but nothing is written for you."}>
          <Row
            title="Process incoming replies"
            description="Turn this off to pause the agent without changing your campaigns, knowledge, resources, or meeting types."
            control={<Toggle checked={form.enabled} onChange={(enabled) => setForm({ ...form, enabled })} label="Process incoming replies" />}
          />
          <Row
            title="Approve replies before they are sent"
            description="When on, the AI SDR writes each reply as a draft that you review and send from the inbox. Recommended for new accounts."
            control={<Toggle checked={form.requireApproval} onChange={(requireApproval) => setForm({ ...form, requireApproval })} label="Approve replies before they are sent" />}
          />
        </SettingsCard>

        <SettingsCard title="Call Assignment" description="Choose whose name and booking link are used when the AI SDR proposes a call to a prospect.">
          <Field label="Assigned Call Handler" htmlFor="handler">
            <select id="handler" className="sv-select" value={form.callHandlerUserId ?? ""} onChange={(event) => setForm({ ...form, callHandlerUserId: event.target.value ? Number(event.target.value) : null })}>
              <option value="">Automatic (owner first, then admin, then member)</option>
              {bundle.handlers.map((handler) => (
                <option key={handler.id} value={handler.id}>{handler.name} ({handler.email}) · {handler.role}</option>
              ))}
            </select>
          </Field>
          <Field label="Booking link" htmlFor="booking">
            <input id="booking" className="sv-input" placeholder="https://calendly.com/your-name/meeting" value={form.bookingLink} onChange={(event) => setForm({ ...form, bookingLink: event.target.value })} />
            <p className="sv-hint">The AI SDR includes this link when a prospect wants to talk. Without one, it asks for times that suit them.</p>
          </Field>
        </SettingsCard>

        <SettingsCard title="Follow-ups" description="If a prospect goes quiet, the AI SDR sends a short follow-up that adds something useful, up to a limit you choose. A reply from the prospect cancels the next one.">
          <Row
            title="Send follow-ups automatically"
            description="After the AI SDR replies and gets no answer. You can also schedule one yourself from any thread."
            control={<Toggle checked={form.followupEnabled} onChange={(followupEnabled) => setForm({ ...form, followupEnabled })} label="Send follow-ups automatically" />}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Wait before each follow-up" htmlFor="fu-delay">
              <select id="fu-delay" className="sv-select" disabled={!form.followupEnabled} value={form.followupDelayDays} onChange={(event) => setForm({ ...form, followupDelayDays: Number(event.target.value) })}>
                {[1, 2, 3, 4, 5, 7, 10, 14].map((days) => <option key={days} value={days}>{days} day{days === 1 ? "" : "s"}</option>)}
              </select>
            </Field>
            <Field label="Most follow-ups per thread" htmlFor="fu-max">
              <select id="fu-max" className="sv-select" disabled={!form.followupEnabled} value={form.followupMax} onChange={(event) => setForm({ ...form, followupMax: Number(event.target.value) })}>
                {[0, 1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count === 0 ? "None" : count}</option>)}
              </select>
            </Field>
          </div>
        </SettingsCard>

        <SettingsCard title="Campaign settings" description="Review or override the AI SDR configuration for a single campaign: switch it off, require approval, use a different meeting type or link, or add notes that only apply there.">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {overrides.map((item) => (
              <div key={item.campaignId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--ds-border)" }}>
                <span style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{item.campaignName}</div>
                  <div className="sv-chips" style={{ marginTop: 4 }}>
                    {!item.hasOverride ? <span className="sv-hint">Same as workspace</span> : null}
                    {item.enabled === false ? <Badge tone="red">AI SDR off</Badge> : null}
                    {item.enabled === true ? <Badge tone="green">AI SDR on</Badge> : null}
                    {item.requireApproval === true ? <Badge tone="yellow">Approval required</Badge> : null}
                    {item.requireApproval === false ? <Badge>Sends automatically</Badge> : null}
                    {item.meetingTypeId ? <Badge tone="blue">Own meeting type</Badge> : null}
                    {item.bookingLink ? <Badge tone="blue">Own booking link</Badge> : null}
                    {item.notes ? <Badge tone="purple">Notes</Badge> : null}
                  </div>
                </span>
                <Button size="sm" icon={Pencil} onClick={() => setOverrideModal(item)}>Manage</Button>
              </div>
            ))}
            {overrides.length === 0 ? <p className="sv-hint">No campaigns yet. Campaigns you create will be listed here.</p> : null}
          </div>
        </SettingsCard>

        <SettingsCard title="Knowledge and rules" description="Give the AI SDR the business context it needs and define rules that always take priority.">
          <Field label="Knowledge Base" htmlFor="kb">
            <textarea id="kb" className="sv-textarea" style={{ minHeight: 220 }} value={form.knowledgeBase} onChange={(event) => setForm({ ...form, knowledgeBase: event.target.value })} placeholder="Company, product or service details, common questions and the answers you want it to give." />
            <p className="sv-hint">The AI SDR uses only this and your Brain as facts. It will not invent anything that is not written here.</p>
          </Field>
          <div>
            <div className="sv-field-label">Rules</div>
            <p className="sv-set-desc">Rules the AI SDR must follow with absolute priority. They override everything else.</p>
            <ol style={{ margin: "12px 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {bundle.rules.map((rule, index) => (
                <li key={rule.id} style={{ fontWeight: 450 }}>
                  <span style={{ display: "inline-flex", gap: 8, alignItems: "flex-start", width: "100%", justifyContent: "space-between" }}>
                    <span>{rule.rule}</span>
                    <button type="button" className="sv-icon-btn" aria-label={`Delete rule ${index + 1}`} onClick={() => void guarded(async () => setBundle(await aiSdrApi.saveRules(bundle.rules.filter((item) => item.id !== rule.id).map((item) => item.rule))))}>
                      <Trash2 className="sv-icon" aria-hidden />
                    </button>
                  </span>
                </li>
              ))}
              {bundle.rules.length === 0 ? <p className="sv-hint" style={{ listStyle: "none", marginLeft: -20 }}>No rules defined yet.</p> : null}
            </ol>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="sv-input" value={newRule} onChange={(event) => setNewRule(event.target.value)} placeholder='e.g. "Never quote prices. Route pricing questions to the call."' aria-label="New rule" />
              <Button icon={Plus} disabled={!newRule.trim()} onClick={() => void guarded(async () => { setBundle(await aiSdrApi.saveRules([...bundle.rules.map((item) => item.rule), newRule.trim()])); setNewRule(""); })}>
                Add rule
              </Button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard title="Meeting types" description="The kinds of calls your AI SDR can offer, how long each one lasts, and what it is called on your calendar.">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {bundle.meetingTypes.map((type) => (
              <div key={type.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 0.6fr 1.6fr auto", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--ds-border)" }}>
                <span style={{ fontWeight: 500 }}>{type.name} {type.isDefault ? <Badge>Default</Badge> : null}</span>
                <span className="sv-hint" style={{ fontSize: 13 }}>{type.campaignType}</span>
                <span className="sv-hint" style={{ fontSize: 13 }}>{type.durationMinutes} min</span>
                <span className="sv-hint" style={{ fontSize: 13 }}>{type.calendarTitle}</span>
                <span className="sv-actions">
                  <button type="button" className="sv-icon-btn" aria-label={`Edit ${type.name}`} onClick={() => setTypeModal(type)}><Pencil className="sv-icon" aria-hidden /></button>
                  <button type="button" className="sv-icon-btn" aria-label={`Delete ${type.name}`} disabled={bundle.meetingTypes.length <= 1} onClick={() => void guarded(async () => { await aiSdrApi.deleteMeetingType(type.id); await load(); })}><Trash2 className="sv-icon" aria-hidden /></button>
                </span>
              </div>
            ))}
          </div>
          <div><Button icon={Plus} onClick={() => setTypeModal("new")}>Add meeting type</Button></div>
        </SettingsCard>

        <SettingsCard title="Positive-reply webhook" description="Receive a signed POST request whenever the AI SDR detects positive buying interest on a thread. Use it to push hot leads into your own systems.">
          <Field label="Webhook URL (HTTPS)" htmlFor="webhook">
            <input id="webhook" className="sv-input" placeholder="https://your-server.com/webhook" value={form.webhookUrl} onChange={(event) => setForm({ ...form, webhookUrl: event.target.value })} />
          </Field>
          <div className="sv-actions" style={{ flexWrap: "wrap" }}>
            <Button disabled={dirty || !bundle.settings.webhookUrl} onClick={() => void guarded(async () => { const result = await aiSdrApi.testWebhook(); if (!result.ok) throw new Error(`Your endpoint answered with status ${result.status}.`); }, "Test event delivered.")}>Send test</Button>
            <Button icon={Copy} disabled={!bundle.settings.webhookSecretSet} onClick={() => void guarded(async () => setSecret((await aiSdrApi.webhookSecret()).secret))}>Show signing secret</Button>
            <Button icon={RotateCw} disabled={!bundle.settings.webhookSecretSet} onClick={() => void guarded(async () => setSecret((await aiSdrApi.rotateWebhookSecret()).secret), "Signing secret rotated. Update your endpoint.")}>Rotate secret</Button>
          </div>
          {secret ? <code className="sv-code">{secret}</code> : null}
          <p className="sv-hint">Each request carries X-SendVybe-Timestamp and X-SendVybe-Signature, the hex HMAC-SHA256 of "timestamp.body" with this secret. Save the URL first.</p>
        </SettingsCard>

        <SettingsCard title="Resources" description="Links to videos, PDFs or case studies the AI SDR may include when it directly helps answer a prospect.">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {bundle.resources.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--ds-border)" }}>
                <span style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{item.title}</div>
                  <div className="sv-hint" style={{ overflowWrap: "anywhere" }}>{item.url}</div>
                </span>
                <button type="button" className="sv-icon-btn" aria-label={`Delete ${item.title}`} onClick={() => void guarded(async () => { await aiSdrApi.deleteResource(item.id); await load(); })}><Trash2 className="sv-icon" aria-hidden /></button>
              </div>
            ))}
            {bundle.resources.length === 0 ? <p className="sv-hint">No resources yet.</p> : null}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr auto", gap: 8 }}>
            <input className="sv-input" placeholder="Title" aria-label="Resource title" value={resource.title} onChange={(event) => setResource({ ...resource, title: event.target.value })} />
            <input className="sv-input" placeholder="https://…" aria-label="Resource link" value={resource.url} onChange={(event) => setResource({ ...resource, url: event.target.value })} />
            <Button icon={Plus} disabled={!resource.title.trim() || !resource.url.trim()} onClick={() => void guarded(async () => { await aiSdrApi.createResource(resource); setResource({ title: "", url: "" }); await load(); })}>Add</Button>
          </div>
        </SettingsCard>

        <div className="sv-savebar">
          <span>{dirty ? "You have unsaved changes." : "AI SDR settings are up to date."}</span>
          <Button variant="primary" disabled={!dirty || saving} onClick={() => void saveForm()}>{saving ? "Saving…" : "Save settings"}</Button>
        </div>
      </div>

      {overrideModal ? <OverrideModal item={overrideModal} meetingTypes={bundle.meetingTypes} onClose={() => setOverrideModal(null)} onSaved={() => void loadOverrides()} /> : null}
      {typeModal ? <MeetingTypeModal initial={typeModal === "new" ? null : typeModal} onClose={() => setTypeModal(null)} onSaved={() => void load()} /> : null}
    </div>
  );
}
