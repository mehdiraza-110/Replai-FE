import { useEffect, useState } from "react";
import { Button, Chip, Drawer, Spinner, Switch, Tooltip } from "@heroui/react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  CornerUpLeft,
  Info,
  Mail,
  RefreshCw,
  Smile,
  Users,
  X,
} from "lucide-react";
import type { Mailbox } from "../../types";

const BUSINESS_TYPES = [
  "Generic Business Type",
  "Staffing & Recruiting",
  "SaaS / Technology",
  "Marketing Agency",
  "Financial Services",
  "Real Estate",
  "Healthcare",
];

function randomToken() {
  const words = ["sugar", "wrapper", "signal", "meadow", "orbit", "cobalt", "lantern", "harbor"];
  return words[Math.floor(Math.random() * words.length)];
}

export function MailboxAnalyticsDrawer({
  mailbox,
  onClose,
  onNavigate,
  onRefresh,
  isRefreshing,
  initialTab = "analytics",
}: {
  mailbox: Mailbox | null;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  onRefresh: (id: number) => void;
  isRefreshing: boolean;
  initialTab?: "analytics" | "settings";
}) {
  const [activeTab, setActiveTab] = useState<"analytics" | "settings">(initialTab);

  useEffect(() => {
    if (mailbox) setActiveTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailbox?.id, initialTab]);

  return (
    <Drawer.Root isOpen={Boolean(mailbox)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="flex h-full max-w-[92vw] flex-col" style={{ width: "56vw", minWidth: "480px" }}>
            {mailbox ? (
              <>
                <Drawer.Header className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Button aria-label="Previous mailbox" className="size-8 min-w-8 rounded-full p-0" onPress={() => onNavigate("prev")} size="sm" variant="secondary">
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button aria-label="Next mailbox" className="size-8 min-w-8 rounded-full p-0" onPress={() => onNavigate("next")} size="sm" variant="secondary">
                      <ChevronRight className="size-4" />
                    </Button>
                    <span className="ml-1 grid size-7 place-items-center rounded-full bg-default-100 text-foreground">
                      <Mail className="size-3.5" />
                    </span>
                    <Drawer.Heading className="text-[14px] font-semibold text-foreground">{mailbox.email}</Drawer.Heading>
                    <StatusChip status={mailbox.status} />
                  </div>
                  <Drawer.CloseTrigger className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground">
                    <X className="size-4" />
                  </Drawer.CloseTrigger>
                </Drawer.Header>

                <div className="flex items-center gap-1 border-b border-border/70 px-5">
                  <TabButton isActive={activeTab === "analytics"} label="Analytics" onClick={() => setActiveTab("analytics")} />
                  <TabButton isActive={activeTab === "settings"} label="Settings" onClick={() => setActiveTab("settings")} />
                </div>

                <Drawer.Body className="flex-1 overflow-y-auto p-0">
                  {activeTab === "analytics" ? (
                    <div className="space-y-5 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <select className="agent-field h-9 px-3 text-[12.5px] text-foreground outline-none" defaultValue="all" disabled>
                            <option value="all">All Recipient Providers</option>
                          </select>
                          <select className="agent-field h-9 px-3 text-[12.5px] text-foreground outline-none" defaultValue="2w" disabled>
                            <option value="2w">Last 2 Weeks</option>
                          </select>
                        </div>
                        <Button isDisabled={isRefreshing} onPress={() => onRefresh(mailbox.id)} size="sm" variant="secondary">
                          {isRefreshing ? <Spinner color="current" size="sm" /> : <RefreshCw className="size-4" />}
                          Recheck status
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <MetricStat
                          icon={Mail}
                          label="Total Email Sent"
                          tooltip="Total emails sent by this mailbox in the selected range — always 0 until a campaign or warmup-sending engine actually sends mail."
                          value={mailbox.totalEmailSent}
                        />
                        <MetricStat
                          icon={Users}
                          label="Total Contacted Leads"
                          tooltip="Leads this mailbox has sent to — needs a sending engine to populate."
                          value={mailbox.totalContactedLeads}
                        />
                        <MetricStat
                          icon={Users}
                          label="New Leads Contacted"
                          tooltip="First-time sends from this mailbox in the selected range — needs a sending engine to populate."
                          value={mailbox.newLeadsContacted}
                        />
                        <MetricStat
                          icon={CheckCircle2}
                          label="Total Completed Leads"
                          tooltip="Leads that finished this mailbox's full sequence — needs a sending engine to populate."
                          value={mailbox.totalCompletedLeads}
                        />
                        <MetricStat
                          icon={CornerUpLeft}
                          label="Reply Rate (with OOO)"
                          isPercent
                          tooltip="Reply rate including out-of-office and automatic replies, past 7 days — N/A until this mailbox has sent 10+ emails."
                          value={mailbox.replyRate7d}
                        />
                        <MetricStat
                          icon={CornerUpLeft}
                          label="Reply Rate"
                          isPercent
                          tooltip="Reply rate excluding out-of-office and automatic replies, past 7 days — N/A until this mailbox has sent 10+ emails."
                          value={mailbox.replyRateExclOoo7d}
                        />
                        <MetricStat
                          icon={Smile}
                          label="Positive Reply"
                          isPercent
                          tooltip="Share of replies classified as positive, past 7 days — needs reply classification, not built yet."
                          value={mailbox.positiveReplyRate7d}
                        />
                        <MetricStat
                          icon={AlertTriangle}
                          label="Recipient Bounce Rate"
                          isPercent
                          tooltip="Recipient bounce rate, past 3 days — N/A, needs 10+ emails sent."
                          value={mailbox.bounceRate3d}
                        />
                      </div>

                      <div className="rounded-2xl border border-border/70 p-4">
                        <p className="text-[13px] font-semibold text-foreground">Daily Email Sent</p>
                        <div className="mt-3 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/70 py-10 text-center">
                          <p className="text-[12.5px] font-medium text-foreground">No email activity yet for this mailbox</p>
                          <p className="mx-auto max-w-sm text-[11.5px] text-muted">
                            This mailbox can send via SES today, but campaign sending, reply tracking, and a real inbox (IMAP/receiving) aren't wired up yet. Once campaigns run, a daily new-lead vs. follow-up chart will show up here.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-foreground">Mailbox health</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        <Stat label="Sent today" value={`${mailbox.sentToday}/${mailbox.dailyLimit}`} />
                        <Stat label="Warmup stage" value={mailbox.warmupStage} />
                        <Stat label="Reputation" value={mailbox.reputationStatus} tone={mailbox.reputationStatus === "Healthy" ? "success" : mailbox.reputationStatus === "Watch" ? "warning" : "danger"} />
                      </div>

                      <p className="text-[11px] text-muted">
                        {mailbox.lastCheckedAt
                          ? `Last checked ${new Date(mailbox.lastCheckedAt).toLocaleString()}`
                          : "Not checked yet since creation."}
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <InfoRow label="Sending domain" value={mailbox.domain} />
                        <InfoRow label="Domain status" value={mailbox.domainStatus} />
                        <InfoRow label="Display name" value={mailbox.displayName ?? "—"} />
                        <InfoRow label="Daily limit" value={String(mailbox.dailyLimit)} />
                        <InfoRow label="Last sent" value={mailbox.lastSentAt ? new Date(mailbox.lastSentAt).toLocaleString() : "Never"} />
                        <InfoRow label="Created" value={new Date(mailbox.createdAt).toLocaleDateString()} />
                      </div>

                      {mailbox.domainStatus !== "Verified" ? (
                        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-[12px] text-warning">
                          This mailbox is paused because its parent domain ({mailbox.domain}) isn't fully verified in SES yet. It will automatically become sendable once the domain finishes DNS/DKIM verification.
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <WarmupSettingsTab mailbox={mailbox} />
                  )}
                </Drawer.Body>
              </>
            ) : null}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}

function TabButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      className={[
        "border-b-2 px-1 py-2.5 text-[13px] font-semibold transition",
        isActive ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function WarmupSettingsTab({ mailbox }: { mailbox: Mailbox }) {
  const [filterTagPrefix, setFilterTagPrefix] = useState(randomToken());
  const [filterTagSuffix, setFilterTagSuffix] = useState(randomToken());
  const [includeFilterTagOutgoing, setIncludeFilterTagOutgoing] = useState(false);
  const [dailyWarmupLimit, setDailyWarmupLimit] = useState(String(mailbox.dailyLimit));
  const [warmupRampUp, setWarmupRampUp] = useState(false);
  const [randomizedLimit, setRandomizedLimit] = useState(false);
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [warmupSchedule, setWarmupSchedule] = useState(false);
  const [warmupSignature, setWarmupSignature] = useState(false);
  const [warmupReplyRate, setWarmupReplyRate] = useState(35);

  function regenerateFilterTag() {
    setFilterTagPrefix(randomToken());
    setFilterTagSuffix(randomToken());
  }

  function copyFilterTag() {
    navigator.clipboard?.writeText(`${filterTagPrefix}-${filterTagSuffix}`).catch(() => {});
  }

  return (
    <div className="space-y-4 p-5">
      <div className="rounded-2xl border border-border/70 p-4">
        <p className="text-[13px] font-semibold text-foreground">Basic Warmup Settings</p>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-[12.5px] font-medium text-foreground">Warmup Filter Tag</p>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent"
                onChange={(event) => setFilterTagPrefix(event.target.value)}
                value={filterTagPrefix}
              />
              <span className="text-muted">-</span>
              <input
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent"
                onChange={(event) => setFilterTagSuffix(event.target.value)}
                value={filterTagSuffix}
              />
              <button aria-label="Regenerate filter tag" className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground" onClick={regenerateFilterTag} type="button">
                <RefreshCw className="size-4" />
              </button>
              <button aria-label="Copy filter tag" className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground" onClick={copyFilterTag} type="button">
                <Copy className="size-4" />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted">This unique string will be included in all your warmup emails, enabling you to filter them from your inbox. You have the flexibility to change this string as needed.</p>
          </div>

          <ToggleRow
            description="Do not enable this unless you need to filter outgoing warmup emails. It creates a consistent pattern across all outgoing warmups, which can reduce warmup effectiveness."
            isSelected={includeFilterTagOutgoing}
            label="Include Filter Tag in Outgoing Warmup"
            onChange={setIncludeFilterTagOutgoing}
          />

          <div>
            <p className="text-[12.5px] font-medium text-foreground">Daily Warmup Limit</p>
            <input
              className="mt-1.5 h-10 w-full max-w-[160px] rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent"
              onChange={(event) => setDailyWarmupLimit(event.target.value)}
              type="number"
              value={dailyWarmupLimit}
            />
            <p className="mt-1.5 text-[11px] text-muted">Max limit: 50 Emails</p>
          </div>

          <ToggleRow
            description="Gradually increase daily warmup email sends until the maximum limit is reached."
            isSelected={warmupRampUp}
            label="Warmup Email Ramp-Up"
            onChange={setWarmupRampUp}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
        <p className="text-[13px] font-semibold text-foreground">Advanced Warmup Settings</p>
        <p className="mt-1 text-[11.5px] leading-4 text-muted">
          Sending warmup emails during weekday office hours in the lead's timezone, with content including keywords relevant to your business industry are crucial steps to ensure optimal email deliverability.
        </p>

        <div className="mt-4 space-y-4">
          <ToggleRow
            description="Randomizes the daily limit to make sending patterns appear more natural. Enter a percentage to set how much it can vary (e.g. 20% means it will randomly range between 80-100% of your maximum limit)."
            isSelected={randomizedLimit}
            label="Randomized Warm-Up Limit"
            onChange={setRandomizedLimit}
          />

          <div>
            <p className="text-[12.5px] font-medium text-foreground">Business Type</p>
            <select
              className="agent-field mt-1.5 h-10 w-full px-3 text-sm text-foreground outline-none"
              onChange={(event) => setBusinessType(event.target.value)}
              value={businessType}
            >
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-muted">Choose the business type that closely matches the emails you'll send to leads. You can leave it empty for generic business-type emails.</p>
          </div>

          <ToggleRow
            description="Select the warmup schedule that best matches when you plan to email your leads. Outgoing warmup replies may be sent outside of this schedule, since real human replies can happen at any time."
            isSelected={warmupSchedule}
            label="Warmup Schedule"
            onChange={setWarmupSchedule}
          />

          <ToggleRow
            description="Include your signature in warm-up emails."
            isSelected={warmupSignature}
            label="Warmup Signature"
            onChange={setWarmupSignature}
          />

          <div>
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-medium text-foreground">Warmup Reply Rate</p>
              <span className="text-[12.5px] font-semibold text-foreground">{warmupReplyRate}%</span>
            </div>
            <input
              className="mt-2 w-full accent-accent"
              max={100}
              min={0}
              onChange={(event) => setWarmupReplyRate(Number(event.target.value))}
              type="range"
              value={warmupReplyRate}
            />
            <p className="mt-1.5 text-[11px] text-muted">Increase your warm-up reply rate when email deliverability decreases. Recommended value: 35%</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted">These settings aren't wired up to the warmup engine yet — this is the UI ready for that to plug into.</p>
        <Button size="sm">Save Warmup Settings</Button>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, isSelected, onChange }: { label: string; description: string; isSelected: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-muted">{description}</p>
      </div>
      <Switch className="mt-0.5 shrink-0" isSelected={isSelected} onChange={onChange}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </div>
  );
}

function StatusChip({ status }: { status: Mailbox["status"] }) {
  const color = status === "Active" ? "success" : status === "Error" ? "danger" : "warning";
  return <Chip color={color} size="sm" variant="soft">{status}</Chip>;
}

function MetricStat({
  icon: Icon,
  label,
  value,
  tooltip,
  isPercent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
  tooltip: string;
  isPercent?: boolean;
}) {
  const displayValue = value == null ? "N/A" : isPercent ? `${value}%` : String(value);
  return (
    <div className="rounded-2xl border border-border/70 p-3">
      <div className="flex items-center gap-1.5 text-muted">
        <span className="grid size-6 place-items-center rounded-full bg-accent/10 text-accent">
          <Icon className="size-3.5" />
        </span>
        <p className="truncate text-[11px] font-medium">{label}</p>
        <Tooltip delay={200}>
          <Tooltip.Trigger>
            <Info className="size-3 shrink-0 text-muted" />
          </Tooltip.Trigger>
          <Tooltip.Content className="max-w-[220px] text-[11px] leading-4">{tooltip}</Tooltip.Content>
        </Tooltip>
      </div>
      <p className="mt-2 text-[20px] font-semibold leading-none text-foreground">{displayValue}</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "danger" }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-secondary/60 p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <div className="mt-1.5">
        {tone ? (
          <Chip color={tone} size="sm" variant="soft">{value}</Chip>
        ) : (
          <p className="text-[15px] font-semibold text-foreground">{value}</p>
        )}
      </div>
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
