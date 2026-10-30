import { useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, TestTube2, Trash2 } from "lucide-react";
import { aiKeysService, type AiKeyProviderStatus, type AiProvider } from "../../../services/aiKeysApi";
import { useSvTitle } from "../../layout/chrome";
import { Badge, Button, Field, SkeletonCard } from "../../ui";
import { ConfirmModal, dateText, Notice, ReadOnlyNote, SettingsPageFrame, errorText, useCanManage, useRemote } from "../settings/shared";
import "./tools.css";

const PROVIDERS: Array<{ id: AiProvider; name: string; hint: string; placeholder: string }> = [
  { id: "openai", name: "OpenAI", hint: "Used for GPT models.", placeholder: "sk-..." },
  { id: "anthropic", name: "Anthropic", hint: "Used for Claude models.", placeholder: "sk-ant-..." },
  { id: "gemini", name: "Google Gemini", hint: "Used for Gemini models.", placeholder: "AIza..." },
];

interface Feedback { tone: "ok" | "error"; message: string }

export function AIKeys() {
  useSvTitle([{ label: "Tools" }, { label: "AI Keys" }]);
  const canEdit = useCanManage();
  const overview = useRemote(() => aiKeysService.list(), []);
  const data = overview.data;

  return (
    <SettingsPageFrame title="AI Keys" subtitle="The AI provider keys this workspace uses">
      <Notice tone="ok">
        Your keys, your usage. The AI SDR replies, the AI Consultant, Market Researcher, Offer Creator, Growth Plan Creator and Sites all use the keys below. Keys are stored encrypted and only a short preview is ever shown.
        {data?.platformAiEnabled
          ? " This workspace may also fall back to the platform's shared key when you haven't added your own."
          : " Without a key for a provider, the AI features that use it will not run."}
      </Notice>
      {!canEdit ? <ReadOnlyNote /> : null}
      {overview.error ? <Notice tone="error">{overview.error}</Notice> : null}
      {!data && !overview.error ? <>{[0, 1, 2].map((i) => <SkeletonCard key={i} lines={3} />)}</> : null}
      {data ? PROVIDERS.map((provider) => (
        <ProviderCard key={provider.id} canEdit={canEdit} definition={provider} status={data.providers.find((item) => item.provider === provider.id) ?? null} onChanged={overview.reload} />
      )) : null}
    </SettingsPageFrame>
  );
}

function ProviderCard({ canEdit, definition, status, onChanged }: { canEdit: boolean; definition: (typeof PROVIDERS)[number]; status: AiKeyProviderStatus | null; onChanged: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "test" | "remove">("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const hasOwnKey = Boolean(status?.configured && status.source !== "platform");
  const usesPlatform = status?.source === "platform";
  const showForm = canEdit && (editing || !hasOwnKey);

  async function save(event: FormEvent) {
    event.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) { setFeedback({ tone: "error", message: `Paste your ${definition.name} API key first.` }); return; }
    setBusy("save"); setFeedback(null);
    try {
      await aiKeysService.save(definition.id, trimmed);
      setApiKey(""); setEditing(false); onChanged();
      setFeedback({ tone: "ok", message: `${definition.name} key saved and verified.` });
    } catch (caught) { setFeedback({ tone: "error", message: errorText(caught) }); } finally { setBusy(""); }
  }

  async function test() {
    setBusy("test"); setFeedback(null);
    try {
      const result = await aiKeysService.test(definition.id);
      setFeedback({ tone: result.ok ? "ok" : "error", message: result.message || (result.ok ? "The key works." : "The provider rejected this key.") });
    } catch (caught) { setFeedback({ tone: "error", message: errorText(caught) }); } finally { setBusy(""); }
  }

  async function remove() {
    setBusy("remove"); setFeedback(null);
    try {
      await aiKeysService.remove(definition.id);
      setEditing(false); onChanged();
      setFeedback({ tone: "ok", message: `${definition.name} key removed.` });
    } catch (caught) { setFeedback({ tone: "error", message: errorText(caught) }); } finally { setBusy(""); }
  }

  return (
    <section className="sv-set-card">
      <div className="sv-tools-head">
        <div className="sv-tools-title">
          <span className="sv-tools-icon"><KeyRound className="sv-icon" aria-hidden /></span>
          <div><h2>{definition.name}</h2><p>{definition.hint}</p></div>
        </div>
        {hasOwnKey ? <Badge tone="green">Your key connected</Badge> : usesPlatform ? <Badge tone="blue">Platform key in use</Badge> : <Badge tone="yellow">Not connected</Badge>}
      </div>

      {hasOwnKey ? (
        <div className="sv-tools-box">
          <span className="sv-hint">Saved key</span>
          <p className="sv-tools-mono">{status?.preview || "Hidden"}</p>
          {status?.updated_at ? <span className="sv-hint">Updated {dateText(status.updated_at)}</span> : null}
        </div>
      ) : null}
      {usesPlatform ? <p className="sv-set-desc" style={{ margin: 0 }}>No key of your own is saved, so this workspace uses the platform's shared {definition.name} key. Add your own key to use your own account and limits.</p> : null}

      {showForm ? (
        <form className="sv-tools-keyform" onSubmit={save}>
          <Field label={hasOwnKey ? "New API key" : "API key"} htmlFor={`key-${definition.id}`}>
            <input id={`key-${definition.id}`} className="sv-input" type="password" autoComplete="off" spellCheck={false} placeholder={definition.placeholder} value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
          </Field>
          <div className="sv-tools-row">
            <Button type="submit" variant="primary" disabled={busy !== "" || !apiKey.trim()}>{busy === "save" ? "Verifying…" : hasOwnKey ? "Replace key" : "Save key"}</Button>
            {editing ? <Button disabled={busy !== ""} onClick={() => { setEditing(false); setApiKey(""); setFeedback(null); }}>Cancel</Button> : null}
          </div>
        </form>
      ) : null}

      {canEdit && hasOwnKey && !editing ? (
        <div className="sv-tools-row">
          <Button icon={TestTube2} disabled={busy !== ""} onClick={() => void test()}>{busy === "test" ? "Testing…" : "Test key"}</Button>
          <Button disabled={busy !== ""} onClick={() => setEditing(true)}>Replace key</Button>
          <Button icon={Trash2} disabled={busy !== ""} onClick={() => setConfirmRemove(true)}>Remove</Button>
        </div>
      ) : null}

      {feedback ? <p className={feedback.tone === "ok" ? "sv-tools-ok" : "sv-tools-bad"} role={feedback.tone === "error" ? "alert" : "status"} style={{ margin: 0, display: "flex", gap: 6, alignItems: "flex-start" }}>{feedback.tone === "ok" ? <CheckCircle2 className="sv-icon" aria-hidden /> : null}{feedback.message}</p> : null}
      {confirmRemove ? <ConfirmModal title={`Remove the ${definition.name} key?`} body={`AI features that use ${definition.name} stop working in this workspace until you add a key again${status?.source === "platform" ? "" : " (unless the platform key is allowed as a fallback)"}.`} confirmLabel="Yes, remove" onConfirm={remove} onClose={() => setConfirmRemove(false)} /> : null}
    </section>
  );
}


