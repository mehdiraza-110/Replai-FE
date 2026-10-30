import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bot, Settings2 } from "lucide-react";
import { aiSdrApi } from "../../api/aiSdr";
import { replierApi } from "../../api/replier";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, Card, PageHeader, SkeletonPage, Toggle } from "../../ui";
import { Banner, errorText, useRemote } from "../crm/shared";
import { useCanManage } from "../settings/shared";
import { AgentForm } from "./AgentForm";
import { Coverage } from "./Coverage";
import { ReplyTypesEditor } from "./ReplyTypes";
import "./replier.css";

type Tab = "setup" | "types" | "coverage";

function Tabs({ tab, set }: { tab: Tab; set: (next: Tab) => void }) {
  const items: Array<[Tab, string]> = [["setup", "Setup"], ["types", "Reply types"], ["coverage", "Campaigns"]];
  return (
    <div className="sv-tabs" role="tablist" style={{ marginBottom: 16 }}>
      {items.map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} className={`sv-tab${tab === key ? " is-active" : ""}`} onClick={() => set(key)}>{label}</button>)}
    </div>
  );
}

function SdrSetup({ canEdit }: { canEdit: boolean }) {
  const { data, error, reload } = useRemote(() => aiSdrApi.settings(), []);
  const [failure, setFailure] = useState("");
  if (error) return <Banner error={error} />;
  if (!data) return <SkeletonPage />;
  const save = async (patch: { enabled?: boolean; requireApproval?: boolean }) => {
    setFailure("");
    try { await aiSdrApi.saveSettings(patch); reload(); } catch (caught) { setFailure(errorText(caught)); }
  };
  const row = (title: string, text: string, control: React.ReactNode) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "center" }}>
      <div><div style={{ fontWeight: 500 }}>{title}</div><p className="sv-hint" style={{ margin: "2px 0 0" }}>{text}</p></div>{control}
    </div>
  );
  return (
    <div className="rp-form">
      <Banner error={failure} />
      <Card className="rp-agent">
        {row("Answer incoming replies", "Turn the AI SDR off to stop all automatic replies for the workspace.", <Toggle checked={data.settings.enabled} onChange={(enabled) => canEdit && save({ enabled })} label="Answer incoming replies" />)}
        {row("Approve replies before they are sent", "Default for every reply type; the Reply types tab can override it per type.", <Toggle checked={data.settings.requireApproval} onChange={(requireApproval) => canEdit && save({ requireApproval })} label="Approve replies before they are sent" />)}
      </Card>
      <Card className="rp-agent">
        <div style={{ fontWeight: 500 }}>What the AI SDR knows</div>
        <p className="sv-hint">{data.rules.length} rule{data.rules.length === 1 ? "" : "s"} · {data.settings.knowledgeBase.trim() ? `${data.settings.knowledgeBase.trim().length.toLocaleString()} characters of knowledge base` : "no knowledge base yet"} · {data.brain.companyName ? `Brain: ${data.brain.companyName}` : "Brain not filled in"}</p>
        <div className="sv-actions">
          <Link className="sv-btn" to={svPath("settings/ai-sdr-agent")}><Settings2 className="sv-icon" aria-hidden /> AI SDR settings</Link>
          <Link className="sv-btn" to={svPath("settings/brain")}>Brain</Link>
          <Link className="sv-btn" to={svPath("ai-sdr")}>Open inbox</Link>
        </div>
      </Card>
    </div>
  );
}

export function AgentPage() {
  const { agentId = "" } = useParams();
  const navigate = useNavigate();
  const canEdit = useCanManage();
  const isNew = agentId === "new";
  const builtIn = agentId === "sdr";
  const numericId = builtIn || isNew ? null : Number(agentId);
  const [tab, setTab] = useState<Tab>("setup");
  const agents = useRemote(() => (numericId ? replierApi.agents() : Promise.resolve([])), [numericId]);
  const agent = numericId ? agents.data?.find((entry) => entry.id === numericId) ?? null : null;
  const title = builtIn ? "AI SDR" : isNew ? "New agent" : agent?.name || "Agent";
  useSvTitle([{ label: "Replier" }, { label: title }]);

  const loading = numericId !== null && agents.data === null && !agents.error;
  if (loading) return <SkeletonPage />;
  if (agents.error) return <div className="sv-page"><Banner error={agents.error} /></div>;
  if (numericId !== null && !agent) return <div className="sv-page"><Link to={svPath("replier")} className="rp-back"><ArrowLeft className="sv-icon" aria-hidden /> All agents</Link><Banner error="This agent no longer exists." /></div>;

  return (
    <div className="sv-page">
      <Link to={svPath("replier")} className="rp-back"><ArrowLeft className="sv-icon" aria-hidden /> All agents</Link>
      <PageHeader title={title} subtitle={builtIn ? "The built-in agent that answers replies to your campaigns." : isNew ? "Set up an agent, then choose how it answers each type of reply." : agent?.description || "Replies to prospects for the campaigns you assign."}
        actions={builtIn ? <Badge tone="blue" icon={Bot}>Built-in</Badge> : agent ? <Badge tone={agent.status === "Active" ? "green" : "neutral"}>{agent.status}</Badge> : undefined} />
      {isNew ? (
        <AgentForm agent={null} canEdit={canEdit} onSaved={(saved) => navigate(svPath(`replier/${saved.id}`), { replace: true })} />
      ) : (
        <>
          <Tabs tab={tab} set={setTab} />
          {tab === "setup" ? (builtIn ? <SdrSetup canEdit={canEdit} /> : <AgentForm key={agent!.updatedAt} agent={agent} canEdit={canEdit} onSaved={() => agents.reload()} />) : null}
          {tab === "types" ? <ReplyTypesEditor agentId={builtIn ? "sdr" : numericId!} canEdit={canEdit} builtIn={builtIn} /> : null}
          {tab === "coverage" ? <Coverage agentId={numericId} canEdit={canEdit} builtIn={builtIn} /> : null}
        </>
      )}
    </div>
  );
}
