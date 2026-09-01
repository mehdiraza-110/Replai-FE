import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Checkbox, Input, ListBox, Select, TextArea as HeroTextArea } from "@heroui/react";
import { ArrowLeft, CheckCircle2, FileUp, UploadCloud } from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";
import { aiAgentService, knowledgeService } from "../services/api";
import type { Agent } from "../types";

const sourceTypes = ["Text", "Document", "URL", "FAQ"];
const categories = ["Sales FAQs", "Objection Handling", "Product Details", "Policies", "Qualification", "Pricing", "General"];
const reviewStates = ["Published", "Review", "Draft"];

type KnowledgeFormValues = {
  title: string;
  category: string;
  sourceType: string;
  owner: string;
  status: string;
  contentText: string;
  usageGuidance: string;
  sourceUrl: string;
  agentIds: number[];
  file: File | null;
};

const emptyForm: KnowledgeFormValues = {
  title: "",
  category: "General",
  sourceType: "Text",
  owner: "",
  status: "Published",
  contentText: "",
  usageGuidance: "",
  sourceUrl: "",
  agentIds: [],
  file: null,
};

export function KnowledgeForm() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [form, setForm] = useState<KnowledgeFormValues>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    aiAgentService
      .list()
      .then(setAgents)
      .catch(() => setAgents([]));
  }, []);

  function updateForm<K extends keyof KnowledgeFormValues>(key: K, value: KnowledgeFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleAgent(agentId: number, isSelected: boolean) {
    setForm((current) => ({
      ...current,
      agentIds: isSelected
        ? [...new Set([...current.agentIds, agentId])].sort((a, b) => a - b)
        : current.agentIds.filter((id) => id !== agentId),
    }));
  }

  async function saveKnowledgeSource() {
    if (!form.title.trim() && !form.file) {
      setFormError("Add a title or upload a document first.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      await knowledgeService.create({
        ...form,
        title: form.title.trim() || form.file?.name || "Knowledge source",
      });
      navigate("/knowledge");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We could not save this knowledge source. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4 pb-3">
      <Link className="flex h-9 w-fit items-center gap-2 rounded-xl px-1 text-sm font-medium text-muted transition hover:text-foreground" to="/knowledge">
        <ArrowLeft className="size-4" />
        Back to knowledge base
      </Link>

      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header className="border-b border-border/70 px-5 py-4">
          <Card.Title className="text-base">Add Knowledge</Card.Title>
          <Card.Description>Upload documents or paste source material that agents can use in replies.</Card.Description>
        </Card.Header>

        <Card.Content className="px-5 py-5">
          {formError ? <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">{formError}</p> : null}
          <div className="grid items-start gap-4 md:grid-cols-2">
            <TextField label="Title" placeholder="Pricing FAQ, product limits, objection notes" value={form.title} onChange={(value) => updateForm("title", value)} />
            <SelectField label="Category" options={categories} value={form.category} onChange={(value) => updateForm("category", value)} />
            <SelectField label="Source Type" options={sourceTypes} value={form.sourceType} onChange={(value) => updateForm("sourceType", value)} />
            <SelectField label="Review Status" options={reviewStates} value={form.status} onChange={(value) => updateForm("status", value)} />
            <TextField label="Owner" placeholder="Revenue Ops" value={form.owner} onChange={(value) => updateForm("owner", value)} />
            <TextField label="Source URL" placeholder="https://example.com/pricing" value={form.sourceUrl} onChange={(value) => updateForm("sourceUrl", value)} />
            <TextAreaField
              className="md:col-span-2"
              label="Knowledge Content"
              placeholder="Paste facts, positioning, FAQs, approved claims, or objection handling material."
              rows={7}
              value={form.contentText}
              onChange={(value) => updateForm("contentText", value)}
            />
            <TextAreaField
              className="md:col-span-2"
              label="Usage Guidance"
              placeholder="When should agents use this? Include priority rules and claims to avoid."
              rows={4}
              value={form.usageGuidance}
              onChange={(value) => updateForm("usageGuidance", value)}
            />

            <label className="grid gap-1.5 text-sm font-medium text-foreground md:col-span-2">
              Upload Document
              <span className="flex min-h-[112px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-secondary px-4 py-5 text-center transition hover:border-accent hover:bg-surface">
                <UploadCloud className="mb-2 size-6 text-accent" strokeWidth={2} />
                <span className="text-[13px] font-semibold text-foreground">
                  {form.file ? form.file.name : "Upload PDF, DOCX, TXT, Markdown, CSV, or JSON"}
                </span>
                <span className="mt-1 text-[12px] leading-5 text-muted">
                  Text-like files are indexed immediately. PDF and DOCX uploads are stored for parser indexing.
                </span>
                <input
                  className="sr-only"
                  type="file"
                  onChange={(event) => updateForm("file", event.target.files?.[0] || null)}
                />
              </span>
            </label>

            {form.file ? (
              <div className="flex items-center justify-between rounded-xl bg-surface-secondary px-3 py-2 text-[13px] md:col-span-2">
                <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                  <FileUp className="size-4 shrink-0 text-accent" />
                  <span className="truncate">{form.file.name}</span>
                </span>
                <StatusPill tone="default">{formatFileSize(form.file.size)}</StatusPill>
              </div>
            ) : null}

            <div className="rounded-xl bg-surface-secondary p-4 md:col-span-2">
              <p className="text-sm font-semibold text-foreground">Attach to agents</p>
              <p className="mt-1 text-sm leading-6 text-muted">You can also attach this later from each AI agent's Knowledge tab.</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {agents.length === 0 ? (
                  <p className="text-sm text-muted">No AI agents are configured yet.</p>
                ) : (
                  agents.map((agent) => (
                    <Checkbox
                      className="rounded-xl bg-surface px-3 py-2 text-sm font-medium text-foreground"
                      isSelected={form.agentIds.includes(agent.id || 0)}
                      key={agent.id}
                      variant="primary"
                      onChange={(isSelected) => agent.id && toggleAgent(agent.id, isSelected)}
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        {agent.name}
                      </Checkbox.Content>
                    </Checkbox>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card.Content>

        <Card.Footer className="flex flex-wrap justify-end gap-2 border-t border-border/70 px-5 py-4">
          <Button className="h-[34px] rounded-full bg-default-100 px-4 text-[14px] font-semibold leading-none text-foreground" size="sm" variant="secondary" onClick={() => navigate("/knowledge")}>
            Cancel
          </Button>
          <Button className="h-[34px] rounded-full px-4 text-[14px] font-semibold leading-none" isDisabled={isSaving} size="sm" onClick={saveKnowledgeSource}>
            <CheckCircle2 className="size-[17px]" strokeWidth={2.35} />
            {isSaving ? "Saving..." : "Save Knowledge"}
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function TextField({
  className,
  label,
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className={(className ?? "") + " grid gap-1.5 text-sm font-medium text-foreground"}>
      {label}
      <Input
        className="agent-field h-10 w-full text-sm text-foreground placeholder:text-muted"
        fullWidth
        placeholder={placeholder}
        value={value}
        variant="primary"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaField({
  className,
  label,
  onChange,
  placeholder,
  rows,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  value: string;
}) {
  return (
    <label className={(className ?? "") + " grid gap-1.5 text-sm font-medium text-foreground"}>
      {label}
      <HeroTextArea
        className="agent-field min-h-0 resize-y px-3 py-2 text-sm font-normal leading-6 text-foreground placeholder:text-muted"
        fullWidth
        placeholder={placeholder}
        rows={rows}
        value={value}
        variant="primary"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
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
      {label}
      <Select aria-label={label} className="agent-select w-full" fullWidth selectedKey={value} variant="primary" onSelectionChange={(key) => key && onChange(String(key))}>
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
