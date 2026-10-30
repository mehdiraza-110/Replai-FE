import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot, Pencil, Plus, Trash2 } from "lucide-react";
import { replierApi, type ReplierAgent } from "../../api/replier";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, SkeletonCard, Toggle } from "../../ui";
import { Banner, errorText, useRemote } from "../crm/shared";
import { useCanManage } from "../settings/shared";
import "./replier.css";

export function Replier() {
  useSvTitle([{ label: "Replier" }]);
  const navigate = useNavigate();
  const canEdit = useCanManage();
  const agents = useRemote(() => replierApi.agents(), []);
  const coverage = useRemote(() => replierApi.coverage().catch(() => []), []);
  const [failure, setFailure] = useState("");
  const [toDelete, setToDelete] = useState<ReplierAgent | null>(null);
  const [busy, setBusy] = useState(false);

  async function setActive(agent: ReplierAgent, active: boolean) {
    setFailure("");
    try { await replierApi.updateAgent(agent.id, { status: active ? "Active" : "Paused" }); agents.reload(); } catch (caught) { setFailure(errorText(caught)); }
  }
  async function remove() {
    if (!toDelete) return;
    setBusy(true);
    try { await replierApi.deleteAgent(toDelete.id); setToDelete(null); agents.reload(); coverage.reload(); } catch (caught) { setFailure(errorText(caught)); setToDelete(null); } finally { setBusy(false); }
  }
  const count = (id: number | null) => (coverage.data || []).filter((c) => c.agentId === id).length;

  return (
    <div className="sv-page">
      <PageHeader title="Replier" subtitle="The agents that answer prospect replies, and how each type of reply is handled."
        actions={canEdit ? <Button variant="primary" icon={Plus} onClick={() => navigate(svPath("replier/new"))}>New agent</Button> : undefined} />
      <Banner error={agents.error || failure} />
      <div className="rp-grid">
        <Card className="rp-agent">
          <div className="rp-agent-head">
            <div><h3 className="rp-agent-name">AI SDR</h3><div className="rp-agent-meta"><Badge tone="blue" icon={Bot}>Built-in</Badge></div></div>
          </div>
          <p className="rp-agent-desc">Answers every campaign that has no dedicated agent, books meetings from your calendar and follows up.</p>
          <div className="rp-agent-foot">
            <span className="sv-hint">{coverage.data ? `${count(null)} campaign${count(null) === 1 ? "" : "s"}` : "…"}</span>
            <Link className="sv-btn" to={svPath("replier/sdr")}><Pencil className="sv-icon" aria-hidden /> Manage</Link>
          </div>
        </Card>
        {agents.data === null && !agents.error ? [0, 1].map((i) => <SkeletonCard key={i} lines={2} />) : (agents.data || []).map((agent) => (
          <Card key={agent.id} className="rp-agent">
            <div className="rp-agent-head">
              <div>
                <h3 className="rp-agent-name">{agent.name}</h3>
                <div className="rp-agent-meta"><Badge tone={agent.status === "Active" ? "green" : "neutral"}>{agent.status}</Badge><Badge>{agent.automationMode}</Badge></div>
              </div>
              <Toggle checked={agent.status === "Active"} onChange={(active) => canEdit && setActive(agent, active)} label={`${agent.name} enabled`} />
            </div>
            <p className="rp-agent-desc">{agent.description || agent.objective}{agent.status !== "Active" && count(agent.id) > 0 ? " Its campaigns get no automatic reply while it is not active." : ""}</p>
            <div className="rp-agent-foot">
              <span className="sv-hint">{coverage.data ? `${count(agent.id)} campaign${count(agent.id) === 1 ? "" : "s"}` : "…"} · {agent.model}</span>
              <span className="sv-actions">
                {canEdit ? <button className="sv-icon-btn" aria-label={`Delete ${agent.name}`} onClick={() => setToDelete(agent)}><Trash2 className="sv-icon" aria-hidden /></button> : null}
                <Link className="sv-btn" to={svPath(`replier/${agent.id}`)}><Pencil className="sv-icon" aria-hidden /> Manage</Link>
              </span>
            </div>
          </Card>
        ))}
      </div>
      {agents.data && agents.data.length === 0 ? (
        <div className="rp-section"><EmptyState title="No custom agents yet" body="The AI SDR already answers your replies. Create an agent to give a campaign its own voice, knowledge and rules." /></div>
      ) : null}
      <Modal open={Boolean(toDelete)} title="Delete this agent?" onClose={() => setToDelete(null)}
        footer={<><Button onClick={() => setToDelete(null)}>Cancel</Button><Button variant="danger" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete"}</Button></>}>
        <p>{toDelete?.name} will stop answering replies and its reply types are removed. Campaigns it covered go back to the AI SDR.</p>
      </Modal>
    </div>
  );
}
