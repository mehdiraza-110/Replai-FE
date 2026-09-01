import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button, Chip, Input, ListBox, Select, Table } from "@heroui/react";
import { ChevronDown, Database, CheckCircle2, FileText, Plus, Search, Trash2 } from "lucide-react";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusPill } from "../components/ui/StatusPill";
import { useRealtimeEvent } from "../hooks/useRealtimeEvent";
import { knowledgeService } from "../services/api";
import type { KnowledgeItem } from "../types";

const categories = ["Sales FAQs", "Objection Handling", "Product Details", "Policies", "Qualification", "Pricing", "General"];
const reviewStates = ["Published", "Review", "Draft"];

export function KnowledgeBase() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 10;

  const publishedCount = useMemo(() => items.filter((item) => item.status === "Published").length, [items]);
  const indexedCount = useMemo(() => items.filter((item) => item.chunks > 0).length, [items]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      loadSources(1);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search, status, category]);

  useEffect(() => {
    loadSources(page);
  }, [page]);

  // Live push: another admin adding or removing a source updates this list
  // instantly for everyone browsing the knowledge base.
  useRealtimeEvent(["knowledge_source."], () => {
    loadSources(page, { quiet: true });
  });

  async function loadSources(nextPage = page, options: { quiet?: boolean } = {}) {
    try {
      if (!options.quiet) setIsLoading(true);
      setError(null);
      const data = await knowledgeService.list({
        category,
        limit,
        page: nextPage,
        search,
        status,
      });

      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      setError(error instanceof Error ? error.message : "We could not load the knowledge base. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteSource(sourceId: number) {
    try {
      await knowledgeService.delete(sourceId);
      await loadSources(page);
    } catch (error) {
      setError(error instanceof Error ? error.message : "We could not remove that knowledge source. Please try again.");
    }
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold leading-6 text-foreground">Knowledge Base</h1>
          <p className="mt-1 text-[13px] leading-5 text-muted">Approved source material your AI agents can use while drafting replies.</p>
        </div>

        <Link to="/knowledge/new">
          <Button className="h-[34px] rounded-full px-4 text-[14px] font-semibold leading-none" size="sm">
            <Plus className="size-[17px]" strokeWidth={2.35} />
            Add Knowledge
          </Button>
        </Link>
      </div>

        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard icon={<Database className="size-4" />} label="Total Sources" value={total} />
          <SummaryCard icon={<CheckCircle2 className="size-4" />} label="Published" value={publishedCount} />
          <SummaryCard icon={<FileText className="size-4" />} label="Indexed For AI" value={indexedCount} />
        </div>

        <section className="apple-shadow rounded-[20px] bg-surface p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold leading-5 text-foreground">All Knowledge Sources</h2>
              <p className="mt-1 text-[13px] leading-5 text-muted">Attach published sources to agents from the AI Agent knowledge tab.</p>
            </div>
            <Chip className="h-[20px] min-h-[20px] px-2 text-[11px] font-semibold" size="sm" variant="soft">
              {total} total
            </Chip>
          </div>

          <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_160px_180px]">
            <div className="relative h-[36px]">
              <Search className="pointer-events-none absolute left-[14px] top-1/2 z-10 size-[14px] -translate-y-1/2 text-muted" strokeWidth={2} />
              <Input
                aria-label="Search knowledge base"
                className="agent-field h-9 w-full pl-9 text-sm text-foreground placeholder:text-muted"
                placeholder="Search sources..."
                type="search"
                value={search}
                variant="primary"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <SelectField label="Status" options={["All", ...reviewStates]} value={status} onChange={setStatus} />
            <SelectField label="Category" options={["All", ...categories]} value={category} onChange={setCategory} />
          </div>

          {error ? <p className="mb-3 rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">{error}</p> : null}

          <div className="overflow-hidden rounded-[14px] border border-border/70">
            <Table className="employee-table" variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Knowledge base table">
                  <Table.Header>
                    <Table.Column className="w-[112px]">Source ID</Table.Column>
                    <Table.Column className="w-[300px]">
                      <span className="inline-flex items-center gap-1">Knowledge Source <ChevronDown className="size-3 rotate-180" /></span>
                    </Table.Column>
                    <Table.Column className="w-[120px]">Type</Table.Column>
                    <Table.Column className="w-[210px]">Agent Access</Table.Column>
                    <Table.Column className="w-[96px] text-right">Chunks</Table.Column>
                    <Table.Column className="w-[128px]">Status</Table.Column>
                    <Table.Column className="w-[118px] text-right">Updated</Table.Column>
                    <Table.Column className="w-[76px] text-right">Actions</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {isLoading ? (
                      <Table.Row>
                        <Table.Cell colSpan={8}>
                          <LoadingState />
                        </Table.Cell>
                      </Table.Row>
                    ) : items.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={8}>
                          <div className="rounded-xl bg-surface-secondary p-6 text-center text-sm text-muted">
                            No knowledge sources match this view.
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      items.map((item) => (
                        <Table.Row key={item.id}>
                          <Table.Cell>
                            <span className="text-[13px] font-semibold text-foreground">KB-{String(item.id).padStart(4, "0")}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold leading-4 text-foreground">{item.title}</p>
                              <p className="truncate text-[11px] leading-4 text-muted">{item.category} · {item.owner}</p>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-[13px] font-medium text-foreground">{item.sourceType}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-[13px] font-medium text-foreground">{formatAgents(item.agents)}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="block text-right text-[13px] font-semibold text-foreground">{item.chunks}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <StatusPill tone={item.status === "Published" ? "success" : item.status === "Review" ? "warning" : "default"}>
                              {item.status}
                            </StatusPill>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="block text-right text-[13px] font-medium text-muted">{item.updated}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <button
                              aria-label={`Delete ${item.title}`}
                              className="ml-auto grid size-8 place-items-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger"
                              type="button"
                              onClick={() => deleteSource(item.id)}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button isDisabled={page <= 1 || isLoading} size="sm" variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))}>
                Previous
              </Button>
              <Button isDisabled={page >= totalPages || isLoading} size="sm" variant="secondary" onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                Next
              </Button>
            </div>
          </div>
        </section>
      </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[16px] bg-surface p-4 shadow-[0_1px_4px_color-mix(in_oklch,var(--foreground)_14%,transparent)]">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-normal text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

function formatAgents(agents: KnowledgeItem["agents"]) {
  if (!agents.length) return "Unassigned";
  if (agents.length === 1) return agents[0].name;
  return `${agents[0].name} +${agents.length - 1}`;
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      <span className="sr-only">{label}</span>
      <Select aria-label={label} className="agent-select w-full" fullWidth selectedKey={value} variant="primary" onSelectionChange={(key) => key && onChange(String(key))}>
        <Select.Trigger className="h-9 px-3 text-sm text-foreground">
          <Select.Value>{value}</Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox aria-label={label} className="max-h-64 overflow-y-auto" items={options.map((option) => ({ id: option, name: option }))}>
            {(option) => (
              <ListBox.Item id={option.id} textValue={option.name}>
                <ListBox.ItemIndicator />
                {option.name}
              </ListBox.Item>
            )}
          </ListBox>
        </Select.Popover>
      </Select>
    </label>
  );
}
