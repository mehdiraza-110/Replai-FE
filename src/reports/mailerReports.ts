import { Globe, Inbox, Send, TrendingUp } from "lucide-react";
import { campaignService, domainService, mailboxService } from "../services/api";
import type { Domain, Mailbox, MailerCampaign, ReputationTrendPoint } from "../types";
import { daysBetween, isInRange, toISODate } from "../utils/dateRange";
import { average, distinctOptions, fetchAllPages, formatDateTime, formatDay, kpi, round, sum, timeValue } from "./helpers";
import type { AnyReport, ReportDef } from "./types";

const PAGE = 100;

const percent = (value: number | null | undefined) => (value == null ? null : round(value, 1));
/** Domain rates arrive as fractions (0.012), everything else as percentages. */
const fractionToPercent = (value: number | null | undefined) => (value == null ? null : round(value * 100, 2));

const campaignReport: ReportDef<MailerCampaign> = {
  id: "campaigns",
  label: "Campaign performance",
  description: "Sending, reply and bounce results for every campaign.",
  icon: Send,
  load: () => fetchAllPages((page) => campaignService.list({ page, limit: PAGE })),
  dateFields: [{ key: "started", label: "Start date", get: (row) => row.startedAt }],
  search: (row) => row.name,
  searchPlaceholder: "Search campaigns",
  defaultSort: { key: "sent", dir: "desc" },
  filters: [
    {
      key: "campaign",
      label: "Campaign",
      allLabel: "All campaigns",
      options: (rows) => distinctOptions(rows, (row) => row.name),
      test: (row, value) => row.name === value,
    },
    {
      key: "status",
      label: "Status",
      allLabel: "All statuses",
      options: ["Active", "Paused", "Draft", "Completed"].map((value) => ({ value, label: value })),
      test: (row, value) => row.status === value,
    },
    {
      key: "bounce",
      label: "Bounce rate",
      allLabel: "Any bounce rate",
      options: [
        { value: "low", label: "Under 2%" },
        { value: "mid", label: "2% – 5%" },
        { value: "high", label: "Over 5%" },
      ],
      test: (row, value) => (value === "low" ? row.bounceRate < 2 : value === "mid" ? row.bounceRate >= 2 && row.bounceRate <= 5 : row.bounceRate > 5),
    },
    {
      key: "replies",
      label: "Replies",
      allLabel: "Any reply count",
      options: [
        { value: "with", label: "Has replies" },
        { value: "none", label: "No replies yet" },
      ],
      test: (row, value) => (value === "with" ? row.replyCount > 0 : row.replyCount === 0),
    },
    {
      key: "sending",
      label: "Sending",
      allLabel: "Any activity",
      options: [
        { value: "today", label: "Sent today" },
        { value: "idle", label: "Nothing sent today" },
      ],
      test: (row, value) => (value === "today" ? row.sentToday > 0 : row.sentToday === 0),
    },
  ],
  columns: [
    { key: "name", label: "Campaign", value: (row) => row.name },
    { key: "status", label: "Status", value: (row) => row.status, tone: (row) => (row.status === "Active" ? "success" : row.status === "Paused" ? "warning" : undefined) },
    { key: "mailboxes", label: "Mailboxes", align: "right", value: (row) => row.mailboxCount },
    { key: "leads", label: "Leads", align: "right", value: (row) => row.leadsCount },
    { key: "contacted", label: "Contacted", align: "right", value: (row) => row.contactedCount },
    { key: "contactedPct", label: "Contacted (%)", align: "right", value: (row) => percent(row.contactedPercent) },
    { key: "sent", label: "Sent total", align: "right", value: (row) => row.sentTotal },
    { key: "sentToday", label: "Sent today", align: "right", value: (row) => row.sentToday },
    { key: "replies", label: "Replies", align: "right", value: (row) => row.replyCount },
    { key: "replyRate", label: "Reply rate (%)", align: "right", value: (row) => percent(row.replyRate) },
    { key: "positive", label: "Positive replies (%)", align: "right", value: (row) => percent(row.positiveReplyRate) },
    { key: "bounce", label: "Bounce rate (%)", align: "right", value: (row) => percent(row.bounceRate), tone: (row) => (row.bounceRate > 5 ? "danger" : row.bounceRate > 2 ? "warning" : undefined) },
    { key: "started", label: "Started", sortValue: (row) => timeValue(row.startedAt), value: (row) => formatDay(row.startedAt) },
  ],
  breakdown: { label: "Campaigns by status", get: (row) => row.status },
  kpis: (rows) => [
    kpi("Campaigns", rows.length),
    kpi("Emails sent", sum(rows.map((row) => row.sentTotal))),
    kpi("Avg reply rate", `${average(rows.map((row) => row.replyRate))}%`),
    kpi("Avg bounce rate", `${average(rows.map((row) => row.bounceRate))}%`, { tone: average(rows.map((row) => row.bounceRate)) > 5 ? "danger" : undefined }),
  ],
};

