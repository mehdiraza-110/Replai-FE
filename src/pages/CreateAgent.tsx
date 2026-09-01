import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Card, Checkbox, Input, ListBox, Select, TextArea as HeroTextArea } from "@heroui/react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusPill } from "../components/ui/StatusPill";
import { ApiRequestError, aiAgentService, aiModelService, knowledgeService } from "../services/api";
import type { Agent, KnowledgeItem } from "../types";

const steps = [
  "Basics",
  "Persona",
  "Company",
  "Objective",
  "Language",
  "Response Rules",
  "Knowledge",
  "Training",
  "AI Model",
  "Automation",
  "Review",
];

const aiProviders = ["OpenAI", "Anthropic", "Google Gemini"];

type AgentForm = {
  name: string;
  description: string;
  role: string;
  persona: string;
  tone: string;
  responseStyle: string;
  companyName: string;
  website: string;
  industry: string;
  valueProposition: string;
  objective: string;
  successCriteria: string;
  language: string;
  autoDetectLanguage: boolean;
  responseRules: string;
  knowledgeSources: string;
  knowledgeSourceIds: number[];
  trainingExamples: string;
  aiProvider: string;
  model: string;
  automationMode: string;
  confidenceThreshold: string;
  humanReview: boolean;
};

const initialForm: AgentForm = {
  name: "Alex - Outbound Sales",
  description: "Handles interested replies, qualification, and common objections.",
  role: "B2B Sales Representative",
  persona: "Friendly, concise, consultative, and professional.",
  tone: "Consultative",
  responseStyle: "Concise",
  companyName: "PLWH Sales",
  website: "https://plwh.example",
  industry: "B2B Services",
  valueProposition: "Respond to qualified outbound replies faster while keeping admin control.",
  objective: "Schedule a Meeting",
  successCriteria: "Prospect agrees to a discovery call or shares strong buying intent.",
  language: "English",
  autoDetectLanguage: true,
  responseRules: "Keep replies concise. Ask one question at a time. Never invent facts, pricing, or guarantees.",
  knowledgeSources: "Pricing FAQ, objection handling, PlusVibe integration overview",
  knowledgeSourceIds: [],
  trainingExamples: "Use high-quality objection, pricing, and meeting-booked examples.",
  aiProvider: "OpenAI",
  model: "gpt-5",
  automationMode: "AI + Approval",
  confidenceThreshold: "95",
  humanReview: true,
};

const automationModeExplainers: Record<string, { title: string; body: string }> = {
  Manual: {
    title: "Manual mode",
    body: "ReplyOS stores interested PlusVibe replies and keeps the conversation ready for a human-written response. The AI will not draft or send replies in this mode.",
  },
  "AI Draft": {
    title: "AI draft mode",
    body: "The agent can prepare a suggested reply when you generate one, but nothing is sent until a human reviews and sends it manually.",
  },
  "AI + Approval": {
    title: "AI + approval mode",
    body: "Interested PlusVibe replies automatically get an AI draft and appear in Human Review. A human must approve or edit the response before it is sent.",
  },
  "AI Auto-Reply": {
    title: "AI auto-reply mode",
    body: "The agent can send high-confidence replies automatically. Lower-confidence replies can still be routed to Human Review when review routing is enabled.",
  },
};

function getConfidenceGateCopy(form: AgentForm) {
  if (form.automationMode === "AI Auto-Reply") {
    return `The gate is the minimum AI confidence required before ReplyOS can send automatically. At ${form.confidenceThreshold || "0"}%, only drafts scored at or above that level are eligible to auto-send.`;
  }

  if (form.automationMode === "AI + Approval") {
    return "Because this mode always requires approval, the gate works as a reviewer signal instead of an auto-send trigger.";
  }

  if (form.automationMode === "AI Draft") {
    return "Because drafts are generated for review, the gate is only used to mark how confident the AI is before a human decides what to do.";
  }

  return "Manual mode does not use the gate for sending. It is saved with the agent in case you switch to an AI-assisted mode later.";
}

