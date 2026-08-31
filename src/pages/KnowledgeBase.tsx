import { useMemo, useState } from "react";
import { Button, Chip, Input, ListBox, Modal, Select, Table, TextArea as HeroTextArea, useOverlayState } from "@heroui/react";
import {
  CheckCircle2,
  ChevronDown,
  Columns3,
  Copy,
  FileUp,
  ListFilter,
  Plus,
  Search,
  SlidersHorizontal,
  UploadCloud,
  X,
} from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";
import { knowledgeService } from "../services/api";

type KnowledgeStatus = "Published" | "Review" | "Draft";

type KnowledgeRecord = {
  id: string;
  title: string;
  category: string;
  sourceType: "Text" | "Document" | "URL" | "FAQ";
  owner: string;
  agents: string;
  chunks: number;
  lastIndexed: string;
  updated: string;
  status: KnowledgeStatus;
};

const knowledgeRecords: KnowledgeRecord[] = [
  {
    id: "KB-1048",
    title: "Pricing FAQ",
    category: "Sales FAQs",
    sourceType: "FAQ",
    owner: "Revenue Ops",
    agents: "All outbound agents",
    chunks: 42,
    lastIndexed: "14 min ago",
    updated: "2h ago",
    status: "Published",
  },
  {
    id: "KB-1047",
    title: "Agency objection handling",
    category: "Objection Handling",
    sourceType: "Text",
    owner: "Sales Enablement",
    agents: "Alex, Maya",
    chunks: 31,
    lastIndexed: "Yesterday",
    updated: "Yesterday",
    status: "Published",
  },
  {
    id: "KB-1046",
    title: "PlusVibe integration overview",
    category: "Product Details",
    sourceType: "Document",
    owner: "Product",
    agents: "Technical sales",
    chunks: 76,
    lastIndexed: "Aug 28",
    updated: "Aug 28",
    status: "Review",
  },
  {
    id: "KB-1045",
    title: "Claims the AI must never make",
    category: "Policies",
    sourceType: "Text",
    owner: "Compliance",
    agents: "All agents",
    chunks: 18,
    lastIndexed: "Aug 25",
    updated: "Aug 25",
    status: "Published",
  },
  {
    id: "KB-1044",
    title: "Discovery call qualification notes",
    category: "Qualification",
    sourceType: "Document",
    owner: "Sales Managers",
    agents: "SDR agents",
    chunks: 54,
    lastIndexed: "Aug 22",
    updated: "Aug 22",
    status: "Draft",
  },
];

const sourceTypes = ["Text", "Document", "URL", "FAQ"];
const categories = ["Sales FAQs", "Objection Handling", "Product Details", "Policies", "Qualification", "Pricing"];
const agentAccess = ["All outbound agents", "Alex, Maya", "Technical sales", "SDR agents", "Human-review agents"];
const reviewStates = ["Published", "Review", "Draft"];

