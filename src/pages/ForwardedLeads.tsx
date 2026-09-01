import { useCallback, useEffect, useState } from "react";
import { Button, Card, Spinner } from "@heroui/react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusPill } from "../components/ui/StatusPill";
import { useRealtimeEvent } from "../hooks/useRealtimeEvent";
import { forwardedLeadService } from "../services/api";
import type { ForwardedLeadPage, ForwardedLeadRecord } from "../types";

const PAGE_SIZE = 10;

export function ForwardedLeads() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ForwardedLeadPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(async (nextPage: number, options: { quiet?: boolean } = {}) => {
    if (!options.quiet) setIsLoading(true);
    setError(null);

    try {
      const response = await forwardedLeadService.list({ page: nextPage, limit: PAGE_SIZE });
      setData(response);
      setPage(response.page);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load forwarded leads");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads(1);
  }, [loadLeads]);

  // Live push: the moment any lead's reply is forwarded (or fails to forward)
  // to GHL, this list updates instantly for everyone.
  useRealtimeEvent(["ghl.conversation."], () => {
    loadLeads(page, { quiet: true });
  });

  const forwardedLeads = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="mx-auto max-w-[1400px]">
      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header className="flex-row items-center justify-between gap-4">
          <div>
            <Card.Title>Forwarded Leads</Card.Title>
            <Card.Description>Leads sent to external platforms after an AI agent's reply was auto-sent or approved.</Card.Description>
          </div>
          <Button size="sm" variant="secondary" onPress={() => loadLeads(page)} isDisabled={isLoading}>
            {isLoading ? <Spinner color="accent" size="sm" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
        </Card.Header>

        <Card.Content className="p-0">
          {error ? (
            <div className="mx-4 mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="border-y border-border/70 text-xs text-muted">
                <tr>
                  {["Lead", "Platform", "Destination", "Status", "Contact ID", "Error", "Forwarded"].map((header) => (
                    <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && forwardedLeads.length === 0 ? <LoadingRows /> : null}
                {!isLoading && forwardedLeads.length === 0 ? <EmptyRow /> : null}
                {forwardedLeads.map((lead) => (
                  <tr className="border-b border-border/60 align-top last:border-0" key={lead.id}>
                    <td className="max-w-[220px] truncate px-4 py-4 font-medium text-foreground">{lead.leadEmail || "Unknown"}</td>
                    <td className="px-4 py-4 text-foreground">{lead.platform}</td>
                    <td className="px-4 py-4 text-muted">{lead.destination || "Not configured"}</td>
                    <td className="px-4 py-4"><StatusPill tone={lead.status === "Failed" ? "danger" : "success"}>{lead.status}</StatusPill></td>
                    <td className="max-w-[160px] truncate px-4 py-4 text-muted">{lead.contactId || "None"}</td>
                    <td className="max-w-[220px] truncate px-4 py-4 text-muted">{lead.errorMessage || "None"}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{formatDateTime(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-sm text-muted">
            <span>Showing {forwardedLeads.length} of {total} records · Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onPress={() => loadLeads(page - 1)} isDisabled={isLoading || page <= 1}>
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button size="sm" variant="secondary" onPress={() => loadLeads(page + 1)} isDisabled={isLoading || page >= totalPages}>
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

function LoadingRows() {
  return (
    <tr>
      <td className="px-4 py-4" colSpan={7}>
        <LoadingState />
      </td>
    </tr>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td className="px-4 py-10 text-center text-muted" colSpan={7}>
        No leads have been forwarded yet.
      </td>
    </tr>
  );
}

function formatDateTime(value: ForwardedLeadRecord["createdAt"]) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
