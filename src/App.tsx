import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { useAuth } from "./context/AuthContext";
import { AIDebugging } from "./pages/AIDebugging";
import { AIAgents } from "./pages/AIAgents";
import { Analytics } from "./pages/Analytics";
import { Auth } from "./pages/Auth";
import { CreateAgent } from "./pages/CreateAgent";
import { Dashboard } from "./pages/Dashboard";
import { DomainOnboarding } from "./pages/DomainOnboarding";
import { EventLogs } from "./pages/EventLogs";
import { ForwardedLeads } from "./pages/ForwardedLeads";
import { HumanReview } from "./pages/HumanReview";
import { InboxManagers } from "./pages/InboxManagers";
import { Integrations } from "./pages/Integrations";
import { KnowledgeBase } from "./pages/KnowledgeBase";
import { KnowledgeForm } from "./pages/KnowledgeForm";
import { Leads } from "./pages/Leads";
import { Mailer } from "./pages/Mailer";
import { MailboxOnboarding } from "./pages/MailboxOnboarding";
import { Mailboxes } from "./pages/Mailboxes";
import { MailerInbox } from "./pages/MailerInbox";
import { MailerCampaignNew } from "./pages/MailerCampaignNew";
import { MailerCampaigns } from "./pages/MailerCampaigns";
import { MailerDashboard } from "./pages/MailerDashboard";
import { MailerHealth } from "./pages/MailerHealth";
import { MailerWarmup } from "./pages/MailerWarmup";
import { Messages } from "./pages/Messages";
import { Notifications } from "./pages/Notifications";
import { Overview } from "./pages/Overview";
import { PlusVibeCampaigns } from "./pages/PlusVibeCampaigns";
import { Settings } from "./pages/Settings";
import { Training } from "./pages/Training";

function ProtectedShell() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }

  return <AppShell />;
}

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<Auth />} />
      <Route element={<ProtectedShell />}>
        <Route index element={<Overview />} />
        <Route path="responder" element={<Dashboard />} />
        <Route path="review" element={<HumanReview />} />
        <Route path="inbox" element={<InboxManagers />} />
        <Route path="messages" element={<Messages />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="leads" element={<Leads />} />
        <Route path="forwarded-leads" element={<ForwardedLeads />} />
        <Route path="agents" element={<AIAgents />} />
        <Route path="agents/new" element={<CreateAgent />} />
        <Route path="agents/:id/edit" element={<CreateAgent />} />
        <Route path="campaigns" element={<PlusVibeCampaigns />} />
        <Route path="mailer" element={<MailerDashboard />} />
        <Route path="mailer/domains" element={<Mailer />} />
        <Route path="mailer/domains/new" element={<DomainOnboarding />} />
        <Route path="mailer/mailboxes" element={<Mailboxes />} />
        <Route path="mailer/mailboxes/new" element={<MailboxOnboarding />} />
        <Route path="mailer/inbox" element={<MailerInbox />} />
        <Route path="mailer/warmup" element={<MailerWarmup />} />
        <Route path="mailer/health" element={<MailerHealth />} />
        <Route path="mailer/campaigns" element={<MailerCampaigns />} />
        <Route path="mailer/campaigns/new" element={<MailerCampaignNew />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
        <Route path="knowledge/new" element={<KnowledgeForm />} />
        <Route path="training" element={<Training />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="events" element={<EventLogs />} />
        <Route path="debugging" element={<AIDebugging />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}
