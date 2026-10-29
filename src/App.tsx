import { useEffect, useRef, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LoadingState } from "./components/ui/LoadingState";
import { useAuth } from "./context/AuthContext";
import { WORKSPACE_REQUIRED_EVENT } from "./services/api";
import { EventLogs } from "./pages/EventLogs";
import { Integrations } from "./pages/Integrations";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminWorkspaceDetail } from "./pages/admin/AdminWorkspaceDetail";
import { AdminWorkspaces } from "./pages/admin/AdminWorkspaces";
import { AIKeys } from "./pages/AIKeys";
import { AdminDomains } from "./pages/admin/AdminDomains";
import { AdminOrders } from "./pages/admin/AdminOrders";
import { AdminDeliverability } from "./pages/admin/AdminDeliverability";
import { SvApp } from "./sv/SvApp";
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
    return <Navigate replace to="/auth/sign-in" state={{ from: location.pathname }} />;
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
      return <Navigate replace to="/dashboard" />;
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
        navigate(fresh.is_super_admin ?? isSuperAdminRef.current ? "/admin" : "/dashboard", { replace: true });
      } finally {
        isHandlingRef.current = false;
      }
    }

    window.addEventListener(WORKSPACE_REQUIRED_EVENT, handle);
    return () => window.removeEventListener(WORKSPACE_REQUIRED_EVENT, handle);
  }, [navigate, refreshUser]);
}

/** Old addresses keep working: bookmarks and links in emails already sent point at them. Query strings (reset tokens) are kept. */
function To({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate replace to={`${to}${search}`} />;
}

const REDIRECTS: Array<[string, string]> = [
  ["login", "/auth/sign-in"],
  ["forgot-password", "/auth/forgot-password"],
  ["reset-password", "/auth/reset-password"],
  ["create-workspace", "/dashboard"],
  ["responder", "/ai-sdr"],
  ["review", "/ai-sdr"],
  ["messages", "/ai-sdr"],
  ["inbox", "/ai-sdr"],
  ["notifications", "/ai-sdr"],
  ["mailer/inbox", "/ai-sdr"],
  ["leads", "/crm/people"],
  ["mailer/leads", "/crm/people"],
  ["forwarded-leads", "/crm/lead-submissions"],
  ["campaigns", "/cold-email-campaign-agent"],
  ["mailer/campaigns", "/cold-email-campaign-agent"],
  ["mailer/campaigns/new", "/cold-email-campaign-agent/new"],
  ["mailer", "/cold-email-campaign-agent/email-accounts"],
  ["mailer/domains", "/cold-email-campaign-agent/email-accounts"],
  ["mailer/domains/new", "/cold-email-campaign-agent/email-accounts/new"],
  ["mailer/mailboxes/new", "/cold-email-campaign-agent/email-accounts"],
  ["mailer/mailboxes", "/cold-email-campaign-agent/email-accounts"],
  ["mailer/health", "/cold-email-campaign-agent/email-accounts"],
  ["mailer/warmup", "/cold-email-campaign-agent/email-accounts"],
  ["mailer/orders", "/cold-email-campaign-agent/email-accounts/new"],
  ["mailer/reports", "/dashboard"],
  ["responder/reports", "/dashboard"],
  ["analytics", "/dashboard"],
  ["agents", "/settings/ai-sdr-agent"],
  ["agents/new", "/settings/ai-sdr-agent"],
  ["knowledge", "/settings/ai-sdr-agent"],
  ["knowledge/new", "/settings/ai-sdr-agent"],
  ["team", "/settings/members"],
  ["training", "/dashboard"],
  ["debugging", "/dashboard"],
];

/** The new app used to live under /v2. */
function FromV2() {
  const params = useParams();
  const { search } = useLocation();
  return <Navigate replace to={`/${params["*"] ?? ""}${search}`} />;
}

function EditCampaignRedirect() {
  const { id } = useParams();
  return <Navigate replace to={id && /^\d+$/.test(id) ? `/cold-email-campaign-agent/${id}` : "/cold-email-campaign-agent"} />;
}

export default function App() {
  useWorkspaceRequiredRedirect();

  return (
    <Routes>
      {REDIRECTS.map(([from, to]) => <Route key={from} path={from} element={<To to={to} />} />)}
      <Route path="v2/*" element={<FromV2 />} />
      <Route path="mailer/campaigns/:id/edit" element={<EditCampaignRedirect />} />
      {/* Tools the new app has no screen for yet stay on their own pages. */}
      <Route element={<ProtectedShell />}>
        <Route path="workflows" element={<Workflows />} />
        <Route path="workflows/:id" element={<WorkflowEditor />} />
        <Route path="ai-keys" element={<AIKeys />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="events" element={<EventLogs />} />
        <Route element={<SuperAdminOr to="/dashboard"><Outlet /></SuperAdminOr>}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/workspaces" element={<AdminWorkspaces />} />
          <Route path="admin/workspaces/:id" element={<AdminWorkspaceDetail />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/domains" element={<AdminDomains />} />
          <Route path="admin/orders" element={<AdminOrders />} />
          <Route path="admin/deliverability" element={<AdminDeliverability />} />
        </Route>
      </Route>
      <Route path="*" element={<SvApp />} />
    </Routes>
  );
}