const mailboxReport: ReportDef<Mailbox> = {
  id: "mailboxes",
  label: "Mailbox performance",
  description: "Warmup stage, deliverability and sending activity per mailbox.",
  icon: Inbox,
  load: () => fetchAllPages((page) => mailboxService.list({ page, limit: PAGE })),
  dateFields: [
    { key: "lastSent", label: "Last sent", get: (row) => row.lastSentAt },
    { key: "created", label: "Created", get: (row) => row.createdAt },
  ],
  search: (row) => `${row.email} ${row.displayName ?? ""} ${row.domain}`,
  searchPlaceholder: "Search mailboxes or domains",
  defaultSort: { key: "sentToday", dir: "desc" },
  filters: [
    {
      key: "domain",
      label: "Domain",
      allLabel: "All domains",
      options: (rows) => distinctOptions(rows, (row) => row.domain),
      test: (row, value) => row.domain === value,
    },
    {
      key: "campaign",
      label: "Campaign",
      allLabel: "All campaigns",
      options: (rows) => [
        { value: "__none", label: "Not in a campaign" },
        ...distinctOptions(rows.flatMap((row) => row.activeCampaigns), (name) => name),
      ],
      test: (row, value) => (value === "__none" ? row.activeCampaigns.length === 0 : row.activeCampaigns.includes(value)),
    },
    {
      key: "status",
      label: "Status",
      allLabel: "All statuses",
      options: ["Active", "Paused", "Error"].map((value) => ({ value, label: value })),
      test: (row, value) => row.status === value,
    },
    {
      key: "warmup",
      label: "Warmup",
      allLabel: "All stages",
      options: ["New", "Ramping", "Steady State", "Paused"].map((value) => ({ value, label: value })),
      test: (row, value) => row.warmupStage === value,
    },
    {
      key: "reputation",
      label: "Reputation",
      allLabel: "All reputations",
      options: ["Healthy", "Watch", "At Risk"].map((value) => ({ value, label: value })),
      test: (row, value) => row.reputationStatus === value,
    },
    {
      key: "bounce",
      label: "Bounce (3d)",
      allLabel: "Any bounce rate",
      options: [
        { value: "ok", label: "Under 2%" },
        { value: "warn", label: "2% and above" },
        { value: "none", label: "No data yet" },
      ],
      test: (row, value) => (value === "none" ? row.bounceRate3d == null : value === "ok" ? row.bounceRate3d != null && row.bounceRate3d < 2 : row.bounceRate3d != null && row.bounceRate3d >= 2),
    },
  ],
  columns: [
    { key: "email", label: "Mailbox", value: (row) => row.email },
    { key: "domain", label: "Domain", value: (row) => row.domain },
    { key: "status", label: "Status", value: (row) => row.status, tone: (row) => (row.status === "Active" ? "success" : row.status === "Error" ? "danger" : "warning") },
    { key: "warmup", label: "Warmup stage", value: (row) => row.warmupStage },
    { key: "reputation", label: "Reputation", value: (row) => row.reputationStatus, tone: (row) => (row.reputationStatus === "Healthy" ? "success" : row.reputationStatus === "Watch" ? "warning" : "danger") },
    { key: "sentToday", label: "Warmup sent today", align: "right", value: (row) => row.sentToday },
    { key: "limit", label: "Daily limit", align: "right", value: (row) => row.dailyLimit },
    { key: "campaignToday", label: "Campaign sent today", align: "right", value: (row) => row.campaignSentToday },
    { key: "totalSent", label: "Total sent", align: "right", value: (row) => row.totalEmailSent },
    { key: "deliverability", label: "Deliverability 7d (%)", align: "right", value: (row) => percent(row.warmupDeliverability7d) },
    { key: "reply", label: "Reply rate 7d (%)", align: "right", value: (row) => percent(row.replyRate7d) },
    { key: "bounce", label: "Bounce rate 3d (%)", align: "right", value: (row) => percent(row.bounceRate3d), tone: (row) => (row.bounceRate3d != null && row.bounceRate3d >= 2 ? "danger" : undefined) },
    { key: "campaigns", label: "Active campaigns", align: "right", value: (row) => row.activeCampaigns.length },
    { key: "lastSent", label: "Last sent", sortValue: (row) => timeValue(row.lastSentAt), value: (row) => formatDateTime(row.lastSentAt) || "Never" },
  ],
  breakdown: { label: "Mailboxes by warmup stage", get: (row) => row.warmupStage },
  kpis: (rows) => {
    const withDeliverability = rows.filter((row) => row.warmupDeliverability7d != null).map((row) => row.warmupDeliverability7d as number);
    return [
      kpi("Mailboxes", rows.length),
      kpi("Active", rows.filter((row) => row.status === "Active").length),
      kpi("Avg deliverability", withDeliverability.length ? `${average(withDeliverability)}%` : "N/A"),
      kpi("At risk", rows.filter((row) => row.reputationStatus === "At Risk").length, { tone: rows.some((row) => row.reputationStatus === "At Risk") ? "danger" : undefined }),
    ];
  },
};

