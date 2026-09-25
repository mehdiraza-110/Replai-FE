import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, ListBox, Select, Spinner, TimeField, Tooltip } from "@heroui/react";
import { parseTime, type Time } from "@internationalized/date";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Cloud,
  FileSpreadsheet,
  Loader2,
  Mail,
  Minus,
  Phone,
  Plus,
  Rocket,
  Search,
  User,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RichTextEditor, type MergeVariable } from "../components/ui/RichTextEditor";
import { aiAgentService, campaignService, domainService, mailboxService } from "../services/api";
import { isComposerEmpty } from "../utils/composerHtml";
import type { Agent, LeadFileParseResult, ParsedLead } from "../types";

interface WizardMailbox {
  id: number;
  email: string;
  dailyLimit: number;
  reputationStatus: "Healthy" | "Watch" | "At Risk";
}

interface WizardDomain {
  id: number;
  domain: string;
  status: string;
  configurationSetName: string | null;
  mailboxes: WizardMailbox[];
}

const STEPS = [
  { id: 1, label: "Campaign" },
  { id: 2, label: "Audience" },
  { id: 3, label: "Message" },
  { id: 4, label: "Sending & Schedule" },
  { id: 5, label: "Review & Launch" },
] as const;

const MERGE_VARIABLES: MergeVariable[] = [
  { key: "first_name", label: "First name", description: "The lead's first name. Falls back to \"there\" if unknown." },
  { key: "last_name", label: "Last name", description: "The lead's last name. Blank if unknown." },
  { key: "full_name", label: "Full name", description: "The lead's full name as captured on import." },
  { key: "company", label: "Company", description: "The lead's company name." },
  { key: "role", label: "Role", description: "The lead's job title, e.g. \"VP Growth\"." },
  { key: "email", label: "Email", description: "The lead's email address." },
  { key: "sender_name", label: "Sender name", description: "The display name of the mailbox this email sends from." },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
  "Europe/London",
  "Asia/Karachi",
];

interface FollowUp {
  id: number;
  delayDays: number;
  body: string;
}

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const ACCEPTED_LEAD_FILE_EXTENSIONS = ["csv", "xlsx", "xls", "txt"];

function extractEmails(text: string) {
  return text.match(EMAIL_PATTERN) ?? [];
}

function dedupeEmails(emails: string[]) {
  return Array.from(new Set(emails.map((email) => email.toLowerCase())));
}

type UploadStage = "idle" | "uploading" | "processing" | "done" | "error";

const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  fullName: "Full name",
  firstName: "First name",
  lastName: "Last name",
  company: "Company",
  role: "Role / title",
  phone: "Phone",
};

