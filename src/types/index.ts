export type StatusTone = "default" | "accent" | "success" | "warning" | "danger";

export interface AuthUser {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  profile_image: string | null;
  is_verified: boolean | null;
  is_admin_user: boolean;
  created_at: string;
  updated_at: string;
  roles: Array<{
    id: number;
    name: string;
  }>;
}

export type ConversationIntent =
  | "Interested"
  | "Question"
  | "Objection"
  | "Meeting Request"
  | "Not Interested"
  | "Human Review";

export interface Metric {
  label: string;
  value: string;
  change: string;
  tone: StatusTone;
}

export interface Conversation {
  id: string;
  lead: string;
  company: string;
  role: string;
  email: string;
  latestMessage: string;
  intent: ConversationIntent;
  agent: string;
  status: string;
  updated: string;
  sentiment: string;
  stage: string;
  interest: string;
  confidence: number;
  recommendation: string;
  messages: Array<{
    from: "prospect" | "ai" | "human";
    sender: string;
    time: string;
    body: string;
  }>;
}

export interface InboxManager {
  name: string;
  workspace: string;
  status: "Active" | "Paused";
  agent: string;
  autoReply: boolean;
  repliesToday: number;
  humanReview: number;
}

export interface Agent {
  name: string;
  purpose: string;
  model: string;
  status: "Active" | "Paused";
  inbox: string;
  autoReply: boolean;
  updated: string;
}

export interface KnowledgeItem {
  title: string;
  category: string;
  status: "Published" | "Draft" | "Review";
  updated: string;
}

export interface ReviewItem {
  id: string;
  lead: string;
  company: string;
  trigger: string;
  confidence: number;
  status: "Needs Review" | "Edited" | "Approved" | "Paused";
  agent: string;
  age: string;
  draft: string;
}

export interface Lead {
  name: string;
  email: string;
  company: string;
  role: string;
  campaign: string;
  intent: ConversationIntent;
  sentiment: string;
  stage: string;
  owner: string;
  updated: string;
}

export interface LeadDestination {
  name: string;
  description: string;
  status: "Connected" | "Available";
  destinationType: "CRM" | "Automation" | "Webhook";
  lastForwarded: string;
  leadsForwarded: number;
}

export interface LeadRoutingRule {
  name: string;
  criteria: string;
  destination: string;
  status: "Active" | "Paused";
  forwardedToday: number;
  lastRun: string;
}

export interface TrainingExample {
  id: string;
  prospectMessage: string;
  humanResponse: string;
  intent: string;
  outcome: string;
  quality: "High" | "Medium" | "Low";
  meetingBooked: boolean;
  included: boolean;
  updated: string;
}

export interface EventLogItem {
  timestamp: string;
  event: string;
  workspace: string;
  lead: string;
  conversation: string;
  status: "Success" | "Processing" | "Failed";
  duration: string;
  error?: string;
}

export interface AiDebugRun {
  conversation: string;
  lead: string;
  agent: string;
  model: string;
  confidence: number;
  automationDecision: "Auto Send" | "Human Review" | "Paused";
  sections: Array<{
    title: string;
    value: string;
  }>;
}