const domainReport: ReportDef<Domain> = {
  id: "domains",
  label: "Domain reputation",
  description: "Verification, DNS records and 14-day reputation for each domain.",
  icon: Globe,
  load: () => fetchAllPages((page) => domainService.list({ page, limit: PAGE })),
  dateFields: [
    { key: "created", label: "Added", get: (row) => row.createdAt },
    { key: "checked", label: "Last checked", get: (row) => row.lastCheckedAt },
  ],
  search: (row) => row.domain,
  searchPlaceholder: "Search domains",
  defaultSort: { key: "sent", dir: "desc" },
  filters: [
    {
      key: "domain",
      label: "Domain",
      allLabel: "All domains",
      options: (rows) => distinctOptions(rows, (row) => row.domain),
      test: (row, value) => row.domain === value,
    },
    {
      key: "status",
      label: "Status",
      allLabel: "All statuses",
      options: ["Verified", "Pending Verification", "Provisioning", "Failed"].map((value) => ({ value, label: value })),
      test: (row, value) => row.status === value,
    },
    {
      key: "reputation",
      label: "Reputation",
      allLabel: "All reputations",
      options: ["Healthy", "Watch", "At Risk"].map((value) => ({ value, label: value })),
      test: (row, value) => row.reputation === value,
    },
    {
      key: "provider",
      label: "Provider",
      allLabel: "All providers",
      options: (rows) => distinctOptions(rows, (row) => row.provider),
      test: (row, value) => row.provider === value,
    },
    {
      key: "dns",
      label: "DNS records",
      allLabel: "All DNS states",
      options: [
        { value: "ok", label: "All records verified" },
        { value: "issues", label: "Failed or pending records" },
      ],
      test: (row, value) => {
        const states = [row.spfStatus, row.dkimStatus, row.dmarcStatus, row.mxStatus];
        return value === "ok" ? states.every((state) => state === "Success") : states.some((state) => state === "Failed" || state === "Pending");
      },
    },
    {
      key: "mailboxes",
      label: "Mailboxes",
      allLabel: "Any mailbox count",
      options: [
        { value: "with", label: "Has mailboxes" },
        { value: "none", label: "No mailboxes" },
      ],
      test: (row, value) => (value === "with" ? (row.mailboxCount ?? 0) > 0 : (row.mailboxCount ?? 0) === 0),
    },
  ],
  columns: [
    { key: "domain", label: "Domain", value: (row) => row.domain },
    { key: "provider", label: "Provider", value: (row) => row.provider },
    { key: "status", label: "Status", value: (row) => row.status, tone: (row) => (row.status === "Verified" ? "success" : row.status === "Failed" ? "danger" : "warning") },
    { key: "spf", label: "SPF", value: (row) => row.spfStatus },
    { key: "dkim", label: "DKIM", value: (row) => row.dkimStatus },
    { key: "dmarc", label: "DMARC", value: (row) => row.dmarcStatus },
    { key: "mx", label: "MX", value: (row) => row.mxStatus },
    { key: "mailboxes", label: "Mailboxes", align: "right", value: (row) => row.mailboxCount ?? 0 },
    { key: "reputation", label: "Reputation", value: (row) => row.reputation, tone: (row) => (row.reputation === "Healthy" ? "success" : row.reputation === "Watch" ? "warning" : row.reputation === "At Risk" ? "danger" : undefined) },
    { key: "sent", label: "Sent (14d)", align: "right", value: (row) => row.emailsSent14d ?? 0 },
    { key: "delivered", label: "Delivered (14d)", align: "right", value: (row) => row.emailsDelivered14d ?? 0 },
    { key: "bounced", label: "Bounced (14d)", align: "right", value: (row) => row.emailsBounced14d ?? 0 },
    { key: "bounceRate", label: "Bounce rate (%)", align: "right", value: (row) => fractionToPercent(row.bounceRate) },
    { key: "complaintRate", label: "Complaint rate (%)", align: "right", value: (row) => fractionToPercent(row.complaintRate) },
    { key: "deliveryRate", label: "Delivery rate (%)", align: "right", value: (row) => fractionToPercent(row.deliveryRate) },
    { key: "added", label: "Added", sortValue: (row) => timeValue(row.createdAt), value: (row) => formatDay(row.createdAt) },
    { key: "checked", label: "Last checked", sortValue: (row) => timeValue(row.lastCheckedAt), value: (row) => formatDateTime(row.lastCheckedAt) || "Not checked" },
  ],
  breakdown: { label: "Domains by status", get: (row) => row.status },
  kpis: (rows) => {
    const sent = sum(rows.map((row) => row.emailsSent14d ?? 0));
    const bounced = sum(rows.map((row) => row.emailsBounced14d ?? 0));
    return [
      kpi("Domains", rows.length),
      kpi("Verified", rows.filter((row) => row.status === "Verified").length),
      kpi("Sent (14d)", sent),
      kpi("Bounce rate (14d)", sent ? `${round((bounced / sent) * 100, 2)}%` : "N/A"),
    ];
  },
};

