import type { MergeVariable } from "../../../components/ui/RichTextEditor";
import type { BadgeTone } from "../../ui";
import type { CampaignStatus } from "../../api/campaigns";

export const STATUS_TONE: Record<CampaignStatus, BadgeTone> = { Active: "green", Paused: "yellow", Draft: "neutral", Completed: "blue" };

/** The merge variables the send engine understands. A lead missing one is never sent to. */
export const MERGE_VARIABLES: MergeVariable[] = [
  { key: "firstName", label: "First name", description: "The lead's first name" },
  { key: "lastName", label: "Last name", description: "The lead's last name" },
  { key: "fullName", label: "Full name", description: "The lead's full name" },
  { key: "company", label: "Company", description: "The lead's company" },
  { key: "role", label: "Job title", description: "The lead's role" },
  { key: "email", label: "Email", description: "The lead's email address" },
  { key: "senderName", label: "Sender name", description: "The inbox the email is sent from" },
];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong. Try again.");
export const pctText = (value: number) => `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
