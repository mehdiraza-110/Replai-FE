import { useEffect, useState } from "react";
import { replierApi, type AgentInput, type KnowledgeSource, type ReplierAgent } from "../../api/replier";
import { Button, Field, SkeletonLines } from "../../ui";
import { Banner, errorText, useRemote } from "../crm/shared";
import "./replier.css";

const PROVIDERS = ["OpenAI", "Anthropic", "Google Gemini"];
const MODES = [
  { value: "AI Draft", label: "AI draft: writes a reply, a person sends it" },
  { value: "AI + Approval", label: "AI + approval: drafts every reply for review" },
  { value: "AI Auto-Reply", label: "AI auto-reply: sends confident replies on its own" },
  { value: "Manual", label: "Manual: the AI does not write replies" },
];
const TONES = ["Consultative", "Friendly", "Professional", "Direct", "Casual"];
const STYLES = ["Concise", "Detailed", "Conversational"];

export interface AgentFormState {
  name: string; description: string; role: string; persona: string; tone: string; responseStyle: string;
  companyName: string; website: string; objective: string; language: string; responseRules: string;
  knowledgeSources: string; knowledgeSourceIds: number[]; aiProvider: string; model: string;
  automationMode: string; confidenceThreshold: number; humanReview: boolean; status: "Active" | "Paused" | "Draft";
}

export const blankAgent: AgentFormState = {
  name: "", description: "", role: "Sales representative", persona: "Friendly, concise and professional. Never pushy.", tone: "Consultative", responseStyle: "Concise",
  companyName: "", website: "", objective: "Schedule a meeting", language: "English",
  responseRules: "Keep replies short. Ask one question at a time. Never invent facts, pricing or guarantees.",
  knowledgeSources: "", knowledgeSourceIds: [], aiProvider: "OpenAI", model: "gpt-4o",
  automationMode: "AI Draft", confidenceThreshold: 95, humanReview: true, status: "Active",
};

export const toFormState = (agent: ReplierAgent): AgentFormState => ({
  name: agent.name, description: agent.description || "", role: agent.role, persona: agent.persona, tone: agent.tone, responseStyle: agent.responseStyle,
  companyName: agent.companyName, website: agent.website || "", objective: agent.objective, language: agent.language, responseRules: agent.responseRules || "",
  knowledgeSources: agent.knowledgeSources || "", knowledgeSourceIds: agent.knowledgeSourceIds, aiProvider: agent.aiProvider, model: agent.model,
  automationMode: agent.automationMode, confidenceThreshold: agent.confidenceThreshold, humanReview: agent.humanReview,
  status: agent.status === "Archived" ? "Paused" : agent.status,
});

const toInput = (form: AgentFormState): AgentInput & { autoReplyEnabled: boolean } => ({
  ...form,
  website: form.website || undefined,
  humanReview: form.automationMode !== "AI Auto-Reply",
  autoReplyEnabled: form.automationMode === "AI Auto-Reply",
});

const inp = (id: string, form: AgentFormState, set: (next: AgentFormState) => void, key: keyof AgentFormState, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
  <input id={id} className="sv-input" value={String(form[key])} onChange={(event) => set({ ...form, [key]: event.target.value })} {...props} />
);

