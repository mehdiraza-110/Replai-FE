import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { WORKSPACE_REQUIRED_EVENT } from "./services/api";
import { SvApp } from "./sv/SvApp";

/** Routes people to the right place when the API says a workspace is needed, without a page reload. */
function useWorkspaceRequiredRedirect() {
  const { isSuperAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
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
        // A platform admin with no workspace of their own works from the admin pages; leave them where they are.
        if ((fresh.is_super_admin ?? isSuperAdminRef.current) && pathRef.current.startsWith("/admin")) return;
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
  ["sales-call-analysis", "/dashboard"],
  ["sales-call-analysis/:id", "/dashboard"],
  ["settings/sales-call-analyzer", "/settings/profile"],
  ["messages", "/ai-sdr"],
  ["inbox", "/ai-sdr"],
  ["notifications", "/ai-sdr"],
  ["mailer/inbox", "/ai-sdr"],
  ["mailer/leads", "/leads"],
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
      {/* Everything else, including the admin and tool pages, is the app. */}
      <Route path="*" element={<SvApp />} />
    </Routes>
  );
}
