import { useEffect, useMemo, useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import { ArrowLeft, ArrowRight, Check, Minus, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DomainCombobox } from "../components/mailer/DomainCombobox";
import { LoadingState } from "../components/ui/LoadingState";
import { domainService, mailboxService } from "../services/api";
import type { Domain, MailboxCreateResult } from "../types";

const STEPS = [
  { id: 1, label: "Configure mailboxes" },
  { id: 2, label: "Results" },
] as const;

const LOCAL_PART_PATTERN = /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$/i;

export function MailboxOnboarding() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isCheckingDomains, setIsCheckingDomains] = useState(true);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [hasDomains, setHasDomains] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [selectedDomainStatus, setSelectedDomainStatus] = useState<Domain["status"] | null>(null);
  const [localParts, setLocalParts] = useState<string[]>(["sarah.connor"]);
  const [displayName, setDisplayName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [results, setResults] = useState<MailboxCreateResult[]>([]);

  useEffect(() => {
    checkHasDomains();
  }, []);

  async function checkHasDomains() {
    setIsCheckingDomains(true);
    setCheckError(null);
    try {
      const domainsPage = await domainService.list({ limit: 1 });
      setHasDomains(domainsPage.total > 0);
    } catch (requestError) {
      setCheckError(requestError instanceof Error ? requestError.message : "Unable to check onboarded domains");
    } finally {
      setIsCheckingDomains(false);
    }
  }

  function selectDomain(domain: Domain) {
    setDomainName(domain.domain);
    setSelectedDomainStatus(domain.status);
  }

  const cleanedLocalParts = useMemo(() => localParts.map((part) => part.trim()).filter(Boolean), [localParts]);
  const invalidLocalParts = cleanedLocalParts.filter((part) => !LOCAL_PART_PATTERN.test(part));
  const canSubmit = Boolean(domainName) && cleanedLocalParts.length > 0 && invalidLocalParts.length === 0;

  function updateLocalPart(index: number, value: string) {
    setLocalParts((parts) => parts.map((part, i) => (i === index ? value : part)));
  }

  function addLocalPart() {
    setLocalParts((parts) => [...parts, ""]);
  }

  function removeLocalPart(index: number) {
    setLocalParts((parts) => parts.filter((_, i) => i !== index));
  }

  async function submit() {
    setStep(2);
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const data = await mailboxService.create({
        domain: domainName,
        localParts: cleanedLocalParts,
        displayName: displayName.trim() || undefined,
      });
      setResults(data);
    } catch (requestError) {
      setSubmitError(requestError instanceof Error ? requestError.message : "Unable to create mailboxes");
    } finally {
      setIsSubmitting(false);
    }
  }

  const createdCount = results.filter((result) => result.status === "Created").length;

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <button
        className="flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-foreground"
        onClick={() => navigate("/mailer/mailboxes")}
        type="button"
      >
        <ArrowLeft className="size-4" />
        Back to Mailboxes
      </button>

      <Stepper currentStep={step} />

      <Card className="apple-shadow border border-border/70 bg-surface p-6">
        {step === 1 ? (
          <StepConfigure
            checkError={checkError}
            displayName={displayName}
            domainName={domainName}
            hasDomains={hasDomains}
            invalidLocalParts={invalidLocalParts}
            isCheckingDomains={isCheckingDomains}
            localParts={localParts}
            onAdd={addLocalPart}
            onRemove={removeLocalPart}
            onRetry={checkHasDomains}
            onUpdate={updateLocalPart}
            selectDomain={selectDomain}
            selectedDomainStatus={selectedDomainStatus}
            setDisplayName={setDisplayName}
          />
        ) : (
          <StepResults createdCount={createdCount} isSubmitting={isSubmitting} results={results} submitError={submitError} totalRequested={cleanedLocalParts.length} />
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button isDisabled={step === 1} onPress={() => setStep(1)} variant="secondary">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        {step === 1 ? (
          <Button isDisabled={!canSubmit} onPress={submit}>
            Create {cleanedLocalParts.length || ""} mailbox{cleanedLocalParts.length === 1 ? "" : "es"}
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button isDisabled={isSubmitting} onPress={() => navigate("/mailer/mailboxes")}>
            <Check className="size-4" />
            Done
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

function StepConfigure({
  isCheckingDomains,
  checkError,
  onRetry,
  hasDomains,
  domainName,
  selectDomain,
  selectedDomainStatus,
  localParts,
  onUpdate,
  onAdd,
  onRemove,
  invalidLocalParts,
  displayName,
  setDisplayName,
}: {
  isCheckingDomains: boolean;
  checkError: string | null;
  onRetry: () => void;
  hasDomains: boolean;
  domainName: string;
  selectDomain: (domain: Domain) => void;
  selectedDomainStatus: Domain["status"] | null;
  localParts: string[];
  onUpdate: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  invalidLocalParts: string[];
  displayName: string;
  setDisplayName: (value: string) => void;
}) {
  if (isCheckingDomains) return <LoadingState label="Checking onboarded domains…" />;

  if (checkError) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
        <span>{checkError}</span>
        <Button onPress={onRetry} size="sm" variant="secondary">Retry</Button>
      </div>
    );
  }

  if (!hasDomains) {
    return (
      <p className="px-2 py-10 text-center text-[13px] text-muted">
        No domains onboarded yet. Onboard a domain first from the Domains page before creating mailboxes.
      </p>
    );
  }

  const domainSuffix = `@${domainName || "yourdomain.com"}`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Configure mailboxes</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          These are SES sending identities under a verified domain — they can send outbound email today. Receiving/IMAP isn't wired up yet.
        </p>
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        Domain
        <DomainCombobox onChange={selectDomain} placeholder="Search onboarded domains…" value={domainName} />
      </label>
      {selectedDomainStatus && selectedDomainStatus !== "Verified" ? (
        <p className="text-[12px] text-warning">
          This domain isn't fully verified yet — mailboxes will be created but paused until {domainName} finishes DNS/DKIM verification.
        </p>
      ) : null}

      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        Sender display name (optional, applied to all)
        <input
          className="h-11 w-full rounded-xl border border-border bg-surface-secondary px-3 text-sm outline-none transition focus:border-accent"
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="e.g. Sarah Connor"
          value={displayName}
        />
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Mailbox addresses ({localParts.length})</p>
          <Button onPress={onAdd} size="sm" variant="secondary">
            <Plus className="size-4" />
            Add mailbox
          </Button>
        </div>
        <div className="space-y-2">
          {localParts.map((part, index) => {
            const trimmed = part.trim();
            const isInvalid = trimmed.length > 0 && invalidLocalParts.includes(trimmed);
            return (
              <div className="flex items-center gap-2" key={index}>
                <div className="relative flex-1">
                  <input
                    className={`h-10 w-full rounded-xl border bg-surface-secondary px-3 text-sm outline-none transition focus:border-accent ${isInvalid ? "border-danger" : "border-border"}`}
                    onChange={(event) => onUpdate(index, event.target.value)}
                    placeholder="e.g. sarah.connor"
                    value={part}
                  />
                </div>
                <span className="text-[13px] text-muted">{domainSuffix}</span>
                <button
                  aria-label="Remove mailbox"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-danger disabled:pointer-events-none disabled:opacity-40"
                  disabled={localParts.length <= 1}
                  onClick={() => onRemove(index)}
                  type="button"
                >
                  <Minus className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
        {invalidLocalParts.length > 0 ? (
          <p className="mt-2 text-[12px] text-danger">Invalid mailbox name(s): {invalidLocalParts.join(", ")}</p>
        ) : null}
      </div>
    </div>
  );
}

function StepResults({
  results,
  isSubmitting,
  submitError,
  createdCount,
  totalRequested,
}: {
  results: MailboxCreateResult[];
  isSubmitting: boolean;
  submitError: string | null;
  createdCount: number;
  totalRequested: number;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Results</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          {isSubmitting ? "Creating mailboxes…" : `Created ${createdCount} of ${totalRequested} mailboxes.`}
        </p>
      </div>

      {submitError ? <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{submitError}</div> : null}

      {isSubmitting ? (
        <LoadingState label="Creating mailboxes…" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2.5 font-medium">Mailbox</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr className="border-b border-border/60 last:border-0" key={result.email}>
                  <td className="px-3 py-2.5 font-medium text-foreground">{result.email}</td>
                  <td className="px-3 py-2.5">
                    <Chip color={result.status === "Created" ? "success" : "danger"} size="sm" variant="soft">{result.status}</Chip>
                  </td>
                  <td className="px-3 py-2.5 text-muted">
                    {result.error ?? (result.record?.status === "Active" ? "Ready to send" : "Paused — domain not verified yet")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