export function AgentForm({ agent, canEdit, onSaved }: { agent: ReplierAgent | null; canEdit: boolean; onSaved: (saved: ReplierAgent) => void }) {
  const [form, setForm] = useState<AgentFormState>(agent ? toFormState(agent) : blankAgent);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const knowledge = useRemote(() => replierApi.knowledge().catch(() => [] as KnowledgeSource[]), []);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    replierApi.models(form.aiProvider).then((list) => { if (!cancelled) setModels(list); }).catch(() => { if (!cancelled) setModels([]); });
    return () => { cancelled = true; };
  }, [form.aiProvider]);

  const missing = !form.name.trim() ? "Give the agent a name." : !form.companyName.trim() ? "Enter the company the agent speaks for." : !form.model.trim() ? "Choose a model." : "";

  async function save() {
    if (missing) { setError(missing); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = agent ? await replierApi.updateAgent(agent.id, toInput(form)) : await replierApi.createAgent(toInput(form));
      setNotice("Saved.");
      onSaved(saved);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  const toggleSource = (id: number) => setForm({ ...form, knowledgeSourceIds: form.knowledgeSourceIds.includes(id) ? form.knowledgeSourceIds.filter((x) => x !== id) : [...form.knowledgeSourceIds, id] });
  const lock = { disabled: !canEdit };

  return (
    <div className="rp-form">
      <Banner error={error} />
      <div className="rp-row2">
        <Field label="Name" htmlFor="rp-name">{inp("rp-name", form, setForm, "name", { placeholder: "Alex, outbound replies", ...lock })}</Field>
        <Field label="Status" htmlFor="rp-status">
          <select id="rp-status" className="sv-select" value={form.status} {...lock} onChange={(event) => setForm({ ...form, status: event.target.value as AgentFormState["status"] })}>
            <option value="Active">Active</option><option value="Paused">Paused</option><option value="Draft">Draft</option>
          </select>
        </Field>
      </div>
      <Field label="What this agent is for" htmlFor="rp-desc">{inp("rp-desc", form, setForm, "description", { placeholder: "Handles replies to the SaaS founders campaign", ...lock })}</Field>
      <div className="rp-row2">
        <Field label="Company it speaks for" htmlFor="rp-company">{inp("rp-company", form, setForm, "companyName", lock)}</Field>
        <Field label="Website" htmlFor="rp-site">{inp("rp-site", form, setForm, "website", { placeholder: "https://", ...lock })}</Field>
      </div>
      <div className="rp-row2">
        <Field label="Role" htmlFor="rp-role">{inp("rp-role", form, setForm, "role", lock)}</Field>
        <Field label="Goal of each conversation" htmlFor="rp-objective">{inp("rp-objective", form, setForm, "objective", lock)}</Field>
      </div>
      <Field label="Personality and tone of voice" htmlFor="rp-persona">
        <textarea id="rp-persona" className="sv-textarea" rows={2} value={form.persona} {...lock} onChange={(event) => setForm({ ...form, persona: event.target.value })} />
      </Field>
      <div className="rp-row2">
        <Field label="Tone" htmlFor="rp-tone">
          <select id="rp-tone" className="sv-select" value={form.tone} {...lock} onChange={(event) => setForm({ ...form, tone: event.target.value })}>
            {[...new Set([...TONES, form.tone])].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Reply style" htmlFor="rp-style">
          <select id="rp-style" className="sv-select" value={form.responseStyle} {...lock} onChange={(event) => setForm({ ...form, responseStyle: event.target.value })}>
            {[...new Set([...STYLES, form.responseStyle])].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Instructions and rules" htmlFor="rp-rules">
        <textarea id="rp-rules" className="sv-textarea" rows={4} value={form.responseRules} {...lock} onChange={(event) => setForm({ ...form, responseRules: event.target.value })} />
      </Field>
      <Field label="Knowledge (brain)">
        <textarea className="sv-textarea" rows={3} aria-label="Knowledge notes" placeholder="Facts the agent may use: offer, pricing, FAQs, proof points." value={form.knowledgeSources} {...lock} onChange={(event) => setForm({ ...form, knowledgeSources: event.target.value })} />
        {knowledge.data === null ? <SkeletonLines lines={2} /> : knowledge.data.length === 0 ? (
          <p className="sv-hint">No knowledge documents yet. Add documents under Knowledge to attach them here.</p>
        ) : (
          <div className="rp-checks" role="group" aria-label="Knowledge documents">
            {knowledge.data.map((source) => (
              <label key={source.id} className="rp-check">
                <input type="checkbox" className="sv-check" disabled={!canEdit} checked={form.knowledgeSourceIds.includes(source.id)} onChange={() => toggleSource(source.id)} />
                {source.title} <span className="sv-hint">{source.sourceType}{source.category ? ` · ${source.category}` : ""}</span>
              </label>
            ))}
          </div>
        )}
      </Field>
      <div className="rp-row2">
        <Field label="Language" htmlFor="rp-lang">{inp("rp-lang", form, setForm, "language", lock)}</Field>
        <Field label="AI provider" htmlFor="rp-provider">
          <select id="rp-provider" className="sv-select" value={form.aiProvider} {...lock} onChange={(event) => setForm({ ...form, aiProvider: event.target.value })}>
            {[...new Set([...PROVIDERS, form.aiProvider])].map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
      </div>
      <div className="rp-row2">
        <Field label="Model" htmlFor="rp-model">
          {inp("rp-model", form, setForm, "model", { list: "rp-models", ...lock })}
          <datalist id="rp-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
        </Field>
        <Field label="Confidence needed to auto-send (%)" htmlFor="rp-conf">
          <input id="rp-conf" type="number" min={0} max={100} className="sv-input" value={form.confidenceThreshold} {...lock} onChange={(event) => setForm({ ...form, confidenceThreshold: Number(event.target.value) })} />
        </Field>
      </div>
      <Field label="General approach" htmlFor="rp-mode">
        <select id="rp-mode" className="sv-select" value={form.automationMode} {...lock} onChange={(event) => setForm({ ...form, automationMode: event.target.value })}>
          {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <p className="sv-hint" style={{ marginTop: 4 }}>The Reply types tab refines this for each type of reply.</p>
      </Field>
      <div className="sv-actions">
        <Button variant="primary" disabled={!canEdit || busy} onClick={save}>{busy ? "Saving…" : agent ? "Save agent" : "Create agent"}</Button>
        {notice ? <span className="sv-hint" role="status">{notice}</span> : null}
      </div>
    </div>
  );
}
