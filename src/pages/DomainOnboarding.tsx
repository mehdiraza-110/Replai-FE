import { useEffect, useMemo, useState } from "react";
import { Button, Card, Chip, Spinner } from "@heroui/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Globe,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "../components/ui/LoadingState";
import { SkeletonRow } from "../components/ui/Skeleton";
import { domainService } from "../services/api";
import type { Domain, DnsRecordInstruction, DomainOnboardResult, HostedZone } from "../types";

const STEPS = [
  { id: 1, label: "Select domains" },
  { id: 2, label: "Provision & verify" },
] as const;

type Source = "route53" | "external";
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function DomainOnboarding() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [source, setSource] = useState<Source>("route53");
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hostedZones, setHostedZones] = useState<HostedZone[]>([]);
  const [onboardedDomains, setOnboardedDomains] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [externalDomain, setExternalDomain] = useState("");

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [results, setResults] = useState<DomainOnboardResult[]>([]);
  const [isRefreshingResults, setIsRefreshingResults] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoadingZones(true);
    setLoadError(null);
    try {
      const [zones, domainsPage] = await Promise.all([domainService.listHostedZones(), domainService.list({ limit: 500 })]);
      setHostedZones(zones);
      setOnboardedDomains(new Set(domainsPage.items.map((domain) => domain.domain)));
    } catch (requestError) {
      setLoadError(requestError instanceof Error ? requestError.message : "Unable to load Route53 hosted zones");
    } finally {
      setIsLoadingZones(false);
    }
  }

  const availableZones = useMemo(() => {
    const query = search.trim().toLowerCase();
    return hostedZones
      .filter((zone) => !onboardedDomains.has(zone.domain))
      .filter((zone) => !query || zone.domain.toLowerCase().includes(query));
  }, [hostedZones, onboardedDomains, search]);

  const normalizedExternalDomain = externalDomain.trim().toLowerCase();
  const externalDomainError =
    normalizedExternalDomain.length === 0
      ? null
      : onboardedDomains.has(normalizedExternalDomain)
      ? "This domain is already onboarded."
      : !DOMAIN_PATTERN.test(normalizedExternalDomain)
      ? "Enter a valid domain, e.g. mail.example.com"
      : null;
  const canProceedExternal = normalizedExternalDomain.length > 0 && !externalDomainError;

  function toggle(domain: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => (current.size === availableZones.length ? new Set() : new Set(availableZones.map((zone) => zone.domain))));
  }

  async function startProvisioning() {
    setStep(2);
    setIsProvisioning(true);
    setProvisionError(null);
    try {
      if (source === "external") {
        const data = await domainService.onboardExternal(normalizedExternalDomain);
        setResults([data]);
      } else {
        const data = await domainService.onboard(Array.from(selected));
        setResults(data);
      }
    } catch (requestError) {
      setProvisionError(requestError instanceof Error ? requestError.message : "Unable to onboard domain(s)");
    } finally {
      setIsProvisioning(false);
    }
  }

  async function recheckStatus() {
    setIsRefreshingResults(true);
    try {
      const updates = await Promise.all(
        results
          .filter((result) => result.status !== "Failed")
          .map((result) => domainService.refreshOne(result.domain).catch((error) => ({ domain: result.domain, status: "Failed", error: error.message }) as DomainOnboardResult))
      );
      const byDomain = new Map(updates.map((update) => ["domain" in update ? update.domain : "", update]));
      setResults((current) =>
        current.map((result) => {
          const update = byDomain.get(result.domain);
          if (!update) return result;
          if ("record" in update || (update as Domain).id) {
            const record = (update as Domain).id ? (update as Domain) : (update as DomainOnboardResult).record;
            return { ...result, status: record?.status ?? result.status, record: record ?? result.record };
          }
          return { ...result, ...update };
        })
      );
    } finally {
      setIsRefreshingResults(false);
    }
  }

  const allVerified = results.length > 0 && results.every((result) => result.record?.status === "Verified");

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <button
        className="flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-foreground"
        onClick={() => navigate("/mailer/domains")}
        type="button"
      >
        <ArrowLeft className="size-4" />
        Back to Domains
      </button>

      <Stepper currentStep={step} />

      <Card className="apple-shadow border border-border/70 bg-surface p-6">
        {step === 1 ? (
          <div className="space-y-5">
            <div className="inline-flex rounded-xl border border-border/70 bg-surface-secondary/60 p-1">
              <button
                className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${source === "route53" ? "bg-surface text-foreground shadow-sm" : "text-muted"}`}
                onClick={() => setSource("route53")}
                type="button"
              >
                From Route53
              </button>
              <button
                className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${source === "external" ? "bg-surface text-foreground shadow-sm" : "text-muted"}`}
                onClick={() => setSource("external")}
                type="button"
              >
                Domain hosted elsewhere
              </button>
            </div>

            {source === "route53" ? (
              <StepSelectDomains
                availableZones={availableZones}
                isLoading={isLoadingZones}
                loadError={loadError}
                onRetry={load}
                search={search}
                selected={selected}
                setSearch={setSearch}
                toggle={toggle}
                toggleAll={toggleAll}
              />
            ) : (
              <StepExternalDomain
                error={externalDomainError}
                onChange={setExternalDomain}
                value={externalDomain}
              />
            )}
          </div>
        ) : (
          <StepProvision
            allVerified={allVerified}
            isProvisioning={isProvisioning}
            isRefreshing={isRefreshingResults}
            onRecheck={recheckStatus}
            provisionError={provisionError}
            results={results}
            selectedCount={source === "external" ? 1 : selected.size}
            source={source}
          />
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button isDisabled={step === 1} onPress={() => setStep(1)} variant="secondary">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        {step === 1 ? (
          <Button isDisabled={source === "route53" ? selected.size === 0 : !canProceedExternal} onPress={startProvisioning}>
            {source === "route53" ? (
              <>Onboard {selected.size || ""} domain{selected.size === 1 ? "" : "s"}</>
            ) : (
              <>Onboard domain</>
            )}
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button isDisabled={isProvisioning} onPress={() => navigate("/mailer/domains")}>
            <Check className="size-4" />
            Done
          </Button>
        )}
      </div>
    </div>
  );
}

