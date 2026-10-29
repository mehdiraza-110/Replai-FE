import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MessageSquarePlus, Send, Trash2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { aiApi, type ChatMessage, type ChatThreadFull, type Persona } from "../../api/ai";
import { useSvTitle } from "../../layout/chrome";
import { chatRoute, svPath } from "../../nav";
import { Button, Card } from "../../ui";
import { errorText } from "../cold-email/shared";
import { Banner, useRemote } from "../crm/shared";
import { Prose } from "./shared";

const TABS: Record<string, string[]> = {
  Plan: ["Build a growth plan for a $3M/year service business", "What's a compelling offer for HVAC companies?", "Help me choose a niche for my agency", "How should I price a monthly retainer?"],
  Automate: ["Write a cold email sequence for reaching financial advisors", "Draft follow-ups for prospects who went quiet", "How do I handle 'send me more info' replies?", "Write a short reply to a pricing question"],
  Analyze: ["How do I read my campaign's reply rate?", "What makes a discovery call score well?", "Help me fix email deliverability issues", "Why might my open rate be dropping?"],
  Learn: ["Explain SPF, DKIM and DMARC simply", "How long should I warm up a new domain?", "What is a good daily send limit per inbox?", "How do I write a subject line that gets opened?"],
};

export function Chat() {
  const { id } = useParams();
  const threadId = id && /^\d+$/.test(id) ? Number(id) : null;
  const navigate = useNavigate();
  const { user } = useAuth();
  useSvTitle([{ label: "AI Consultant" }]);
  const list = useRemote(() => aiApi.chatList(), []);
  const [tab, setTab] = useState("Plan");
  const [persona, setPersona] = useState("advisor");
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<ChatThreadFull | null>(null);
  const [pending, setPending] = useState<ChatMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setError("");
    setPending(null);
    if (!threadId) { setThread(null); return; }
    let cancelled = false;
    aiApi.chatGet(threadId).then((t) => { if (!cancelled) setThread(t); }).catch((caught) => { if (!cancelled) { setThread(null); setError(errorText(caught)); } });
    return () => { cancelled = true; };
  }, [threadId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [thread?.messages.length, pending]);

  const personas: Persona[] = list.data?.personas ?? [];
  const active = personas.find((p) => p.id === (thread?.persona ?? persona));

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError("");
    setDraft("");
    setPending({ id: -1, role: "user", content: message, createdAt: new Date().toISOString() });
    try {
      const out = await aiApi.chatSend({ threadId: threadId ?? undefined, persona, message });
      setThread((current) => ({ ...out.thread, messages: [...(current?.messages ?? []), out.userMessage, out.reply] }));
      setPending(null);
      list.reload();
      if (!threadId) navigate(svPath(`${chatRoute}/${out.thread.id}`), { replace: true });
    } catch (caught) {
      setPending(null);
      setDraft(message);
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function remove(target: number) {
    try { await aiApi.chatDelete(target); list.reload(); if (target === threadId) navigate(svPath(chatRoute)); } catch (caught) { setError(errorText(caught)); }
  }

  const messages = [...(thread?.messages ?? []), ...(pending ? [pending] : [])];
  const first = user?.first_name || "there";

  return (
    <div className="sv-chat">
      <aside className="sv-chat-side" aria-label="Chat history">
        <Button icon={MessageSquarePlus} onClick={() => navigate(svPath(chatRoute))}>New chat</Button>
        <div className="sv-chat-list">
          {list.data?.threads.length === 0 ? <p className="sv-hint" style={{ padding: "8px 4px" }}>Your chats will appear here.</p> : null}
          {list.data?.threads.map((t) => (
            <div key={t.id} className={`sv-chat-item${t.id === threadId ? " is-active" : ""}`}>
              <button type="button" className="sv-chat-open" onClick={() => navigate(svPath(`${chatRoute}/${t.id}`))} title={t.title}>{t.title}</button>
              <button type="button" className="sv-icon-btn" aria-label={`Delete chat: ${t.title}`} onClick={() => void remove(t.id)}><Trash2 className="sv-icon" aria-hidden /></button>
            </div>
          ))}
        </div>
      </aside>

      <section className="sv-chat-main">
        <Banner error={error} />
        {messages.length === 0 ? (
          <div className="sv-chat-welcome">
            <h1 className="sv-h1">How can I help you, {first}?</h1>
            <div className="sv-seg" role="tablist" aria-label="Topics">
              {Object.keys(TABS).map((name) => <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? "is-active" : ""} onClick={() => setTab(name)}>{name}</button>)}
            </div>
            <div className="sv-chat-prompts">
              {TABS[tab].map((prompt) => <button key={prompt} type="button" className="sv-chat-prompt" disabled={busy} onClick={() => void send(prompt)}>{prompt}</button>)}
            </div>
          </div>
        ) : (
          <div className="sv-chat-thread" aria-live="polite">
            {messages.map((m, index) => (
              <div key={`${m.id}-${index}`} className={`sv-cmsg is-${m.role}`}>
                <div className="sv-cmsg-bubble">{m.role === "assistant" ? <Prose text={m.content} /> : <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.content}</p>}</div>
              </div>
            ))}
            {busy ? <div className="sv-cmsg is-assistant"><div className="sv-cmsg-bubble sv-hint">{active?.name ?? "AI"} is thinking…</div></div> : null}
            <div ref={endRef} />
          </div>
        )}

        <Card className="sv-chat-composer">
          <textarea
            className="sv-textarea" aria-label="Message" rows={2} maxLength={8000} placeholder="Ask anything about growing your business…" value={draft} disabled={busy}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(draft); } }}
          />
          <div className="sv-chat-bar">
            <label className="sv-chat-persona">
              <span className="sv-hint">Advisor</span>
              <select className="sv-select" aria-label="Advisor" value={thread?.persona ?? persona} disabled={Boolean(thread) || busy} onChange={(event) => setPersona(event.target.value)}>
                {personas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <Button variant="primary" icon={Send} disabled={busy || !draft.trim()} onClick={() => void send(draft)}>{busy ? "Sending…" : "Send"}</Button>
          </div>
          {active ? <p className="sv-hint" style={{ margin: 0 }}>{active.name}: {active.blurb} Advice only. It can't send emails or change settings.</p> : null}
        </Card>
      </section>
    </div>
  );
}
