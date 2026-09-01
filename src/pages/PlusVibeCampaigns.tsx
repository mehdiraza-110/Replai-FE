import { useEffect, useMemo, useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { LoadingState } from "../components/ui/LoadingState";
import { aiAgentService, plusVibeService } from "../services/api";
import type { Agent, PlusVibeCampaign } from "../types";

export function PlusVibeCampaigns() {
  const [campaigns, setCampaigns] = useState<PlusVibeCampaign[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savingCampaignId, setSavingCampaignId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    Promise.all([
      plusVibeService.listCampaigns(),
      aiAgentService.list(),
    ])
      .then(([campaignItems, agentItems]) => {
        if (!isActive) return;
        setCampaigns(campaignItems);
        setAgents(agentItems.filter((agent) => agent.id));
      })
      .catch((requestError: Error) => {
        if (!isActive) return;
        setError(requestError.message || "Unable to load campaigns");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const assigned = campaigns.filter((campaign) => campaign.assignedAiAgentId).length;
    const active = campaigns.filter((campaign) => campaign.status === "ACTIVE" || campaign.status === "RUNNING").length;

    return { assigned, active };
  }, [campaigns]);

  async function syncCampaigns() {
    setIsSyncing(true);
    setNotice(null);
    setError(null);

    try {
      const synced = await plusVibeService.syncCampaigns();
      setCampaigns(synced);
      setNotice(`${synced.length} PlusVibe campaigns synced.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to sync PlusVibe campaigns");
    } finally {
      setIsSyncing(false);
    }
  }

  async function assignAgent(campaign: PlusVibeCampaign, value: string) {
    const nextAgentId = value ? Number(value) : null;
    const previousCampaigns = campaigns;

    setSavingCampaignId(campaign.id);
    setError(null);
    setCampaigns((current) =>
      current.map((item) =>
        item.id === campaign.id
          ? {
              ...item,
              assignedAiAgentId: nextAgentId,
              assignedAgent: nextAgentId
                ? {
                    id: nextAgentId,
                    name: agents.find((agent) => agent.id === nextAgentId)?.name || "Assigned agent",
                    status: agents.find((agent) => agent.id === nextAgentId)?.status || "Active",
                  }
                : null,
            }
          : item
      )
    );

    try {
      const updated = await plusVibeService.assignCampaignAgent(campaign.id, nextAgentId);
      setCampaigns((current) => current.map((item) => (item.id === campaign.id ? updated : item)));
    } catch (requestError) {
      setCampaigns(previousCampaigns);
      setError(requestError instanceof Error ? requestError.message : "Unable to assign AI agent");
    } finally {
      setSavingCampaignId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-3">
          <Summary label="Campaigns" value={String(campaigns.length)} />
          <Summary label="Assigned" value={String(stats.assigned)} />
          <Summary label="Active" value={String(stats.active)} />
        </div>
        <Button isDisabled={isSyncing} onClick={syncCampaigns}>
          <RefreshCw className="size-4" />
          {isSyncing ? "Syncing" : "Sync PlusVibe"}
        </Button>
      </div>

      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
      {notice ? <p className="text-sm font-medium text-success">{notice}</p> : null}

      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header>
          <Card.Title>Campaign agent routing</Card.Title>
          <Card.Description>Assign the AI agent that should handle replies from each PlusVibe campaign.</Card.Description>
        </Card.Header>
        <Card.Content className="overflow-x-auto p-0">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-y border-border/70 text-xs text-muted">
              <tr>
                {["Campaign", "Status", "Last Reply", "Last Sent", "AI Agent", "Route"].map((header) => (
                  <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4" colSpan={6}>
                    <LoadingState />
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={6}>
                    No campaigns synced yet. Sync PlusVibe to assign AI agents.
                  </td>
                </tr>
              ) : campaigns.map((campaign) => (
                <tr className="border-b border-border/60 last:border-0" key={campaign.id}>
                  <td className="px-4 py-4">
                    <p className="max-w-[320px] truncate font-semibold text-foreground">{campaign.name}</p>
                    <p className="mt-1 text-[12px] text-muted">{campaign.plusVibeCampaignId}</p>
                  </td>
                  <td className="px-4 py-4">
                    <Chip color={campaign.status === "ACTIVE" || campaign.status === "RUNNING" ? "success" : "default"} size="sm" variant="soft">
                      {campaign.status || "Unknown"}
                    </Chip>
                  </td>
                  <td className="px-4 py-4 text-muted">{formatDate(campaign.lastLeadReplied)}</td>
                  <td className="px-4 py-4 text-muted">{formatDate(campaign.lastLeadSent)}</td>
                  <td className="px-4 py-4">
                    <select
                      className="agent-field h-9 w-[240px] px-3 text-sm text-foreground outline-none"
                      disabled={savingCampaignId === campaign.id}
                      value={campaign.assignedAiAgentId || ""}
                      onChange={(event) => assignAgent(campaign, event.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-muted">
                    {campaign.assignedAgent ? "Campaign replies route to assigned AI agent" : "Replies wait for manual review"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[112px] rounded-xl bg-surface px-3 py-2 shadow-[0_1px_3px_color-mix(in_oklch,var(--foreground)_10%,transparent)]">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold leading-none text-foreground">{value}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not yet";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