export function MailerCampaignNew() {
  const navigate = useNavigate();
  const [domains, setDomains] = useState<WizardDomain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [domainsError, setDomainsError] = useState<string | null>(null);
  const mailboxes = useMemo(() => domains.flatMap((domain) => domain.mailboxes), [domains]);

  useEffect(() => {
    let cancelled = false;
    async function loadDomainsAndMailboxes() {
      setDomainsLoading(true);
      setDomainsError(null);
      try {
        const [domainPage, mailboxPage] = await Promise.all([
          domainService.list({ page: 1, limit: 100 }),
          mailboxService.list({ page: 1, limit: 500 }),
        ]);
        if (cancelled) return;

        const mailboxesByDomainId = new Map<number, WizardMailbox[]>();
        for (const mailbox of mailboxPage.items) {
          if (mailbox.status !== "Active") continue;
          const list = mailboxesByDomainId.get(mailbox.domainId) ?? [];
          list.push({ id: mailbox.id, email: mailbox.email, dailyLimit: mailbox.dailyLimit, reputationStatus: mailbox.reputationStatus });
          mailboxesByDomainId.set(mailbox.domainId, list);
        }

        setDomains(
          domainPage.items.map((domain) => ({
            id: domain.id,
            domain: domain.domain,
            status: domain.status,
            configurationSetName: domain.configurationSetName,
            mailboxes: mailboxesByDomainId.get(domain.id) ?? [],
          }))
        );
      } catch (requestError) {
        if (!cancelled) {
          setDomainsError(requestError instanceof Error ? requestError.message : "Unable to load domains and mailboxes");
          setDomains([]);
        }
      } finally {
        if (!cancelled) setDomainsLoading(false);
      }
    }
    loadDomainsAndMailboxes();
    return () => {
      cancelled = true;
    };
  }, []);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step 1 — Campaign
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");

  // Step 2 — Audience
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<LeadFileParseResult | null>(null);
  const [manualEmailsRaw, setManualEmailsRaw] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const manualLeads = useMemo<ParsedLead[]>(
    () =>
      dedupeEmails(extractEmails(manualEmailsRaw)).map((email) => ({
        email,
        fullName: null,
        firstName: null,
        lastName: null,
        company: null,
        role: null,
        phone: null,
        raw: {},
      })),
    [manualEmailsRaw]
  );

  const leads = useMemo<ParsedLead[]>(() => {
    const byEmail = new Map<string, ParsedLead>();
    for (const lead of parseResult?.leads ?? []) byEmail.set(lead.email, lead);
    for (const lead of manualLeads) if (!byEmail.has(lead.email)) byEmail.set(lead.email, lead);
    return Array.from(byEmail.values());
  }, [parseResult, manualLeads]);

  async function handleLeadsFile(file: File) {
    const extension = file.name.toLowerCase().split(".").pop() || "";
    if (!ACCEPTED_LEAD_FILE_EXTENSIONS.includes(extension)) {
      setUploadErrorMessage(`Unsupported file type ".${extension}". Upload a .csv, .xlsx, .xls, or .txt file.`);
      setUploadStage("error");
      return;
    }

    setUploadErrorMessage(null);
    setParseResult(null);
    setUploadFileName(file.name);
    setUploadProgress(0);
    setUploadStage("uploading");

    try {
      const result = await campaignService.parseLeadsFile(file, (percent) => {
        setUploadProgress(percent);
        if (percent >= 100) setUploadStage("processing");
      });
      setParseResult(result);
      setUploadStage("done");
    } catch (requestError) {
      setUploadErrorMessage(requestError instanceof Error ? requestError.message : `Couldn't process ${file.name}.`);
      setUploadStage("error");
    }
  }

  function clearUploadedFile() {
    setUploadStage("idle");
    setUploadProgress(0);
    setUploadFileName(null);
    setUploadErrorMessage(null);
    setParseResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Step 3 — Message
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  // Step 4 — Sending & schedule
  const [mailboxMode, setMailboxMode] = useState<"all" | "specific">("all");
  const [selectedMailboxIds, setSelectedMailboxIds] = useState<Set<number>>(new Set());
  const [mailboxSearch, setMailboxSearch] = useState("");
  const [dailyLimitOverride, setDailyLimitOverride] = useState<string>("");
  const [sendingDays, setSendingDays] = useState<Set<string>>(new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]));
  const [windowStart, setWindowStart] = useState("09:00");
  const [windowEnd, setWindowEnd] = useState("17:00");
  const [timezone, setTimezone] = useState(TIMEZONES[0]);

  // Step 5 — Review & launch
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [aiAgentId, setAiAgentId] = useState<string>("");
  const [humanReviewRequired, setHumanReviewRequired] = useState(true);

  useEffect(() => {
    let cancelled = false;
    aiAgentService
      .list()
      .then((result) => {
        if (!cancelled) setAgents(result);
      })
      .finally(() => {
        if (!cancelled) setAgentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMailboxes = useMemo(
    () => (mailboxMode === "all" ? mailboxes : mailboxes.filter((mailbox) => selectedMailboxIds.has(mailbox.id))),
    [mailboxMode, mailboxes, selectedMailboxIds]
  );
  const selectedDomains = useMemo(
    () => (mailboxMode === "all" ? domains : domains.filter((domain) => domain.mailboxes.some((mailbox) => selectedMailboxIds.has(mailbox.id)))),
    [mailboxMode, domains, selectedMailboxIds]
  );

  const dailyCapacity = selectedMailboxes.reduce((sum, mailbox) => sum + mailbox.dailyLimit, 0);
  const limitOverrideValue = Number(dailyLimitOverride);
  const limitExceedsCapacity = dailyLimitOverride !== "" && !Number.isNaN(limitOverrideValue) && limitOverrideValue > dailyCapacity;

  const dnsReady = selectedDomains.length > 0 && selectedDomains.every((domain) => domain.status === "Verified" && domain.configurationSetName != null);
  const flaggedMailboxes = selectedMailboxes.filter((mailbox) => mailbox.reputationStatus !== "Healthy");
  const mailboxesHealthy = selectedMailboxes.length > 0 && flaggedMailboxes.length === 0;
  const limitsSane = selectedMailboxes.length > 0 && !limitExceedsCapacity;

  const canProceed = {
    1: name.trim().length > 2,
    2: leads.length > 0,
    3: subject.trim().length > 0 && !isComposerEmpty(body),
    4: selectedMailboxes.length > 0 && sendingDays.size > 0 && !limitExceedsCapacity,
    5: true,
  }[step];

  function goNext() {
    if (step < STEPS.length) setStep(step + 1);
  }

  function goBack() {
    if (step > 1) setStep(step - 1);
  }

  function toggleMailbox(id: number) {
    setSelectedMailboxIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDay(day: string) {
    setSendingDays((current) => {
      const next = new Set(current);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function addFollowUp() {
    setFollowUps((current) => [...current, { id: Date.now(), delayDays: 3, body: "" }]);
  }

  function updateFollowUp(id: number, patch: Partial<FollowUp>) {
    setFollowUps((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeFollowUp(id: number) {
    setFollowUps((current) => current.filter((item) => item.id !== id));
  }

async function handleLaunch() {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const parsedAgentId = Number(aiAgentId);
      await campaignService.create({
        name,
        objective: objective || undefined,
        subject,
        body,
        leads,
        followUps: followUps.map((followUp) => ({ delayDays: followUp.delayDays, body: followUp.body })),
        mailboxMode,
        mailboxIds: mailboxMode === "specific" ? Array.from(selectedMailboxIds) : undefined,
        dailyLimitOverride: dailyLimitOverride ? Number(dailyLimitOverride) : null,
        sendingDays: Array.from(sendingDays),
        windowStart,
        windowEnd,
        timezone,
        aiAgentId: aiAgentId && Number.isFinite(parsedAgentId) ? parsedAgentId : null,
        humanReviewRequired,
      });

      navigate("/mailer/campaigns", { state: { launchedCampaign: name } });
    } catch (requestError) {
      setSubmitError(requestError instanceof Error ? requestError.message : "Unable to launch campaign");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <button
        className="flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-foreground"
        onClick={() => navigate("/mailer/campaigns")}
        type="button"
      >
        <ArrowLeft className="size-4" />
        Back to Campaigns
      </button>

      {domainsError ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{domainsError}</div>
      ) : null}
      {submitError ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{submitError}</div>
      ) : null}

      <Stepper currentStep={step} />

      <div className="apple-shadow rounded-2xl border border-border/70 bg-surface p-6">
        {step === 1 ? (
          <StepCampaign name={name} objective={objective} setName={setName} setObjective={setObjective} />
        ) : step === 2 ? (
          <StepAudience
            fileInputRef={fileInputRef}
            leads={leads}
            manualEmailsRaw={manualEmailsRaw}
            onClearUpload={clearUploadedFile}
            onUploadFile={handleLeadsFile}
            parseResult={parseResult}
            setManualEmailsRaw={setManualEmailsRaw}
            uploadErrorMessage={uploadErrorMessage}
            uploadFileName={uploadFileName}
            uploadProgress={uploadProgress}
            uploadStage={uploadStage}
          />
        ) : step === 3 ? (
          <StepMessage
            body={body}
            followUps={followUps}
            onAddFollowUp={addFollowUp}
            onRemoveFollowUp={removeFollowUp}
            onUpdateFollowUp={updateFollowUp}
            setBody={setBody}
            setSubject={setSubject}
            subject={subject}
          />
        ) : step === 4 ? (
          <StepSendingSchedule
            dailyCapacity={dailyCapacity}
            dailyLimitOverride={dailyLimitOverride}
            domains={domains}
            limitExceedsCapacity={limitExceedsCapacity}
            mailboxMode={mailboxMode}
            mailboxSearch={mailboxSearch}
            selectedMailboxCount={selectedMailboxes.length}
            selectedMailboxIds={selectedMailboxIds}
            sendingDays={sendingDays}
            setDailyLimitOverride={setDailyLimitOverride}
            setMailboxMode={setMailboxMode}
            setMailboxSearch={setMailboxSearch}
            setTimezone={setTimezone}
            setWindowEnd={setWindowEnd}
            setWindowStart={setWindowStart}
            timezone={timezone}
            toggleDay={toggleDay}
            toggleMailbox={toggleMailbox}
            totalDomainCount={domains.length}
            totalMailboxCount={mailboxes.length}
            windowEnd={windowEnd}
            windowStart={windowStart}
          />
        ) : (
          <StepReview
            agentsLoading={agentsLoading}
            aiAgentId={aiAgentId}
            aiAgents={agents}
            dailyCapacity={dailyCapacity}
            dnsReady={dnsReady}
            flaggedMailboxes={flaggedMailboxes}
            humanReviewRequired={humanReviewRequired}
            leadsCount={leads.length}
            limitsSane={limitsSane}
            mailboxMode={mailboxMode}
            mailboxesHealthy={mailboxesHealthy}
            name={name}
            selectedMailboxes={selectedMailboxes}
            sendingDays={sendingDays}
            setAiAgentId={setAiAgentId}
            setHumanReviewRequired={setHumanReviewRequired}
            subject={subject}
            timezone={timezone}
            windowEnd={windowEnd}
            windowStart={windowStart}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button isDisabled={step === 1} onPress={goBack} variant="secondary">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        {step < STEPS.length ? (
          <Button isDisabled={!canProceed} onPress={goNext}>
            Next
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button isDisabled={isSubmitting || selectedMailboxes.length === 0} onPress={handleLaunch}>
            {isSubmitting ? <Spinner color="current" size="sm" /> : <Rocket className="size-4" />}
            {isSubmitting ? "Launching…" : "Launch Campaign"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((step, index) => {
        const isComplete = step.id < currentStep;
        const isCurrent = step.id === currentStep;

        return (
          <div className="flex flex-1 items-center last:flex-none" key={step.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  "grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition",
                  isComplete ? "bg-accent text-accent-foreground" : isCurrent ? "border-2 border-accent text-accent" : "border border-border text-muted",
                ].join(" ")}
              >
                {isComplete ? <Check className="size-4" /> : step.id}
              </div>
              <span className={`whitespace-nowrap text-[11px] font-medium ${isCurrent ? "text-foreground" : "text-muted"}`}>{step.label}</span>
            </div>
            {index < STEPS.length - 1 ? (
              <div className={`mx-2 h-0.5 flex-1 rounded-full ${isComplete ? "bg-accent" : "bg-default-100"}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StepCampaign({
  name,
  setName,
  objective,
  setObjective,
}: {
  name: string;
  setName: (value: string) => void;
  objective: string;
  setObjective: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Campaign details</h2>
        <p className="mt-0.5 text-[12px] text-muted">What this campaign is for, and how it'll show up across the mailer dashboard.</p>
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        Campaign name
        <input
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent"
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Q4 Investor Outreach"
          value={name}
        />
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        Objective
        <textarea
          className="min-h-[88px] w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-accent"
          onChange={(event) => setObjective(event.target.value)}
          placeholder="e.g. Book intro calls with seed-stage fintech founders"
          value={objective}
        />
      </label>
    </div>
  );
}

function StepAudience({
  leads,
  fileInputRef,
  onUploadFile,
  uploadStage,
  uploadProgress,
  uploadFileName,
  uploadErrorMessage,
  parseResult,
  onClearUpload,
  manualEmailsRaw,
  setManualEmailsRaw,
}: {
  leads: ParsedLead[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUploadFile: (file: File) => void;
  uploadStage: UploadStage;
  uploadProgress: number;
  uploadFileName: string | null;
  uploadErrorMessage: string | null;
  parseResult: LeadFileParseResult | null;
  onClearUpload: () => void;
  manualEmailsRaw: string;
  setManualEmailsRaw: (value: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const isBusy = uploadStage === "uploading" || uploadStage === "processing";

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isBusy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onUploadFile(file);
  }

  const previewColumns = useMemo(() => {
    const columns: { key: keyof ParsedLead; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { key: "email", label: "Email", icon: Mail },
    ];
    if (leads.some((lead) => lead.fullName)) columns.push({ key: "fullName", label: "Name", icon: User });
    if (leads.some((lead) => lead.company)) columns.push({ key: "company", label: "Company", icon: Building2 });
    if (leads.some((lead) => lead.role)) columns.push({ key: "role", label: "Role", icon: User });
    if (leads.some((lead) => lead.phone)) columns.push({ key: "phone", label: "Phone", icon: Phone });
    return columns;
  }, [leads]);

  const extraColumnCount = parseResult
    ? parseResult.headers.length - Object.values(parseResult.fieldMap).filter(Boolean).length
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Audience</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          Upload a CSV, XLSX, or TXT export of your leads. Every column in the file — name, company, role, phone, and anything else — is imported and kept with the lead, not just the email address.
        </p>
      </div>

      <input
        accept=".csv,.xlsx,.xls,.txt"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUploadFile(file);
        }}
        ref={fileInputRef}
        type="file"
      />

      {uploadStage === "idle" ? (
        <div
          className={[
            "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition",
            isDragging ? "border-accent bg-accent/5" : "border-border bg-surface-secondary/60 hover:bg-surface-secondary",
          ].join(" ")}
          onClick={() => fileInputRef.current?.click()}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
        >
          <span className="grid size-11 place-items-center rounded-full bg-accent/10 text-accent">
            <Cloud className="size-5" />
          </span>
          <p className="text-[13px] font-semibold text-foreground">Drag and drop your lead file here</p>
          <p className="text-[12px] text-muted">or click to browse — .csv, .xlsx, .xls, or .txt</p>
        </div>
      ) : null}

      {uploadStage !== "idle" ? (
        <div className="rounded-2xl border border-border/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <FileSpreadsheet className="size-4" />
              </span>
              <p className="truncate text-[13px] font-medium text-foreground">{uploadFileName}</p>
            </div>
            {!isBusy ? (
              <button aria-label="Remove file" className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-danger" onClick={onClearUpload} type="button">
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {uploadStage === "uploading" ? (
            <div className="mt-3.5">
              <div className="flex items-center justify-between text-[12px] font-medium text-foreground">
                <span className="flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin text-accent" /> Uploading file…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-default-100">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : null}

          {uploadStage === "processing" ? (
            <div className="mt-3.5">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                <Loader2 className="size-3.5 animate-spin text-accent" />
                Parsing spreadsheet, validating email addresses, and removing duplicates…
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-default-100">
                <div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
              </div>
              <p className="mt-1.5 text-[11px] text-muted">Large files (10,000+ rows) can take a few seconds.</p>
            </div>
          ) : null}

          {uploadStage === "error" ? (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-danger">
              <AlertTriangle className="size-3.5" />
              {uploadErrorMessage || "Something went wrong while processing this file."}
            </p>
          ) : null}

          {uploadStage === "done" && parseResult ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatBlock label="Rows in file" value={parseResult.totalRows} />
                <StatBlock label="Leads ready" tone="success" value={parseResult.validCount} />
                <StatBlock label="Skipped (invalid)" tone={parseResult.invalidCount > 0 ? "warning" : undefined} value={parseResult.invalidCount} />
                <StatBlock label="Duplicates removed" value={parseResult.duplicateCount} />
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Detected columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(parseResult.fieldMap).map(([field, header]) => (
                    <span className="rounded-full border border-border/70 bg-surface-secondary/60 px-2.5 py-1 text-[11px] font-medium text-foreground" key={field}>
                      {header} <ArrowRight className="mx-0.5 inline size-3 text-muted" /> {FIELD_LABELS[field] || field}
                    </span>
                  ))}
                  {extraColumnCount > 0 ? (
                    <span className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted">
                      +{extraColumnCount} other column{extraColumnCount === 1 ? "" : "s"} kept with each lead
                    </span>
                  ) : null}
                </div>
              </div>

              {leads.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border/70">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-[12px]">
                      <thead className="border-b border-border/70 text-[10.5px] uppercase tracking-wide text-muted">
                        <tr>
                          {previewColumns.map((column) => (
                            <th className="px-3 py-2 font-medium" key={column.key}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {leads.slice(0, 8).map((lead) => (
                          <tr className="border-b border-border/60 last:border-0" key={lead.email}>
                            {previewColumns.map((column) => (
                              <td className="max-w-[180px] truncate px-3 py-2 text-foreground" key={column.key}>{String(lead[column.key] ?? "—")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {leads.length > 8 ? (
                    <p className="border-t border-border/70 bg-surface-secondary/40 px-3 py-2 text-[11px] text-muted">
                      +{leads.length - 8} more lead{leads.length - 8 === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        Or add emails manually (optional)
        <textarea
          className="min-h-[88px] w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 font-mono text-[12.5px] outline-none transition focus:border-accent"
          onChange={(event) => setManualEmailsRaw(event.target.value)}
          placeholder={"jane@company.com\njohn@startup.io"}
          value={manualEmailsRaw}
        />
      </label>

      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-surface-secondary/60 px-3.5 py-2.5">
        <CheckCircle2 className="size-4 shrink-0 text-success" />
        <p className="text-[12.5px] font-medium text-foreground">{leads.length} total lead{leads.length === 1 ? "" : "s"} ready for this campaign</p>
      </div>
    </div>
  );
}

function StatBlock({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-xl border border-border/70 p-2.5">
      <p className={`text-[18px] font-semibold leading-none ${toneClass}`}>{value.toLocaleString()}</p>
      <p className="mt-1 text-[10.5px] font-medium text-muted">{label}</p>
    </div>
  );
}

function StepMessage({
  subject,
  setSubject,
  body,
  setBody,
  followUps,
  onAddFollowUp,
  onUpdateFollowUp,
  onRemoveFollowUp,
}: {
  subject: string;
  setSubject: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  followUps: FollowUp[];
  onAddFollowUp: () => void;
  onUpdateFollowUp: (id: number, patch: Partial<FollowUp>) => void;
  onRemoveFollowUp: (id: number) => void;
}) {
  const subjectInputRef = useRef<HTMLInputElement>(null);

  function insertSubjectVariable(key: string) {
    const input = subjectInputRef.current;
    const token = `{{${key}}}`;
    if (!input) {
      setSubject(subject + token);
      return;
    }
    const start = input.selectionStart ?? subject.length;
    const end = input.selectionEnd ?? subject.length;
    const next = subject.slice(0, start) + token + subject.slice(end);
    setSubject(next);
    requestAnimationFrame(() => {
      input.focus();
      const caret = start + token.length;
      input.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Message</h2>
        <p className="mt-0.5 text-[12px] text-muted">The initial email, plus any follow-up steps in the sequence.</p>
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="campaign-subject">Subject line</label>
        <input
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent"
          id="campaign-subject"
          onChange={(event) => setSubject(event.target.value)}
          placeholder="e.g. Quick question about {{company}}'s runway"
          ref={subjectInputRef}
          value={subject}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="pl-0.5 text-[11px] font-medium text-muted">Insert:</span>
          {MERGE_VARIABLES.map((variable) => (
            <Tooltip delay={200} key={variable.key}>
              <Tooltip.Trigger>
                <button
                  className="rounded-full border border-border/70 bg-surface px-2.5 py-1 font-mono text-[11px] font-medium text-accent transition hover:border-accent hover:bg-accent/5"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertSubjectVariable(variable.key);
                  }}
                  type="button"
                >
                  {`{{${variable.key}}}`}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content className="max-w-[220px] text-[11px] leading-4">
                <p className="font-semibold text-foreground">{variable.label}</p>
                <p className="mt-0.5 text-muted">{variable.description}</p>
              </Tooltip.Content>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5 text-sm font-medium text-foreground">
        Email body
        <RichTextEditor
          ariaLabel="Email body"
          minHeightClassName="min-h-[160px]"
          onChange={setBody}
          placeholder="Hi {{first_name}}, ..."
          value={body}
          variables={MERGE_VARIABLES}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Follow-ups ({followUps.length})</p>
          <Button onPress={onAddFollowUp} size="sm" variant="secondary">
            <Plus className="size-4" />
            Add follow-up
          </Button>
        </div>
        <div className="space-y-3">
          {followUps.map((followUp, index) => (
            <div className="rounded-2xl border border-border/70 p-3" key={followUp.id}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
                  Follow-up {index + 1} — wait
                  <input
                    className="h-8 w-16 rounded-lg border border-border bg-surface px-2 text-center text-[12px] outline-none focus:border-accent"
                    min={1}
                    onChange={(event) => onUpdateFollowUp(followUp.id, { delayDays: Number(event.target.value) || 1 })}
                    type="number"
                    value={followUp.delayDays}
                  />
                  days
                </div>
                <button
                  aria-label="Remove follow-up"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-danger"
                  onClick={() => onRemoveFollowUp(followUp.id)}
                  type="button"
                >
                  <Minus className="size-4" />
                </button>
              </div>
              <RichTextEditor
                ariaLabel={`Follow-up ${index + 1} body`}
                minHeightClassName="min-h-[84px]"
                onChange={(value) => onUpdateFollowUp(followUp.id, { body: value })}
                placeholder="Just bumping this up in your inbox…"
                value={followUp.body}
                variables={MERGE_VARIABLES}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepSendingSchedule({
  domains,
  mailboxMode,
  setMailboxMode,
  mailboxSearch,
  setMailboxSearch,
  selectedMailboxIds,
  selectedMailboxCount,
  totalMailboxCount,
  totalDomainCount,
  toggleMailbox,
  dailyLimitOverride,
  setDailyLimitOverride,
  dailyCapacity,
  limitExceedsCapacity,
  sendingDays,
  toggleDay,
  windowStart,
  setWindowStart,
  windowEnd,
  setWindowEnd,
  timezone,
  setTimezone,
}: {
  domains: WizardDomain[];
  mailboxMode: "all" | "specific";
  setMailboxMode: (mode: "all" | "specific") => void;
  mailboxSearch: string;
  setMailboxSearch: (value: string) => void;
  selectedMailboxIds: Set<number>;
  selectedMailboxCount: number;
  totalMailboxCount: number;
  totalDomainCount: number;
  toggleMailbox: (id: number) => void;
  dailyLimitOverride: string;
  setDailyLimitOverride: (value: string) => void;
  dailyCapacity: number;
  limitExceedsCapacity: boolean;
  sendingDays: Set<string>;
  toggleDay: (day: string) => void;
  windowStart: string;
  setWindowStart: (value: string) => void;
  windowEnd: string;
  setWindowEnd: (value: string) => void;
  timezone: string;
  setTimezone: (value: string) => void;
}) {
  const query = mailboxSearch.trim().toLowerCase();
  const filteredDomains = query
    ? domains
        .map((domain) => ({
          ...domain,
          mailboxes: domain.domain.toLowerCase().includes(query)
            ? domain.mailboxes
            : domain.mailboxes.filter((mailbox) => mailbox.email.toLowerCase().includes(query)),
        }))
        .filter((domain) => domain.mailboxes.length > 0)
    : domains;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Sending mailboxes &amp; schedule</h2>
        <p className="mt-0.5 text-[12px] text-muted">Sender selection, daily-limit check, rate limiter, and scheduler — matches the delivery pipeline in the plan.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Sending mailboxes</p>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
          <MailboxModeOption
            description={`Send from every active, healthy mailbox across all ${totalDomainCount} domain${totalDomainCount === 1 ? "" : "s"} — including ones onboarded later.`}
            isSelected={mailboxMode === "all"}
            label="All mailboxes"
            onSelect={() => setMailboxMode("all")}
          />
          <MailboxModeOption
            description="Hand-pick which mailboxes send this campaign."
            isSelected={mailboxMode === "specific"}
            label="Specific mailboxes"
            onSelect={() => setMailboxMode("specific")}
          />
        </div>

        {mailboxMode === "all" ? (
          <div className="mt-3 rounded-2xl border border-border/70 bg-surface-secondary/60 p-3 text-[12.5px] text-foreground">
            <span className="font-semibold">{totalMailboxCount}</span> mailboxes across{" "}
            <span className="font-semibold">{totalDomainCount}</span> domain{totalDomainCount === 1 ? "" : "s"} will be used. New mailboxes added to a domain after launch are picked up automatically.
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-muted">{selectedMailboxCount} selected</p>
              <div className="relative w-full max-w-[280px]">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <input
                  className="h-9 w-full rounded-xl border border-border bg-surface pl-8 pr-3 text-[12.5px] outline-none transition focus:border-accent"
                  onChange={(event) => setMailboxSearch(event.target.value)}
                  placeholder="Search by mailbox or domain"
                  value={mailboxSearch}
                />
              </div>
            </div>
            {filteredDomains.length === 0 ? (
              <p className="rounded-2xl border border-border/70 p-4 text-center text-[12.5px] text-muted">No mailboxes match "{mailboxSearch}".</p>
            ) : null}
            {filteredDomains.map((domain) => (
              <div className="rounded-2xl border border-border/70 p-3" key={domain.id}>
                <p className="mb-2 text-[12px] font-semibold text-muted">{domain.domain}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {domain.mailboxes.map((mailbox) => {
                    const isSelected = selectedMailboxIds.has(mailbox.id);

                    return (
                      <button
                        className={[
                          "flex items-center justify-between gap-2 rounded-xl border p-2.5 text-left transition",
                          isSelected ? "border-accent bg-accent/5" : "border-border/70 hover:bg-surface-secondary/60",
                        ].join(" ")}
                        key={mailbox.id}
                        onClick={() => toggleMailbox(mailbox.id)}
                        type="button"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-foreground">{mailbox.email}</p>
                          <p className="text-[11px] text-muted">
                            {mailbox.reputationStatus} · {mailbox.dailyLimit}/day
                          </p>
                        </div>
                        {isSelected ? <Check className="size-4 shrink-0 text-accent" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-foreground">
          Daily send limit (optional override)
          <input
            className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent"
            onChange={(event) => setDailyLimitOverride(event.target.value)}
            placeholder={`Default: ${dailyCapacity}/day across these mailboxes`}
            type="number"
            value={dailyLimitOverride}
          />
          {limitExceedsCapacity ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-danger">
              <AlertTriangle className="size-3.5" />
              Exceeds combined mailbox capacity ({dailyCapacity}/day).
            </span>
          ) : null}
        </label>

        <div className="grid gap-1.5 text-sm font-medium text-foreground">
          Timezone
          <SelectField
            ariaLabel="Timezone"
            onChange={setTimezone}
            options={TIMEZONES.map((tz) => ({ id: tz, name: tz }))}
            value={timezone}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Sending days</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const isSelected = sendingDays.has(day);

            return (
              <button
                className={[
                  "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition",
                  isSelected ? "border-accent bg-accent/10 text-accent" : "border-border/70 text-muted hover:bg-surface-secondary/60",
                ].join(" ")}
                key={day}
                onClick={() => toggleDay(day)}
                type="button"
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 text-sm font-medium text-foreground">
          Sending window — start
          <TimeFieldInput ariaLabel="Sending window start" onChange={setWindowStart} value={windowStart} />
        </div>
        <div className="grid gap-1.5 text-sm font-medium text-foreground">
          Sending window — end
          <TimeFieldInput ariaLabel="Sending window end" onChange={setWindowEnd} value={windowEnd} />
        </div>
      </div>
    </div>
  );
}

function SelectField({
  ariaLabel,
  value,
  onChange,
  options,
  disabled = false,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.id === value);

  return (
    <Select
      aria-label={ariaLabel}
      className="agent-select w-full"
      fullWidth
      isDisabled={disabled}
      selectedKey={value}
      variant="primary"
      onSelectionChange={(key) => {
        if (key) onChange(String(key));
      }}
    >
      <Select.Trigger className="h-11 px-3 text-sm text-foreground">
        <Select.Value>{selected?.name}</Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label={ariaLabel} className="max-h-64 overflow-y-auto" items={options}>
          {(option) => (
            <ListBox.Item id={option.id} textValue={option.name}>
              <ListBox.ItemIndicator />
              {option.name}
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function TimeFieldInput({ ariaLabel, value, onChange }: { ariaLabel: string; value: string; onChange: (value: string) => void }) {
  return (
    <TimeField
      aria-label={ariaLabel}
      value={value ? parseTime(value) : null}
      onChange={(time: Time | null) => {
        if (!time) return;
        onChange(`${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`);
      }}
    >
      <TimeField.Group className="h-11 rounded-xl px-3 text-sm text-foreground" fullWidth variant="primary">
        <TimeField.Input>
          {(segment) => <TimeField.Segment segment={segment} />}
        </TimeField.Input>
      </TimeField.Group>
    </TimeField>
  );
}

function MailboxModeOption({
  label,
  description,
  isSelected,
  onSelect,
}: {
  label: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-checked={isSelected}
      className={[
        "rounded-2xl border p-3 text-left transition",
        isSelected ? "border-accent bg-accent/5" : "border-border/70 hover:bg-surface-secondary/60",
      ].join(" ")}
      onClick={onSelect}
      role="radio"
      type="button"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        <span
          className={[
            "grid size-4 shrink-0 place-items-center rounded-full border-2",
            isSelected ? "border-accent" : "border-border",
          ].join(" ")}
        >
          {isSelected ? <span className="size-2 rounded-full bg-accent" /> : null}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-muted">{description}</p>
    </button>
  );
}

function summarizeMailboxes(mailboxes: WizardMailbox[]) {
  if (mailboxes.length === 0) return "—";
  const preview = mailboxes.slice(0, 4).map((mailbox) => mailbox.email).join(", ");
  const remaining = mailboxes.length - 4;
  return remaining > 0 ? `${preview} +${remaining} more` : preview;
}

function StepReview({
  name,
  leadsCount,
  subject,
  selectedMailboxes,
  mailboxMode,
  sendingDays,
  windowStart,
  windowEnd,
  timezone,
  aiAgents,
  agentsLoading,
  aiAgentId,
  setAiAgentId,
  humanReviewRequired,
  setHumanReviewRequired,
  dnsReady,
  mailboxesHealthy,
  limitsSane,
  dailyCapacity,
  flaggedMailboxes,
}: {
  name: string;
  leadsCount: number;
  subject: string;
  selectedMailboxes: WizardMailbox[];
  mailboxMode: "all" | "specific";
  sendingDays: Set<string>;
  windowStart: string;
  windowEnd: string;
  timezone: string;
  aiAgents: Agent[];
  agentsLoading: boolean;
  aiAgentId: string;
  setAiAgentId: (value: string) => void;
  humanReviewRequired: boolean;
  setHumanReviewRequired: (value: boolean) => void;
  dnsReady: boolean;
  mailboxesHealthy: boolean;
  limitsSane: boolean;
  dailyCapacity: number;
  flaggedMailboxes: WizardMailbox[];
}) {
  const checklist = [
    { label: "Domain DNS / SES verification", pass: dnsReady, detail: dnsReady ? "All sending domains verified and configured." : "One or more sending domains aren't fully verified yet." },
    { label: "Mailbox reputation", pass: mailboxesHealthy, detail: mailboxesHealthy ? "Every selected mailbox is Healthy." : `${flaggedMailboxes.length} selected mailbox(es) flagged Watch/At Risk.` },
    { label: "Daily-limit sanity check", pass: limitsSane, detail: `Combined capacity: ${dailyCapacity} emails/day across selected mailboxes.` },
    { label: "Blacklist / health flags", pass: true, detail: "No blacklist or health-engine flags on selected sending domains." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Review &amp; launch</h2>
        <p className="mt-0.5 text-[12px] text-muted">Assign the AI Auto Responder for replies, then run the pre-flight safety check before this campaign goes live.</p>
      </div>

      <div className="space-y-3">
        <ReviewRow label="Campaign" value={name || "—"} />
        <ReviewRow label="Leads" value={`${leadsCount} recipients`} />
        <ReviewRow label="Subject" value={subject || "—"} />
        <ReviewRow label="Sending mailboxes" value={mailboxMode === "all" ? `All ${selectedMailboxes.length} mailboxes` : summarizeMailboxes(selectedMailboxes)} />
        <ReviewRow label="Schedule" value={`${[...sendingDays].join(", ") || "—"} · ${windowStart}–${windowEnd} (${timezone})`} />
      </div>

      <div className="rounded-2xl border border-border/70 p-3">
        <p className="mb-3 text-[13px] font-semibold text-foreground">AI Auto Responder</p>
        <div className="grid gap-1.5 text-sm font-medium text-foreground">
          Assign agent to handle replies
          <SelectField
            ariaLabel="Assign agent to handle replies"
            disabled={agentsLoading}
            onChange={setAiAgentId}
            options={[
              { id: "", name: agentsLoading ? "Loading agents…" : "No auto-reply — manual only" },
              ...aiAgents.map((agent) => ({ id: String(agent.id ?? agent.name), name: agent.name })),
            ]}
            value={aiAgentId}
          />
        </div>

        <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-border/70 p-3">
          <div>
            <p className="text-[13px] font-semibold text-foreground">Require human review before send</p>
            <p className="mt-0.5 text-[11px] leading-4 text-muted">AI drafts replies, a human approves before it sends. Turn off for full auto-reply.</p>
          </div>
          <Checkbox aria-label="Require human review before send" className="mt-0.5 shrink-0" isSelected={humanReviewRequired} onChange={setHumanReviewRequired}>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
            </Checkbox.Content>
          </Checkbox>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-foreground">Pre-flight safety check</p>
        <div className="space-y-2">
          {checklist.map((item) => (
            <div className="flex items-start gap-2.5 rounded-xl border border-border/70 p-3" key={item.label}>
              {item.pass ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              )}
              <div>
                <p className="text-[12.5px] font-medium text-foreground">{item.label}</p>
                <p className="text-[11px] leading-4 text-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <p className="shrink-0 text-[12px] font-medium text-muted">{label}</p>
      <p className="max-w-[520px] text-right text-[13px] font-medium text-foreground">{value}</p>
    </div>
  );
}