export function KnowledgeBase() {
  const serviceItems = knowledgeService.list();
  const modalState = useOverlayState();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const totalItems = useMemo(() => Math.max(knowledgeRecords.length, serviceItems.length), [serviceItems.length]);

  return (
    <>
      <div className="flex w-full max-w-none flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-semibold leading-6 text-foreground">Knowledge Base</h1>
            <p className="mt-1 text-[13px] leading-5 text-muted">Content AI agents study, retrieve, and cite while preparing replies.</p>
          </div>

          <Button className="h-[34px] rounded-full px-4 text-[14px] font-semibold leading-none" size="sm" onClick={modalState.open}>
            <Plus className="size-[17px]" strokeWidth={2.35} />
            Create Knowledgebase
          </Button>
        </div>

        <section className="mt-1">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-[14px] font-semibold leading-5 text-foreground">All Knowledge Sources</h2>
            <Chip className="h-[18px] min-h-[18px] px-1.5 text-[11px] font-semibold" size="sm" variant="soft">
              {totalItems}
            </Chip>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <ToolbarButton icon={SlidersHorizontal}>Filter</ToolbarButton>
              <ToolbarButton icon={ListFilter}>Sort</ToolbarButton>
              <ToolbarButton icon={Columns3}>Columns</ToolbarButton>
            </div>

            <div className="relative h-[30px] w-full shrink-0 sm:w-[238px] sm:min-w-[238px] sm:max-w-[238px]">
              <Search className="pointer-events-none absolute left-[14px] top-1/2 z-10 size-[13px] -translate-y-1/2 text-muted" strokeWidth={2} />
              <Input
                aria-label="Search knowledge base"
                className="employee-search h-[30px] w-full min-w-0 rounded-[9px] bg-surface pl-[35px] pr-3 text-[12px] text-foreground placeholder:text-muted"
                placeholder="Search..."
                type="search"
                variant="secondary"
              />
            </div>
          </div>

          <div className="apple-shadow overflow-hidden rounded-[20px] bg-surface-secondary p-[2px]">
            <Table className="employee-table" variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Knowledge base table">
                  <Table.Header>
                    <Table.Column className="w-[132px]">Source ID</Table.Column>
                    <Table.Column className="w-[260px]">
                      <span className="inline-flex items-center gap-1">Knowledge Source <ChevronDown className="size-3 rotate-180" /></span>
                    </Table.Column>
                    <Table.Column className="w-[150px]">Type</Table.Column>
                    <Table.Column className="w-[180px]">Agent Access</Table.Column>
                    <Table.Column className="w-[120px] text-right">Chunks</Table.Column>
                    <Table.Column className="w-[136px]">Last Indexed</Table.Column>
                    <Table.Column className="w-[126px]">Status</Table.Column>
                    <Table.Column className="w-[118px] text-right">Updated</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {knowledgeRecords.map((item) => (
                      <Table.Row key={item.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                            {item.id}
                            <Copy className="size-[13px] text-default-500" strokeWidth={1.9} />
                          </div>
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
                          <span className="text-[13px] font-medium text-foreground">{item.agents}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="block text-right text-[13px] font-semibold text-foreground">{item.chunks}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-[13px] font-medium text-foreground">{item.lastIndexed}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <StatusPill tone={item.status === "Published" ? "success" : item.status === "Review" ? "warning" : "default"}>
                            {item.status}
                          </StatusPill>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="block text-right text-[13px] font-medium text-muted">{item.updated}</span>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
        </section>
      </div>

      <Modal state={modalState}>
        <Modal.Backdrop className="bg-foreground/30 backdrop-blur-[2px]">
          <Modal.Container className="w-[min(840px,calc(100vw-32px))]" placement="center" scroll="inside" size="lg">
            <Modal.Dialog className="overflow-hidden rounded-[20px] border border-border/70 bg-surface shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]">
              <Modal.Header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
                <div>
                  <Modal.Heading className="text-base font-semibold leading-6 text-foreground">Create Knowledgebase</Modal.Heading>
                  <p className="mt-1 text-[13px] leading-5 text-muted">Add source material agents can retrieve before drafting a response.</p>
                </div>
                <Modal.CloseTrigger className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground transition hover:bg-default-200" aria-label="Close">
                  <X className="size-4" />
                </Modal.CloseTrigger>
              </Modal.Header>

              <Modal.Body className="thin-scrollbar max-h-[72vh] overflow-y-auto px-5 py-5">
                <div className="grid items-start gap-4 md:grid-cols-2">
                  <TextField label="Title" placeholder="Pricing FAQ, product limits, objection notes" />
                  <SelectField label="Category" options={categories} value="Sales FAQs" />
                  <SelectField label="Source Type" options={sourceTypes} value="Text" />
                  <SelectField label="Agent Access" options={agentAccess} value="All outbound agents" />
                  <TextField label="Owner" placeholder="Revenue Ops" />
                  <SelectField label="Review Status" options={reviewStates} value="Review" />
                  <TextAreaField className="md:col-span-2" label="Knowledge Content" placeholder="Paste the material the AI should study, understand, and retrieve when responding." rows={7} />
                  <TextAreaField className="md:col-span-2" label="Usage Guidance" placeholder="When should agents use this? Include priority rules, claims to avoid, and citation guidance." rows={4} />
                  <TextField className="md:col-span-2" label="Source URL" placeholder="https://example.com/pricing or internal reference link" />

                  <label className="grid gap-1.5 text-sm font-medium text-foreground md:col-span-2">
                    Upload Documents
                    <span className="flex min-h-[116px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-secondary px-4 py-5 text-center transition hover:border-accent hover:bg-surface">
                      <UploadCloud className="mb-2 size-6 text-accent" strokeWidth={2} />
                      <span className="text-[13px] font-semibold text-foreground">Upload PDFs, docs, notes, or CSV files</span>
                      <span className="mt-1 text-[12px] leading-5 text-muted">Files will be parsed, chunked, and indexed for agent retrieval.</span>
                      <input
                        className="sr-only"
                        multiple
                        type="file"
                        onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []).map((file) => file.name))}
                      />
                    </span>
                  </label>

                  {selectedFiles.length > 0 ? (
                    <div className="grid gap-2 md:col-span-2">
                      {selectedFiles.map((file) => (
                        <div className="flex items-center justify-between rounded-xl bg-surface-secondary px-3 py-2 text-[13px]" key={file}>
                          <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                            <FileUp className="size-4 shrink-0 text-accent" />
                            <span className="truncate">{file}</span>
                          </span>
                          <StatusPill tone="default">Ready</StatusPill>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Modal.Body>

              <Modal.Footer className="flex flex-wrap justify-end gap-2 border-t border-border/70 px-5 py-4">
                <Button className="h-[34px] rounded-full bg-default-100 px-4 text-[14px] font-semibold leading-none text-foreground" size="sm" variant="secondary" onClick={modalState.close}>
                  Cancel
                </Button>
                <Button className="h-[34px] rounded-full px-4 text-[14px] font-semibold leading-none" size="sm" onClick={modalState.close}>
                  <CheckCircle2 className="size-[17px]" strokeWidth={2.35} />
                  Save Knowledgebase
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

function ToolbarButton({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Button className="h-[30px] rounded-full bg-default-100 px-3 text-[13px] font-medium text-foreground" size="sm" variant="secondary">
      <Icon className="size-[15px]" strokeWidth={2} />
      {children}
    </Button>
  );
}

function TextField({ className, label, placeholder }: { className?: string; label: string; placeholder: string }) {
  return (
    <label className={(className ?? "") + " grid gap-1.5 text-sm font-medium text-foreground"}>
      {label}
      <Input className="agent-field h-10 w-full text-sm text-foreground placeholder:text-muted" fullWidth placeholder={placeholder} variant="primary" />
    </label>
  );
}

function TextAreaField({
  className,
  label,
  placeholder,
  rows,
}: {
  className?: string;
  label: string;
  placeholder: string;
  rows: number;
}) {
  return (
    <label className={(className ?? "") + " grid gap-1.5 text-sm font-medium text-foreground"}>
      {label}
      <HeroTextArea
        className="agent-field min-h-0 resize-y px-3 py-2 text-sm font-normal leading-6 text-foreground placeholder:text-muted"
        fullWidth
        placeholder={placeholder}
        rows={rows}
        variant="primary"
      />
    </label>
  );
}

function SelectField({ label, options, value }: { label: string; options: string[]; value: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      <Select aria-label={label} className="agent-select w-full" defaultSelectedKey={value} fullWidth variant="primary">
        <Select.Trigger className="h-10 px-3 text-sm text-foreground">
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
