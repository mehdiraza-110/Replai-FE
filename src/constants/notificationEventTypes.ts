// Mirrors NOTIFICATION_RULES in Replai-BE/services/notification.service.js — the
// event types that are notification-worthy versus internal/noisy (page views,
// listings, syncs). Used to filter the live event stream for the notification
// bell and the Notifications page.
export const NOTIFICATION_EVENT_TYPES = [
  "ai.draft.generated",
  "ai.draft.webhook_generated",
  "ai.draft.approved_sent",
  "plusvibe.reply.manual_sent",
  "ai.draft.rejected",
  "ai.draft.webhook_failed",
  "knowledge_source.created",
  "knowledge_source.deleted",
  "ai_agent.created",
  "ai_agent.deleted",
  "plusvibe.connection.created",
  "plusvibe.connection.test_failed",
  "plusvibe.connection.refresh_failed",
  "plusvibe.campaign.agent_assigned",
];
