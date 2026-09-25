import { useState } from "react";
import { Button, Chip, Drawer, Spinner, Tooltip } from "@heroui/react";
import { Copy, Globe, RefreshCw, X } from "lucide-react";
import type { Domain, DnsCheckStatus, SesAccountStatus } from "../../types";

export function DomainAnalyticsDrawer({
  domain,
  accountStatus,
  onClose,
  onRefresh,
  isRefreshing,
}: {
  domain: Domain | null;
  accountStatus: SesAccountStatus | null;
  onClose: () => void;
  onRefresh: (domain: string) => void;
  isRefreshing: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(value: string) {
    navigator.clipboard?.writeText(value).catch(() => undefined);
    setCopied(value);
    window.setTimeout(() => setCopied((current) => (current === value ? null : current)), 1500);
  }

  return (
    <Drawer.Root isOpen={Boolean(domain)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="flex h-full max-w-[92vw] flex-col" style={{ width: "60vw", minWidth: "520px" }}>
            {domain ? (
              <>
                <Drawer.Header className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-default-100 text-foreground">
                      <Globe className="size-3.5" />
                    </span>
                    <Drawer.Heading className="text-[14px] font-semibold text-foreground">{domain.domain}</Drawer.Heading>
                    <StatusChip status={domain.status} />
                  </div>
                  <Drawer.CloseTrigger className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground">
                    <X className="size-4" />
                  </Drawer.CloseTrigger>
                </Drawer.Header>

                <Drawer.Body className="flex-1 overflow-y-auto p-0">
                  <div className="space-y-5 p-5">
                    <div className="rounded-2xl border border-border/70 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-foreground">Reputation & deliverability (last 14 days)</p>
                        <ReputationBadge reputation={domain.reputation} />
                      </div>

                      {(domain.emailsSent14d ?? 0) > 0 ? (
                        <>
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <ReputationStat label="Sent" value={String(domain.emailsSent14d ?? 0)} />
                            <ReputationStat label="Delivered" value={String(domain.emailsDelivered14d ?? 0)} />
                            <ReputationStat label="Bounced" value={String(domain.emailsBounced14d ?? 0)} />
                            <ReputationStat label="Complained" value={String(domain.emailsComplained14d ?? 0)} />
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-3">
                            <RateStat label="Bounce rate" tone="danger" value={domain.bounceRate} />
                            <RateStat label="Complaint rate" tone="danger" value={domain.complaintRate} />
                            <RateStat label="Delivery rate" tone="success" value={domain.deliveryRate} />
                          </div>
                        </>
                      ) : (
                        <p className="text-[12px] text-muted">
                          No emails sent from this domain in the last 14 days. Reputation tracking is live (configuration set{" "}
                          <span className="font-mono text-foreground">{domain.configurationSetName}</span> is wired to CloudWatch) — real bounce, complaint, and delivery metrics will appear here as soon as this domain sends.
                        </p>
                      )}

                      <p className="mt-3 text-[11px] text-muted">
                        {domain.reputationCheckedAt
                          ? `Metrics last pulled ${new Date(domain.reputationCheckedAt).toLocaleString()}`
                          : "Not checked yet — click Recheck status to pull metrics from CloudWatch."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-foreground">Domain authentication</p>
                      <Button isDisabled={isRefreshing} onPress={() => onRefresh(domain.domain)} size="sm" variant="secondary">
                        {isRefreshing ? <Spinner color="current" size="sm" /> : <RefreshCw className="size-4" />}
                        Recheck status
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      <DnsStat label="SPF" status={domain.spfStatus} />
                      <DnsStat label="DKIM" status={domain.dkimStatus} />
                      <DnsStat label="DMARC" status={domain.dmarcStatus} />
                      <DnsStat label="Custom MAIL FROM" status={domain.mailFromStatus} />
                      <DnsStat label="MX (bounce routing)" status={domain.mxStatus} />
                      <DnsStat label="Reputation" status={domain.status === "Failed" ? "Failed" : "Success"} value={domain.reputation} />
                    </div>

                    <p className="text-[11px] text-muted">
                      {domain.lastCheckedAt
                        ? `Last checked ${new Date(domain.lastCheckedAt).toLocaleString()}`
                        : "Not checked yet since onboarding — DNS/DKIM verification can take a few minutes to a few hours to propagate."}
                    </p>
                    {domain.lastError ? (
                      <div className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[12px] text-danger">{domain.lastError}</div>
                    ) : null}

                    <div className="rounded-2xl border border-border/70 p-4">
                      <p className="mb-3 text-[13px] font-semibold text-foreground">DKIM CNAME records (Easy DKIM, managed by SES)</p>
                      <div className="space-y-2">
                        {domain.dkimTokens.map((token) => {
                          const host = `${token}._domainkey.${domain.domain}`;
                          const value = `${token}.dkim.amazonses.com`;
                          return (
                            <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-secondary/60 px-3 py-2" key={token}>
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-medium text-foreground" title={host}>{host}</p>
                                <p className="truncate text-[11px] text-muted" title={value}>{value}</p>
                              </div>
                              <Tooltip delay={200}>
                                <Tooltip.Trigger>
                                  <button
                                    aria-label="Copy CNAME value"
                                    className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-foreground"
                                    onClick={() => copy(value)}
                                    type="button"
                                  >
                                    <Copy className="size-3.5" />
                                  </button>
                                </Tooltip.Trigger>
                                <Tooltip.Content>{copied === value ? "Copied" : "Copy value"}</Tooltip.Content>
                              </Tooltip>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <InfoRow label="Provider" value={domain.provider} />
                      <InfoRow label="AWS region" value={domain.awsRegion} />
                      <InfoRow label="Hosted zone" value={domain.hostedZoneId ?? "—"} />
                      <InfoRow label="Registrar / DNS" value={`${domain.registrar} / ${domain.dnsProvider}`} />
                      <InfoRow label="Onboarded" value={new Date(domain.createdAt).toLocaleDateString()} />
                    </div>

                    <div className="rounded-2xl border border-border/70 p-4">
                      <p className="mb-2 text-[13px] font-semibold text-foreground">AWS SES account sending status</p>
                      {accountStatus ? (
                        <div className="space-y-1.5 text-[12px] text-muted">
                          <p>
                            Mode:{" "}
                            <span className={`font-medium ${accountStatus.productionAccessEnabled ? "text-success" : "text-warning"}`}>
                              {accountStatus.productionAccessEnabled ? "Production" : "Sandbox"}
                            </span>
                          </p>
                          <p>Max 24h send: <span className="font-medium text-foreground">{accountStatus.max24HourSend ?? "—"}</span> · Max rate: <span className="font-medium text-foreground">{accountStatus.maxSendRate ?? "—"}/sec</span></p>
                          {!accountStatus.productionAccessEnabled ? (
                            <p className="text-warning">
                              Sandbox mode can only send to verified recipients. {accountStatus.latestRequest ? `Production access requested ${new Date(accountStatus.latestRequest.requestedAt).toLocaleDateString()}.` : "No production access request submitted yet."}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-[12px] text-muted">Unable to load AWS account status.</p>
                      )}
                    </div>
                  </div>
                </Drawer.Body>
              </>
            ) : null}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}

function StatusChip({ status }: { status: Domain["status"] }) {
  const color = status === "Verified" ? "success" : status === "Failed" ? "danger" : "warning";
  return <Chip color={color} size="sm" variant="soft">{status}</Chip>;
}

function DnsStat({ label, status, value }: { label: string; status: DnsCheckStatus; value?: string }) {
  const color = status === "Success" ? "success" : status === "Failed" ? "danger" : status === "Pending" ? "warning" : "default";
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-secondary/60 p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <div className="mt-1.5">
        <Chip color={color} size="sm" variant="soft">{value ?? status}</Chip>
      </div>
    </div>
  );
}

function ReputationBadge({ reputation }: { reputation: string }) {
  const color = reputation === "Healthy" ? "success" : reputation === "Watch" ? "warning" : reputation === "At Risk" ? "danger" : "default";
  return <Chip color={color} size="sm" variant="soft">{reputation}</Chip>;
}

function ReputationStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-secondary/60 p-3">
      <p className="text-[20px] font-semibold leading-none text-foreground">{value}</p>
      <p className="mt-1.5 text-[11px] text-muted">{label}</p>
    </div>
  );
}

function RateStat({ label, value, tone }: { label: string; value: number | null; tone: "success" | "danger" }) {
  const pct = value === null ? "—" : `${(value * 100).toFixed(value < 0.01 ? 2 : 1)}%`;
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-secondary/60 p-3 text-center">
      <p className={`text-[18px] font-semibold leading-none ${tone === "success" ? "text-success" : "text-danger"}`}>{pct}</p>
      <p className="mt-1.5 text-[11px] text-muted">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-secondary/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="truncate text-[12px] font-medium text-foreground" title={value}>{value}</p>
    </div>
  );
}
