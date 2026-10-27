import { useEffect, useRef, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LoadingState } from "./components/ui/LoadingState";
import { useAuth } from "./context/AuthContext";
import { WORKSPACE_REQUIRED_EVENT } from "./services/api";
import { AIAgents } from "./pages/AIAgents";
import { Analytics } from "./pages/Analytics";
import { Auth } from "./pages/Auth";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { CreateAgent } from "./pages/CreateAgent";
import { Dashboard } from "./pages/Dashboard";
import { EventLogs } from "./pages/EventLogs";
import { ForwardedLeads } from "./pages/ForwardedLeads";
import { HumanReview } from "./pages/HumanReview";
import { Integrations } from "./pages/Integrations";
import { KnowledgeBase } from "./pages/KnowledgeBase";
import { KnowledgeForm } from "./pages/KnowledgeForm";
import { Leads } from "./pages/Leads";
import { Mailer } from "./pages/Mailer";
import { MailboxOnboarding } from "./pages/MailboxOnboarding";
import { Mailboxes } from "./pages/Mailboxes";
import { MailerInbox } from "./pages/MailerInbox";
import { MailerCampaignEdit } from "./pages/MailerCampaignEdit";
import { MailerCampaignNew } from "./pages/MailerCampaignNew";
import { MailerCampaigns } from "./pages/MailerCampaigns";
import { MailerLeads } from "./pages/MailerLeads";
import { MailerDashboard } from "./pages/MailerDashboard";
import { MailerHealth } from "./pages/MailerHealth";
import { MailerWarmup } from "./pages/MailerWarmup";
import { MailerReports } from "./pages/MailerReports";
import { ResponderReports } from "./pages/ResponderReports";
import { Messages } from "./pages/Messages";
import { Notifications } from "./pages/Notifications";
import { Overview } from "./pages/Overview";
import { PlusVibeCampaigns } from "./pages/PlusVibeCampaigns";
import { Settings } from "./pages/Settings";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminWorkspaceDetail } from "./pages/admin/AdminWorkspaceDetail";
import { AdminWorkspaces } from "./pages/admin/AdminWorkspaces";
import { AIKeys } from "./pages/AIKeys";
import { CreateWorkspace } from "./pages/CreateWorkspace";
import { Orders } from "./pages/Orders";
import { AdminDomains } from "./pages/admin/AdminDomains";
import { AdminOrders } from "./pages/admin/AdminOrders";
import { AdminDeliverability } from "./pages/admin/AdminDeliverability";
import { Team } from "./pages/Team";
import { WorkflowEditor } from "./pages/workflows/WorkflowEditor";
import { Workflows } from "./pages/workflows/Workflows";

/** Page only the platform team may use; everyone else is sent to the order form instead. */
function SuperAdminOr({ to, children }: { to: string; children: ReactNode }) {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <>{children}</> : <Navigate replace to={to} />;
}

function ProtectedShell() {
  const { activeWorkspace, isAuthenticated, isReady, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingState label="Loading your workspace..." minHeight={320} />
      </div>
    );
  }

  if (!activeWorkspace) {
    if (!isSuperAdmin) {
      return <Navigate replace to="/create-workspace" />;
    }

    // A super admin without a workspace can still run the platform; tenant pages have nothing to show.
    const isPlatformPath = location.pathname === "/admin" || location.pathname.startsWith("/admin/") || location.pathname === "/settings";
    if (!isPlatformPath) {
      return <Navigate replace to="/admin" />;
    }
  }

  return <AppShell />;
}

/** Routes people to the right place when the API says a workspace is needed, without a page reload. */
function useWorkspaceRequiredRedirect() {
  const { isSuperAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const isHandlingRef = useRef(false);
  const isSuperAdminRef = useRef(isSuperAdmin);
  isSuperAdminRef.current = isSuperAdmin;

  useEffect(() => {
    async function handle() {
      if (isHandlingRef.current) return;
      isHandlingRef.current = true;

      try {
        const fresh = await refreshUser();
        const hasWorkspace = Boolean(fresh?.workspaces?.some((workspace) => workspace.id === fresh.active_workspace_id));

        if (!fresh || hasWorkspace) return;
        navigate(fresh.is_super_admin ?? isSuperAdminRef.current ? "/admin" : "/create-workspace", { replace: true });
      } finally {
        isHandlingRef.current = false;
      }
    }

    window.addEventListener(WORKSPACE_REQUIRED_EVENT, handle);
    return () => window.removeEventListener(WORKSPACE_REQUIRED_EVENT, handle);
  }, [navigate, refreshUser]);
}

export default function App() {
  useWorkspaceRequiredRedirect();

  return (
    <Routes>
      <Route path="login" element={<Auth />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="reset-password" element={<ResetPassword />} />
      <Route path="create-workspace" element={<CreateWorkspace />} />
      <Route element={<ProtectedShell />}>
        <Route path="workflows" element={<Workflows />} />
        <Route path="workflows/:id" element={<WorkflowEditor />} />
        <Route path="mailer/orders" element={<Orders />} />
        <Route path="admin/domains" element={<AdminDomains />} />
        <Route path="admin/orders" element={<AdminOrders />} />
        <Route path="admin/deliverability" element={<AdminDeliverability />} />
        <Route path="team" element={<Team />} />
        <Route path="ai-keys" element={<AIKeys />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/workspaces" element={<AdminWorkspaces />} />
        <Route path="admin/workspaces/:id" element={<AdminWorkspaceDetail />} />
        <Route path="admin/users" element={<AdminUsers />} />
        <Route index element={<Overview />} />
        <Route path="responder" element={<Dashboard />} />
        <Route path="review" element={<HumanReview />} />
        {/* Demo-only pages (static sample data, not tenant data) are not exposed to real workspaces. */}
        <Route path="inbox" element={<Navigate replace to="/" />} />
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
        <Route path="mailer/domains/new" element={<Navigate replace to="/mailer/orders?request=domains" />} />
        <Route path="mailer/mailboxes" element={<Mailboxes />} />
        <Route path="mailer/mailboxes/new" element={<SuperAdminOr to="/mailer/orders?request=mailboxes"><MailboxOnboarding /></SuperAdminOr>} />
        <Route path="mailer/inbox" element={<MailerInbox />} />
        <Route path="mailer/warmup" element={<MailerWarmup />} />
        <Route path="mailer/health" element={<MailerHealth />} />
        <Route path="mailer/leads" element={<MailerLeads />} />
        <Route path="mailer/campaigns" element={<MailerCampaigns />} />
        <Route path="mailer/campaigns/new" element={<MailerCampaignNew />} />
        <Route path="mailer/campaigns/:id/edit" element={<MailerCampaignEdit />} />
        <Route path="mailer/reports" element={<MailerReports />} />
        <Route path="responder/reports" element={<ResponderReports />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
        <Route path="knowledge/new" element={<KnowledgeForm />} />
        <Route path="training" element={<Navigate replace to="/" />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="events" element={<EventLogs />} />
        <Route path="debugging" element={<Navigate replace to="/" />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}
