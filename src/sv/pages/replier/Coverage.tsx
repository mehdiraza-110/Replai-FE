import { useState } from "react";
import { Link } from "react-router-dom";
import { replierApi, type CoverageCampaign } from "../../api/replier";
import { svPath } from "../../nav";
import { Badge, Card, EmptyState, SkeletonCard } from "../../ui";
import { Banner, errorText, useRemote } from "../crm/shared";
import "./replier.css";

/** Which campaigns this agent answers. agentId null = the built-in AI SDR (campaigns with no legacy agent). */
export function Coverage({ agentId, canEdit, builtIn }: { agentId: number | null; canEdit: boolean; builtIn: boolean }) {
  const { data, error, reload } = useRemote(() => replierApi.coverage(), []);
  const [failure, setFailure] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  if (error) return <Banner error={error} />;
  if (!data) return <SkeletonCard lines={4} />;

  async function assign(campaign: CoverageCampaign, next: number | null) {
    setBusyId(campaign.id); setFailure("");
    try { await replierApi.assignCampaign(campaign.id, next); reload(); } catch (caught) { setFailure(errorText(caught)); } finally { setBusyId(null); }
  }

  const mine = data.filter((c) => (builtIn ? c.agentId === null : c.agentId === agentId));
  const others = data.filter((c) => !mine.includes(c));

  return (
    <div className="rp-section" style={{ marginTop: 0 }}>
      <Banner error={failure} />
      <p className="sv-hint">
        {builtIn
          ? "The AI SDR answers every campaign that has no dedicated agent. Per-campaign pauses and notes are in AI SDR settings."
          : "This agent answers the campaigns below. A campaign has one agent at a time."}
      </p>
      <Card>
        {mine.length === 0 ? <EmptyState title="No campaigns yet" body={builtIn ? "Campaigns without a dedicated agent will appear here." : "Add a campaign from the list below."} /> : mine.map((campaign) => (
          <div key={campaign.id} className="rp-cov">
            <span><Link to={svPath(`cold-email-campaign-agent/${campaign.id}`)}>{campaign.name}</Link> <Badge tone={campaign.status === "Active" ? "green" : "neutral"}>{campaign.status}</Badge></span>
            {!builtIn && canEdit ? <button className="sv-btn" disabled={busyId === campaign.id} onClick={() => assign(campaign, null)}>Remove</button> : null}
          </div>
        ))}
      </Card>
      {!builtIn && canEdit && others.length > 0 ? (
        <>
          <h3 className="sv-set-title" style={{ fontSize: 14 }}>Other campaigns</h3>
          <Card>
            {others.map((campaign) => (
              <div key={campaign.id} className="rp-cov">
                <span>{campaign.name} <span className="sv-hint">{campaign.agentName ? `now answered by ${campaign.agentName}` : "now answered by the AI SDR"}</span></span>
                <button className="sv-btn" disabled={busyId === campaign.id} onClick={() => assign(campaign, agentId)}>Assign to this agent</button>
              </div>
            ))}
          </Card>
        </>
      ) : null}
    </div>
  );
}