export function CreateAgent() {
  const { id } = useParams();
  const agentId = Number(id);
  const isEditMode = Number.isFinite(agentId) && agentId > 0;
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<AgentForm>(initialForm);
  const [existingAgent, setExistingAgent] = useState<Agent | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(isEditMode);
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, string[]>>({});
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelErrorCode, setModelErrorCode] = useState<string | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeItem[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const isProviderKeyMissing = modelErrorCode === "AI_PROVIDER_KEY_MISSING";
  const isAiModelStepBlocked = currentStep === "AI Model" && (modelsLoading || isProviderKeyMissing || !form.model);

  const completedFields = useMemo(() => {
    const required = [
      form.name,
      form.role,
      form.persona,
      form.companyName,
      form.objective,
      form.language,
      form.aiProvider,
      form.model,
      form.automationMode,
    ];

    return required.filter(Boolean).length;
  }, [form]);

  function updateField<K extends keyof AgentForm>(key: K, value: AgentForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    if (!isEditMode) return;

    let isActive = true;
    setIsLoadingAgent(true);
    setSubmitError(null);

    aiAgentService
      .get(agentId)
      .then((agent) => {
        if (!isActive) return;
        setExistingAgent(agent);
        setForm(agentToForm(agent));
      })
      .catch((error: Error) => {
        if (!isActive) return;
        setSubmitError(error.message || "Unable to load AI agent");
      })
      .finally(() => {
        if (isActive) setIsLoadingAgent(false);
      });

    return () => {
      isActive = false;
    };
  }, [agentId, isEditMode]);

  useEffect(() => {
    if (isLoadingAgent) return;

    let isActive = true;

    setModelsLoading(true);
    setModelsError(null);
    setModelErrorCode(null);

    aiModelService
      .list(form.aiProvider)
      .then((models) => {
        if (!isActive) return;

        setModelsByProvider((current) => ({ ...current, [form.aiProvider]: models }));
        setForm((current) => {
          if (current.aiProvider !== form.aiProvider) return current;
          if (models.includes(current.model)) return current;

          return { ...current, model: models[0] || "" };
        });
      })
      .catch((error: Error) => {
        if (!isActive) return;

        setModelsByProvider((current) => ({ ...current, [form.aiProvider]: [] }));
        setModelsError(error.message || "Unable to load models");
        setModelErrorCode(error instanceof ApiRequestError ? error.code || null : null);
        setForm((current) => (current.aiProvider === form.aiProvider ? { ...current, model: "" } : current));
      })
      .finally(() => {
        if (isActive) setModelsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [form.aiProvider, isLoadingAgent]);

  useEffect(() => {
    let isActive = true;

    setKnowledgeLoading(true);
    setKnowledgeError(null);

    knowledgeService
      .list({ limit: 100, status: "Published" })
      .then((data) => {
        if (!isActive) return;
        setKnowledgeSources(data.items);
      })
      .catch((error: Error) => {
        if (!isActive) return;
        setKnowledgeError(error.message || "Unable to load knowledge sources");
      })
      .finally(() => {
        if (isActive) setKnowledgeLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function nextStep() {
    setSubmitError(null);

    if (isLastStep) {
      try {
        setIsSubmitting(true);
        const payload = buildAgentPayload(form);

        if (isEditMode) {
          await aiAgentService.update(agentId, payload);
        } else {
          await aiAgentService.create({ ...payload, status: "Active" });
        }
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : `Unable to ${isEditMode ? "update" : "create"} agent`);
        setIsSubmitting(false);
        return;
      }

      navigate("/agents");
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-5 pb-3 xl:h-[calc(100vh-112px)] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <Card className="h-fit border border-border/70 bg-surface p-2 xl:max-h-full">
        <Link className="mb-2 flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-surface-secondary hover:text-foreground" to="/agents">
          <ArrowLeft className="size-4" />
          Back to agents
        </Link>
        <div className="space-y-1">
          {steps.map((step, index) => {
            const isActive = index === stepIndex;
            const isComplete = index < stepIndex;

            return (
              <button
                className={(isActive ? "bg-surface-secondary text-foreground" : "text-muted hover:bg-surface-secondary/70 hover:text-foreground") + " flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition"}
                key={step}
                onClick={() => setStepIndex(index)}
                type="button"
              >
                <span className={(isComplete ? "bg-accent text-white" : isActive ? "bg-foreground text-background" : "bg-surface-tertiary text-muted") + " grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold"}>
                  {isComplete ? <Check className="size-3" /> : index + 1}
                </span>
                <span className="truncate">{step}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="apple-shadow flex min-h-0 flex-col border border-border/70 bg-surface xl:h-full">
        <Card.Header className="grid min-h-[60px] grid-cols-[1fr_auto_1fr] items-center border-b border-border/70 px-5 py-0">
          <Card.Title className="justify-self-start text-sm">{isEditMode ? "Edit Agent" : `Step ${stepIndex + 1} of ${steps.length}`}</Card.Title>
          <h2 className="justify-self-center text-base font-semibold tracking-normal text-foreground">
            {currentStep}
          </h2>
          <span aria-hidden="true" />
        </Card.Header>
        <Card.Content className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
          {isLoadingAgent ? (
            <LoadingState />
          ) : (
            <StepContent
              form={form}
              knowledgeError={knowledgeError}
              knowledgeLoading={knowledgeLoading}
              knowledgeSources={knowledgeSources}
              modelErrorCode={modelErrorCode}
              modelOptions={modelsByProvider[form.aiProvider] || []}
              modelsError={modelsError}
              modelsLoading={modelsLoading}
              step={currentStep}
              updateField={updateField}
            />
          )}
        </Card.Content>
        <Card.Footer className="flex justify-between gap-3">
          <Button isDisabled={stepIndex === 0} size="sm" variant="secondary" onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}>
            <ArrowLeft className="size-4" />
            Previous
          </Button>
          <div className="flex min-w-0 items-center gap-3">
            {submitError ? <p className="max-w-[360px] truncate text-sm font-medium text-danger">{submitError}</p> : null}
            <Button isDisabled={isAiModelStepBlocked || isSubmitting} size="sm" onClick={nextStep}>
            {isLastStep ? (isSubmitting ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Agent")) : "Continue"}
            {isLastStep ? <CheckCircle2 className="size-4" /> : <ArrowRight className="size-4" />}
            </Button>
          </div>
        </Card.Footer>
      </Card>

      <Card className="flex min-h-0 flex-col border border-border/70 bg-surface xl:h-full">
        <Card.Header>
          <Card.Title className="text-base">Agent Summary</Card.Title>
          <Card.Description>Configuration preview before activation.</Card.Description>
        </Card.Header>
        <Card.Content className="thin-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto">
          {[
            ["Agent", form.name],
            ["Role", form.role],
            ["Objective", form.objective],
        ["Language", form.language],
        ["AI", `${form.aiProvider} · ${form.model}`],
        ["Mode", form.automationMode],
        ...(isEditMode ? [["Status", existingAgent?.status || "Active"]] : []),
      ].map(([label, value]) => <SummaryField key={label} label={label} value={value} />)}
          <SummaryField label="Setup fields" value={`${completedFields}/9`} />
          <StatusPill tone={form.humanReview ? "warning" : "success"}>
            {form.humanReview ? "Low confidence routes to review" : "Low confidence stays drafted"}
          </StatusPill>
        </Card.Content>
      </Card>
    </div>
  );
}

function buildAgentPayload(form: AgentForm) {
  return {
    name: form.name,
    description: form.description,
    role: form.role,
    persona: form.persona,
    tone: form.tone,
    responseStyle: form.responseStyle,
    companyName: form.companyName,
    website: form.website,
    industry: form.industry,
    valueProposition: form.valueProposition,
    objective: form.objective,
    successCriteria: form.successCriteria,
    language: form.language,
    autoDetectLanguage: form.autoDetectLanguage,
    responseRules: form.responseRules,
    knowledgeSources: form.knowledgeSources,
    knowledgeSourceIds: form.knowledgeSourceIds,
    trainingExamples: form.trainingExamples,
    aiProvider: form.aiProvider,
    model: form.model,
    automationMode: form.automationMode,
    confidenceThreshold: Number(form.confidenceThreshold),
    humanReview: form.humanReview,
    autoReplyEnabled: form.automationMode === "AI Auto-Reply",
  };
}

function agentToForm(agent: Agent): AgentForm {
  return {
    name: agent.name || "",
    description: agent.description || agent.purpose || "",
    role: agent.role || "",
    persona: agent.persona || "",
    tone: agent.tone || "Consultative",
    responseStyle: agent.responseStyle || "Concise",
    companyName: agent.companyName || "",
    website: agent.website || "",
    industry: agent.industry || "",
    valueProposition: agent.valueProposition || "",
    objective: agent.objective || "",
    successCriteria: agent.successCriteria || "",
    language: agent.language || "English",
    autoDetectLanguage: agent.autoDetectLanguage ?? true,
    responseRules: agent.responseRules || "",
    knowledgeSources: agent.knowledgeSources || "",
    knowledgeSourceIds: agent.knowledgeSourceIds || [],
    trainingExamples: agent.trainingExamples || "",
    aiProvider: normalizeProvider(agent.aiProvider),
    model: extractModelName(agent),
    automationMode: agent.automationMode || (agent.autoReply ? "AI Auto-Reply" : "AI + Approval"),
    confidenceThreshold: String(agent.confidenceThreshold ?? 95),
    humanReview: agent.humanReview ?? true,
  };
}

function normalizeProvider(value?: string | null) {
  const provider = String(value || "OpenAI").toLowerCase();

  if (provider.includes("anthropic")) return "Anthropic";
  if (provider.includes("gemini") || provider.includes("google")) return "Google Gemini";
  return "OpenAI";
}

function extractModelName(agent: Agent) {
  const provider = normalizeProvider(agent.aiProvider);
  const prefix = `${provider} · `;
  const model = agent.model || "";

  return model.startsWith(prefix) ? model.slice(prefix.length) : model;
}

function StepContent({
  form,
  knowledgeError,
  knowledgeLoading,
  knowledgeSources,
  modelErrorCode,
  modelOptions,
  modelsError,
  modelsLoading,
  step,
  updateField,
}: {
  form: AgentForm;
  knowledgeError: string | null;
  knowledgeLoading: boolean;
  knowledgeSources: KnowledgeItem[];
  modelErrorCode: string | null;
  modelOptions: string[];
  modelsError: string | null;
  modelsLoading: boolean;
  step: string;
  updateField: <K extends keyof AgentForm>(key: K, value: AgentForm[K]) => void;
}) {
  if (step === "Basics") {
    return (
      <div className="grid items-start gap-4 md:grid-cols-2">
        <TextField label="Agent Name" value={form.name} onChange={(value) => updateField("name", value)} />
        <TextField label="Agent Role" value={form.role} onChange={(value) => updateField("role", value)} />
        <TextAreaField className="md:col-span-2" label="Description" value={form.description} onChange={(value) => updateField("description", value)} />
      </div>
    );
  }

  if (step === "Persona") {
    return (
      <div className="grid items-start gap-4 md:grid-cols-2">
        <TextAreaField className="md:col-span-2" label="Persona" value={form.persona} onChange={(value) => updateField("persona", value)} />
        <SelectField label="Tone" options={["Professional", "Friendly", "Casual", "Consultative", "Direct"]} value={form.tone} onChange={(value) => updateField("tone", value)} />
        <SelectField label="Response Style" options={["Concise", "Balanced", "Detailed"]} value={form.responseStyle} onChange={(value) => updateField("responseStyle", value)} />
      </div>
    );
  }

  if (step === "Company") {
    return (
      <div className="grid items-start gap-5 md:grid-cols-2">
        <div className="grid gap-4">
          <TextField label="Company Name" value={form.companyName} onChange={(value) => updateField("companyName", value)} />
          <TextField label="Industry" value={form.industry} onChange={(value) => updateField("industry", value)} />
        </div>
        <div className="grid gap-4">
          <TextField label="Website" value={form.website} onChange={(value) => updateField("website", value)} />
          <TextAreaField label="Value Proposition" rows={3} value={form.valueProposition} onChange={(value) => updateField("valueProposition", value)} />
        </div>
      </div>
    );
  }

  if (step === "Objective") {
    return (
      <div className="grid items-start gap-4 md:grid-cols-2">
        <SelectField label="Primary Objective" options={["Schedule a Meeting", "Qualify Lead", "Answer Questions", "Other"]} value={form.objective} onChange={(value) => updateField("objective", value)} />
        <TextAreaField label="Success Criteria" value={form.successCriteria} onChange={(value) => updateField("successCriteria", value)} />
      </div>
    );
  }

  if (step === "Language") {
    return (
      <div className="grid items-start gap-4 md:grid-cols-2">
        <SelectField label="Default Language" options={["English", "Spanish", "French", "German", "Arabic", "Urdu"]} value={form.language} onChange={(value) => updateField("language", value)} />
        <Checkbox
          className="self-end py-2 text-sm font-medium text-foreground"
          isSelected={form.autoDetectLanguage}
          variant="primary"
          onChange={updateField.bind(null, "autoDetectLanguage")}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Automatically detect prospect language
          </Checkbox.Content>
        </Checkbox>
      </div>
    );
  }

  if (step === "Response Rules") {
    return <TextAreaField label="Response Rules" rows={8} value={form.responseRules} onChange={(value) => updateField("responseRules", value)} />;
  }

  if (step === "Knowledge") {
    const selectedIds = new Set(form.knowledgeSourceIds);

    function toggleSource(sourceId: number, isSelected: boolean) {
      updateField(
        "knowledgeSourceIds",
        isSelected
          ? [...selectedIds, sourceId].sort((a, b) => a - b)
          : form.knowledgeSourceIds.filter((id) => id !== sourceId)
      );
    }

    return (
      <div className="grid items-start gap-4">
        <div className="rounded-xl bg-surface-secondary p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Approved knowledge sources</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Select the documents and notes this agent can use while generating replies.
              </p>
            </div>
            <StatusPill tone={form.knowledgeSourceIds.length > 0 ? "success" : "default"}>
              {form.knowledgeSourceIds.length} selected
            </StatusPill>
          </div>

          <div className="mt-4 grid max-h-[280px] gap-2 overflow-y-auto pr-1">
            {knowledgeLoading ? (
              <LoadingState minHeight={100} size="md" />
            ) : knowledgeError ? (
              <p className="rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">{knowledgeError}</p>
            ) : knowledgeSources.length === 0 ? (
              <div className="rounded-xl bg-surface p-4 text-sm leading-6 text-muted">
                No published knowledge sources yet. Add source material from the Knowledge Base page, then return here to attach it to this agent.
              </div>
            ) : (
              knowledgeSources.map((source) => (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface px-3 py-3 transition hover:bg-background" key={source.id}>
                  <Checkbox
                    className="mt-0.5"
                    isSelected={selectedIds.has(source.id)}
                    variant="primary"
                    onChange={(isSelected) => toggleSource(source.id, isSelected)}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox.Content>
                  </Checkbox>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{source.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {source.category} · {source.sourceType} · {source.chunks} chunks
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
        <TextAreaField
          label="Additional Knowledge Notes"
          rows={5}
          value={form.knowledgeSources}
          onChange={(value) => updateField("knowledgeSources", value)}
        />
      </div>
    );
  }

  if (step === "Training") {
    return <TextAreaField label="Training Examples" rows={8} value={form.trainingExamples} onChange={(value) => updateField("trainingExamples", value)} />;
  }

  if (step === "AI Model") {
    const isProviderKeyMissing = modelErrorCode === "AI_PROVIDER_KEY_MISSING";

    return (
      <div className="grid items-start gap-4 md:grid-cols-2">
        <SelectField
          label="AI Provider"
          options={aiProviders}
          value={form.aiProvider}
          onChange={(value) => {
            updateField("aiProvider", value);
            updateField("model", "");
          }}
        />
        <SelectField
          isDisabled={modelsLoading || modelOptions.length === 0}
          label="Model"
          options={modelOptions}
          placeholder={modelsLoading ? "Loading models..." : modelsError ? "Models unavailable" : "No models available"}
          value={form.model}
          onChange={(value) => updateField("model", value)}
        />
        {isProviderKeyMissing ? (
          <div className="flex items-start gap-3 rounded-xl bg-warning/10 p-3 text-sm font-medium text-warning md:col-span-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{modelsError}</p>
          </div>
        ) : modelsError ? (
          <p className="text-sm font-medium text-danger md:col-span-2">{modelsError}</p>
        ) : null}
        <div className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-4 text-sm text-muted">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
          <p>Model access is resolved by backend environment credentials. Agent records store provider and model configuration only.</p>
        </div>
      </div>
    );
  }

  if (step === "Automation") {
    const modeExplainer = automationModeExplainers[form.automationMode] || automationModeExplainers["AI + Approval"];
    const confidenceGateCopy = getConfidenceGateCopy(form);

    return (
      <div className="grid items-start gap-4 md:grid-cols-2">
        <SelectField label="Automation Mode" options={["Manual", "AI Draft", "AI + Approval", "AI Auto-Reply"]} value={form.automationMode} onChange={(value) => updateField("automationMode", value)} />
        <TextField label="Auto-send Confidence Gate" suffix="%" value={form.confidenceThreshold} onChange={(value) => updateField("confidenceThreshold", value)} />
        <Checkbox
          className="py-2 text-sm font-medium text-foreground md:col-span-2"
          isSelected={form.humanReview}
          variant="primary"
          onChange={updateField.bind(null, "humanReview")}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Send replies below the confidence gate to Human Review
          </Checkbox.Content>
        </Checkbox>
        <div className="rounded-xl bg-surface-secondary p-4 text-sm leading-6 text-muted md:col-span-2">
          <p className="font-semibold text-foreground">{modeExplainer.title}</p>
          <p className="mt-1">{modeExplainer.body}</p>
          <p className="mt-3">
            <span className="font-semibold text-foreground">Auto-send confidence gate: </span>
            {confidenceGateCopy}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      {[
        ["Agent", form.name],
        ["Persona", form.persona],
        ["Company", form.companyName],
        ["Objective", form.objective],
        ["Language", form.language],
        ["Provider", form.aiProvider],
        ["Model", form.model],
        ["Automation", form.automationMode],
        ["Confidence gate", `${form.confidenceThreshold}%`],
      ].map(([label, value]) => (
        <SummaryField key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function TextField({
  label,
  onChange,
  suffix,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  suffix?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      <Input
        className="agent-field h-10 w-full text-sm text-foreground"
        fullWidth
        value={value}
        variant="primary"
        onChange={(event) => onChange(event.target.value)}
      />
      {suffix ? <span className="-mt-9 mr-3 justify-self-end text-sm text-muted">{suffix}</span> : null}
    </label>
  );
}

function SelectField({
  isDisabled = false,
  label,
  onChange,
  options,
  placeholder = "Select an option",
  value,
}: {
  isDisabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      <Select
        aria-label={label}
        className="agent-select w-full"
        fullWidth
        isDisabled={isDisabled}
        selectedKey={value || undefined}
        variant="primary"
        onSelectionChange={(key) => {
          if (key) onChange(String(key));
        }}
      >
        <Select.Trigger className="h-10 px-3 text-sm text-foreground">
          <Select.Value>{value || placeholder}</Select.Value>
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

function TextAreaField({
  className,
  label,
  onChange,
  rows = 4,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  return (
    <label className={(className ?? "") + " grid gap-1.5 text-sm font-medium text-foreground"}>
      {label}
      <HeroTextArea
        className="agent-field min-h-0 resize-y px-3 py-2 text-sm font-normal leading-6 text-foreground"
        fullWidth
        rows={rows}
        value={value}
        variant="primary"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted">
      {label}
      <Input
        aria-label={label}
        className="agent-field h-10 w-full text-sm font-semibold text-foreground"
        fullWidth
        readOnly
        value={value}
        variant="primary"
      />
    </label>
  );
}