interface TrendRow extends ReputationTrendPoint {
  day: string;
}

const MAX_TREND_DAYS = 365;

const trendReport: ReportDef<TrendRow> = {
  id: "volume",
  label: "Daily sending volume",
  description: "Emails sent each day with bounce and complaint rates.",
  icon: TrendingUp,
  serverRange: true,
  load: async (range) => {
    const days = Math.min(MAX_TREND_DAYS, Math.max(1, range ? daysBetween({ start: range.start, end: toISODate(new Date()) }) : 30));
    const points = await domainService.getReputationTrend({ days });
    return points.map((point) => ({ ...point, day: formatDay(point.date) })).filter((point) => isInRange(point.date, range));
  },
  search: (row) => row.day,
  searchPlaceholder: "Search by date",
  defaultSort: { key: "date", dir: "desc" },
  filters: [
    {
      key: "activity",
      label: "Activity",
      allLabel: "All days",
      options: [
        { value: "sent", label: "Days with sends" },
        { value: "quiet", label: "Days without sends" },
      ],
      test: (row, value) => (value === "sent" ? row.sentVolume > 0 : row.sentVolume === 0),
    },
    {
      key: "bounce",
      label: "Bounce rate",
      allLabel: "Any bounce rate",
      options: [
        { value: "ok", label: "Under 2%" },
        { value: "high", label: "2% and above" },
      ],
      test: (row, value) => (value === "ok" ? row.bounceRate < 2 : row.bounceRate >= 2),
    },
    {
      key: "complaints",
      label: "Complaints",
      allLabel: "Any complaint rate",
      options: [
        { value: "none", label: "No complaints" },
        { value: "some", label: "Has complaints" },
      ],
      test: (row, value) => (value === "none" ? row.complaintRate === 0 : row.complaintRate > 0),
    },
  ],
  columns: [
    { key: "date", label: "Date", value: (row) => row.date.slice(0, 10) },
    { key: "sent", label: "Emails sent", align: "right", value: (row) => row.sentVolume },
    { key: "bounce", label: "Bounce rate (%)", align: "right", value: (row) => round(row.bounceRate, 2), tone: (row) => (row.bounceRate >= 2 ? "danger" : undefined) },
    { key: "complaint", label: "Complaint rate (%)", align: "right", value: (row) => round(row.complaintRate, 2), tone: (row) => (row.complaintRate > 0 ? "warning" : undefined) },
  ],
  kpis: (rows) => {
    const total = sum(rows.map((row) => row.sentVolume));
    const busiest = rows.reduce<TrendRow | null>((best, row) => (!best || row.sentVolume > best.sentVolume ? row : best), null);
    return [
      kpi("Emails sent", total),
      kpi("Avg per day", rows.length ? Math.round(total / rows.length) : 0),
      kpi("Avg bounce rate", `${average(rows.map((row) => row.bounceRate), 2)}%`),
      kpi("Busiest day", busiest && busiest.sentVolume > 0 ? busiest.day : "—", { hint: busiest && busiest.sentVolume > 0 ? `${busiest.sentVolume.toLocaleString()} sent` : undefined }),
    ];
  },
};

export const MAILER_REPORTS: AnyReport[] = [campaignReport, mailboxReport, domainReport, trendReport];