function StepExternalDomain({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Onboard a domain hosted elsewhere</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          For a domain that isn't in this AWS account's Route53 (e.g. managed at Cloudflare, GoDaddy, Namecheap). We'll create the SES identity and give you the exact DNS records to add at your own DNS provider — nothing is written automatically.
        </p>
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        Domain name
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            className="h-11 w-full rounded-xl border border-border bg-surface-secondary pl-9 pr-3 text-sm outline-none transition focus:border-accent"
            onChange={(event) => onChange(event.target.value)}
            placeholder="e.g. sales.example.com"
            value={value}
          />
        </div>
      </label>
      {error ? <p className="text-[12px] font-medium text-danger">{error}</p> : null}
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

function StepSelectDomains({
  isLoading,
  loadError,
  onRetry,
  availableZones,
  selected,
  toggle,
  toggleAll,
  search,
  setSearch,
}: {
  isLoading: boolean;
  loadError: string | null;
  onRetry: () => void;
  availableZones: HostedZone[];
  selected: Set<string>;
  toggle: (domain: string) => void;
  toggleAll: () => void;
  search: string;
  setSearch: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Select domains to onboard</h2>
        <p className="mt-0.5 text-[12px] text-muted">Pulled live from Route53 hosted zones on the connected AWS account. Already-onboarded domains are hidden.</p>
      </div>

      {loadError ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          <span>{loadError}</span>
          <Button onPress={onRetry} size="sm" variant="secondary">Retry</Button>
        </div>
      ) : null}

      <div className="relative">
        <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          className="h-11 w-full rounded-xl border border-border bg-surface-secondary pl-9 pr-3 text-sm outline-none transition focus:border-accent"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search hosted zones"
          value={search}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70">
        <div className="flex items-center justify-between border-b border-border/70 px-3 py-2.5">
          <button className="text-[12px] font-medium text-accent" onClick={toggleAll} type="button">
            {selected.size === availableZones.length && availableZones.length > 0 ? "Deselect all" : "Select all"}
          </button>
          <p className="text-[11px] text-muted">{selected.size} selected</p>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <LoadingState label="Loading hosted zones from Route53…" />
          ) : availableZones.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-muted">
              No hosted zones available to onboard. Add a domain in Route53 first, or every hosted zone is already onboarded.
            </p>
          ) : (
            availableZones.map((zone) => (
              <label
                className="flex cursor-pointer items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-0 hover:bg-surface-secondary/60"
                key={zone.domain}
              >
                <div className="flex items-center gap-3">
                  <input checked={selected.has(zone.domain)} className="size-4" onChange={() => toggle(zone.domain)} type="checkbox" />
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{zone.domain}</p>
                    <p className="text-[11px] text-muted">Hosted zone {zone.hostedZoneId}</p>
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StepProvision({
  results,
  isProvisioning,
  isRefreshing,
  onRecheck,
  provisionError,
  selectedCount,
  allVerified,
  source,
}: {
  results: DomainOnboardResult[];
  isProvisioning: boolean;
  isRefreshing: boolean;
  onRecheck: () => void;
  provisionError: string | null;
  selectedCount: number;
  allVerified: boolean;
  source: Source;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Provision &amp; verify</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            {source === "external"
              ? "Creating an SES identity for this domain — add the DNS records below at your own DNS provider."
              : `Creating SES identities and writing DKIM, SPF, MAIL FROM, and DMARC records into Route53 for ${selectedCount} domain${selectedCount === 1 ? "" : "s"}.`}
          </p>
        </div>
        {results.length > 0 ? (
          <Button isDisabled={isRefreshing} onPress={onRecheck} size="sm" variant={allVerified ? "secondary" : "primary"}>
            {isRefreshing ? <Spinner color="current" size="sm" /> : allVerified ? <CheckCircle2 className="size-4" /> : <RefreshCw className="size-4" />}
            {isRefreshing ? "Checking…" : allVerified ? "All verified" : "Recheck verification"}
          </Button>
        ) : null}
      </div>

      {provisionError ? (
        <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{provisionError}</div>
      ) : null}

      {isProvisioning ? (
        <LoadingState label="Creating SES identities and writing DNS records…" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/70">
          <table className="w-full min-w-[640px] text-left text-[12px]">
            <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                {["Domain", "Status", "SPF", "DKIM", "DMARC", "MAIL FROM"].map((header) => (
                  <th className="px-3 py-2.5 font-medium" key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <SkeletonRow columns={6} />
              ) : (
                results.map((result) => (
                  <tr className="border-b border-border/60 last:border-0" key={result.domain}>
                    <td className="px-3 py-2.5 font-medium text-foreground">{result.domain}</td>
                    <td className="px-3 py-2.5">
                      <Chip color={result.record?.status === "Verified" ? "success" : result.status === "Failed" ? "danger" : "warning"} size="sm" variant="soft">
                        {result.record?.status ?? result.status}
                      </Chip>
                    </td>
                    <td className="px-3 py-2.5"><StatusDot status={result.record?.spfStatus} /></td>
                    <td className="px-3 py-2.5"><StatusDot status={result.record?.dkimStatus} /></td>
                    <td className="px-3 py-2.5"><StatusDot status={result.record?.dmarcStatus} /></td>
                    <td className="px-3 py-2.5"><StatusDot status={result.record?.mailFromStatus} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {results
        .filter((result) => result.record && !result.record.hostedZoneId && result.dnsRecords?.length)
        .map((result) => (
          <ManualDnsInstructions domain={result.domain} key={result.domain} records={result.dnsRecords ?? []} />
        ))}

      {results.some((result) => result.record?.hostedZoneId) ? (
        <div className="rounded-2xl border border-border/70 bg-surface-secondary/60 p-3">
          <p className="text-[12px] font-semibold text-foreground">DNS records were written directly into Route53</p>
          <p className="mt-1 text-[11px] leading-4 text-muted">
            No manual DNS setup needed — DKIM CNAMEs, SPF, MAIL FROM MX/SPF, and DMARC TXT records were created automatically. Verification (green) can take a few minutes up to a few hours to propagate; use "Recheck verification" to poll.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ManualDnsInstructions({ domain, records }: { domain: string; records: DnsRecordInstruction[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(value: string) {
    navigator.clipboard?.writeText(value).catch(() => undefined);
    setCopied(value);
    window.setTimeout(() => setCopied((current) => (current === value ? null : current)), 1500);
  }

  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
      <p className="text-[13px] font-semibold text-foreground">Add these DNS records for {domain} at your DNS provider</p>
      <p className="mt-1 text-[11px] leading-4 text-muted">
        This domain isn't in Route53, so nothing was written automatically. Add each record below, then use "Recheck verification" once they've propagated (can take a few minutes up to 48 hours).
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[560px] text-left text-[11px]">
          <thead className="border-b border-border/70 uppercase tracking-wide text-muted">
            <tr>
              {["Purpose", "Type", "Host", "Value", ""].map((header) => (
                <th className="px-3 py-2 font-medium" key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr className="border-b border-border/60 last:border-0" key={`${record.host}-${record.type}`}>
                <td className="px-3 py-2 font-medium text-foreground">{record.purpose}</td>
                <td className="px-3 py-2 text-muted">{record.type}</td>
                <td className="max-w-[160px] truncate px-3 py-2 text-muted" title={record.host}>{record.host}</td>
                <td className="max-w-[220px] truncate px-3 py-2 text-muted" title={record.value}>{record.value}</td>
                <td className="px-3 py-2">
                  <button
                    aria-label={`Copy value for ${record.purpose}`}
                    className="grid size-6 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-foreground"
                    onClick={() => copy(record.value)}
                    type="button"
                  >
                    <Copy className="size-3.5" />
                  </button>
                  {copied === record.value ? <span className="ml-1 text-[10px] text-success">Copied</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status?: string }) {
  if (!status) return <Copy className="size-3.5 text-muted" />;
  const color = status === "Success" ? "success" : status === "Failed" ? "danger" : "warning";
  return <Chip color={color} size="sm" variant="soft">{status}</Chip>;
}
