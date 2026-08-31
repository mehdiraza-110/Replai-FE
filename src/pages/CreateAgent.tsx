import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Checkbox, Input, ListBox, Select, TextArea as HeroTextArea } from "@heroui/react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ShieldCheck } from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";

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

const aiProviders = ["OpenAI", "Anthropic", "Google Gemini", "Azure OpenAI"];

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
  responseRules: string;
  knowledgeSources: string;
  trainingExamples: string;
  aiProvider: string;
  model: string;
  apiKey: string;
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
  responseRules: "Keep replies concise. Ask one question at a time. Never invent facts, pricing, or guarantees.",
  knowledgeSources: "Pricing FAQ, objection handling, PlusVibe integration overview",
  trainingExamples: "Use high-quality objection, pricing, and meeting-booked examples.",
  aiProvider: "OpenAI",
  model: "gpt-5",
  apiKey: "",
  automationMode: "AI + Approval",
  confidenceThreshold: "95",
  humanReview: true,
};

export function CreateAgent() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<AgentForm>(initialForm);
  const navigate = useNavigate();
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

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
      form.apiKey,
      form.automationMode,
    ];

    return required.filter(Boolean).length;
  }, [form]);

  function updateField<K extends keyof AgentForm>(key: K, value: AgentForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function nextStep() {
    if (isLastStep) {
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
          <Card.Title className="justify-self-start text-sm">Step {stepIndex + 1} of {steps.length}</Card.Title>
          <h2 className="justify-self-center text-base font-semibold tracking-normal text-foreground">
            {currentStep}
          </h2>
          <span aria-hidden="true" />
        </Card.Header>
        <Card.Content className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
          <StepContent form={form} step={currentStep} updateField={updateField} />
        </Card.Content>
        <Card.Footer className="flex justify-between gap-3">
          <Button isDisabled={stepIndex === 0} size="sm" variant="secondary" onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}>
            <ArrowLeft className="size-4" />
            Previous
          </Button>
          <Button size="sm" onClick={nextStep}>
            {isLastStep ? "Create Agent" : "Continue"}
            {isLastStep ? <CheckCircle2 className="size-4" /> : <ArrowRight className="size-4" />}
          </Button>
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
          ].map(([label, value]) => <SummaryField key={label} label={label} value={value} />)}
          <SummaryField label="Setup fields" value={`${completedFields}/10`} />
          <StatusPill tone={form.humanReview ? "warning" : "success"}>
            {form.humanReview ? "Human review enabled" : "Auto-send allowed"}
          </StatusPill>
        </Card.Content>
      </Card>
    </div>
  );
}

function StepContent({
  form,
  step,
  updateField,
}: {
  form: AgentForm;
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
        <Checkbox defaultSelected className="self-end py-2 text-sm font-medium text-foreground" variant="primary">
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
    return <TextAreaField label="Knowledge Sources" rows={8} value={form.knowledgeSources} onChange={(value) => updateField("knowledgeSources", value)} />;
  }

  if (step === "Training") {
    return <TextAreaField label="Training Examples" rows={8} value={form.trainingExamples} onChange={(value) => updateField("trainingExamples", value)} />;
  }

  if (step === "AI Model") {
    return (
      <div className="grid items-start gap-4 md:grid-cols-2">
        <SelectField label="AI Provider" options={aiProviders} value={form.aiProvider} onChange={(value) => updateField("aiProvider", value)} />
        <PasswordField label={`${form.aiProvider} API Key`} value={form.apiKey} onChange={(value) => updateField("apiKey", value)} />
        <TextField label="Model" value={form.model} onChange={(value) => updateField("model", value)} />
        <div className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-4 text-sm text-muted">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
          <p>Credentials are submitted to backend secret storage and are never shown after this step.</p>
        </div>
      </div>
    );
  }

  if (step === "Automation") {
    return (
      <div className="grid items-start gap-4 md:grid-cols-2">
        <SelectField label="Automation Mode" options={["Manual", "AI Draft", "AI + Approval", "AI Auto-Reply"]} value={form.automationMode} onChange={(value) => updateField("automationMode", value)} />
        <TextField label="Human Review Threshold" suffix="%" value={form.confidenceThreshold} onChange={(value) => updateField("confidenceThreshold", value)} />
        <Checkbox
          className="py-2 text-sm font-medium text-foreground"
          isSelected={form.humanReview}
          variant="primary"
          onChange={updateField.bind(null, "humanReview")}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Require human review below threshold
          </Checkbox.Content>
        </Checkbox>
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

function PasswordField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      <Input
        autoComplete="off"
        className="agent-field h-10 w-full text-sm text-foreground"
        fullWidth
        placeholder="Paste API key"
        type="password"
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
      <Select
        aria-label={label}
        className="agent-select w-full"
        fullWidth
        selectedKey={value}
        variant="primary"
        onSelectionChange={(key) => {
          if (key) onChange(String(key));
        }}
      >
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
