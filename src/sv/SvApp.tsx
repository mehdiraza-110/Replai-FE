import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useViewAs } from "../hooks/useViewAs";
import { clearViewAs } from "../utils/viewAs";
import { Button, EmptyState } from "./ui";
import { LoadingState } from "../components/ui/LoadingState";
import { useAuth } from "../context/AuthContext";
import { ForgotPasswordPage, ResetPasswordPage, SignInPage, SignUpPage } from "./auth/pages";
import { AuthLayout, AuthMessage } from "./auth/AuthLayout";
import { SettingsShell } from "./layout/SettingsShell";
import { SvShell } from "./layout/SvShell";
import { svPath } from "./nav";
import { SiteEditor } from "./pages/sites/SiteEditor";
import { Sites } from "./pages/sites/Sites";
import { CallDetail, CallsList } from "./pages/ai/Calls";
import { Chat } from "./pages/ai/Chat";
import { GrowthPlanCreator, MarketResearcher, OfferCreator, ReportDetail } from "./pages/ai/Reports";
import { CrmLayout, CrmTab, DashboardPage, Placeholder, SettingsPage, SettingsRedirect } from "./pages";
import { AiSdrInbox } from "./pages/AiSdrInbox";
import { CampaignDetail } from "./pages/cold-email/CampaignDetail";
import { AddInboxes } from "./pages/cold-email/AddInboxes";
import { PrefsProvider } from "./prefs";
import { SettingsAccessTokens, SettingsAppearance, SettingsConferencing, SettingsNotifications, SettingsSecurity } from "./pages/settings/Personal";
import { SettingsApiKeys, SettingsBilling, SettingsBlocklist, SettingsCustomFields, SettingsGeneral, SettingsMembers, SettingsOutcomes, SettingsScheduling, SettingsSharing, SettingsSnapshots, SettingsTemplates } from "./pages/settings/Workspace";
import { SettingsCallAnalyzer, SettingsColdEmailAgent, SettingsDeveloperDocs } from "./pages/settings/Agents";
import { CampaignsHome } from "./pages/cold-email/CampaignsHome";
import { EmailAccounts } from "./pages/cold-email/EmailAccounts";
import { NewCampaign } from "./pages/cold-email/NewCampaign";
import { SettingsAiSdr } from "./pages/SettingsAiSdr";
import { SettingsAvailability } from "./pages/SettingsAvailability";
import { SettingsBrain } from "./pages/SettingsBrain";
import { SettingsEmailCalendar } from "./pages/SettingsEmailCalendar";
import { SettingsProfile } from "./pages/SettingsProfile";
import "./sv.css";

/**
 * Every signed-in person needs a workspace to own their data, but the product has no workspace step.
 * New accounts (and old accounts that never finished the legacy step) get one created here, silently.
 */
function EnsureWorkspace() {
  const { user, createWorkspace, logout } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState("");

  const create = () => {
    setError("");
    const owner = user?.first_name || user?.email?.split("@")[0] || "My";
    createWorkspace({ name: `${owner}'s Workspace`, type: "individual" }).catch((caught) =>
      setError(caught instanceof Error ? caught.message : "We couldn't finish setting up your account."),
    );
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    create();
    // Runs once per mount; `create` only reads the current user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!error) return <LoadingState label="Setting up your account…" minHeight={320} />;

  return (
    <AuthLayout title="Almost there" subtitle="We couldn't finish setting up your account.">
      <div className="sv-auth-form" style={{ marginTop: 32 }}>
        <AuthMessage tone="error">{error}</AuthMessage>
        <button className="sv-auth-submit" type="button" onClick={() => { started.current = true; create(); }}>
          Try again
        </button>
        <button className="sv-auth-forgot" type="button" style={{ alignSelf: "center", margin: 0 }} onClick={() => void logout()}>
          Sign out
        </button>
      </div>
    </AuthLayout>
  );
}

/** Shown instead of the app when the workspace can't be used, so people get one clear screen rather than a wall of failing pages. */
function Blocked({ title, body }: { title: string; body: string }) {
  const { logout } = useAuth();
  return (
    <div className="sv-root" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <EmptyState title={title} body={body} action={<Button onClick={() => void logout()}>Log out</Button>} />
    </div>
  );
}

/** A super admin acting inside a customer's workspace always sees this, so they never forget they are. */
function ViewAsBar() {
  const viewAs = useViewAs();
  const navigate = useNavigate();
  if (!viewAs) return null;
  return (
    <div className="sv-root" style={{ position: "sticky", top: 0, zIndex: 100, minHeight: 0 }}>
      <p className="sv-banner is-warn" role="status" style={{ margin: 0, borderRadius: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span>Viewing {viewAs.name} as super admin. Changes you make here affect this workspace.</span>
        <Button size="sm" onClick={() => { clearViewAs(); navigate("/admin/workspaces"); }}>Exit</Button>
      </p>
    </div>
  );
}

function SvGuard({ children }: { children: ReactNode }) {
  const { activeWorkspace, isAuthenticated, isReady, isSuperAdmin, isTrialEnded } = useAuth();
  const viewAs = useViewAs();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate replace to={svPath("auth/sign-in")} state={{ from: location.pathname }} />;
  if (!isReady) return <LoadingState label="Loading…" minHeight={320} />;
  // A platform admin with no workspace of their own has nothing to show here; their pages live under /admin.
  if (!activeWorkspace && isSuperAdmin) return <Navigate replace to="/admin" />;
  if (!activeWorkspace) return <EnsureWorkspace />;
  if (!viewAs && !isSuperAdmin) {
    if (activeWorkspace.status === "suspended") return <Blocked title={`${activeWorkspace.name} is suspended`} body="This workspace has been suspended, so its data and tools are unavailable for now. Contact support to get it reactivated." />;
    if (isTrialEnded) return <Blocked title="Your trial has ended" body={`The free trial for ${activeWorkspace.name} is over, so its data and tools are unavailable. Contact support to continue.`} />;
  }
  return (
    <>
      <ViewAsBar />
      {children}
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<SvShell />}>
        <Route index element={<Navigate replace to="dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="crm" element={<CrmLayout />}>
          <Route index element={<Navigate replace to="tasks" />} />
          <Route path=":tab" element={<CrmTab />} />
        </Route>
        <Route path="cold-email-campaign-agent" element={<CampaignsHome />} />
        <Route path="cold-email-campaign-agent/new" element={<NewCampaign />} />
        <Route path="cold-email-campaign-agent/email-accounts" element={<EmailAccounts />} />
        <Route path="cold-email-campaign-agent/email-accounts/new" element={<AddInboxes />} />
        <Route path="cold-email-campaign-agent/:id" element={<CampaignDetail />} />
        <Route path="ai-sdr" element={<AiSdrInbox />} />
        <Route path="sales-call-analysis" element={<CallsList />} />
        <Route path="sales-call-analysis/:id" element={<CallDetail />} />
        <Route path="growth-plan-creator" element={<GrowthPlanCreator />} />
        <Route path="growth-plan-creator/:id" element={<ReportDetail slug="growth-plan" />} />
        <Route path="niche-researcher" element={<MarketResearcher />} />
        <Route path="niche-researcher/:id" element={<ReportDetail slug="market-research" />} />
        <Route path="offer-creator" element={<OfferCreator />} />
        <Route path="offer-creator/:id" element={<ReportDetail slug="offer" />} />
        <Route path="ai-growth-consultant" element={<Chat />} />
        <Route path="ai-growth-consultant/:id" element={<Chat />} />
        <Route path="sites/websites" element={<Sites />} />
        <Route path="sites/websites/:id" element={<SiteEditor />} />
        <Route path="whats-new" element={<Placeholder title="What's New" phase="Phase 6" />} />
        <Route path="docs" element={<Placeholder title="Help Center" phase="Phase 6" />} />
      </Route>
      <Route element={<SettingsShell />}>
        <Route path="settings" element={<SettingsRedirect />} />
        <Route path="settings/profile" element={<SettingsProfile />} />
        <Route path="settings/ai-sdr-agent" element={<SettingsAiSdr />} />
        <Route path="settings/brain" element={<SettingsBrain />} />
        <Route path="settings/availability" element={<SettingsAvailability />} />
        <Route path="settings/email-calendar" element={<SettingsEmailCalendar />} />
        <Route path="settings/notifications" element={<SettingsNotifications />} />
        <Route path="settings/appearance" element={<SettingsAppearance />} />
        <Route path="settings/security" element={<SettingsSecurity />} />
        <Route path="settings/conferencing" element={<SettingsConferencing />} />
        <Route path="settings/access-tokens" element={<SettingsAccessTokens />} />
        <Route path="settings/workspace" element={<SettingsGeneral />} />
        <Route path="settings/members" element={<SettingsMembers />} />
        <Route path="settings/workspace-snapshots" element={<SettingsSnapshots />} />
        <Route path="settings/billing" element={<SettingsBilling />} />
        <Route path="settings/scheduling" element={<SettingsScheduling />} />
        <Route path="settings/blocklist" element={<SettingsBlocklist />} />
        <Route path="settings/email-templates" element={<SettingsTemplates />} />
        <Route path="settings/sharing" element={<SettingsSharing />} />
        <Route path="settings/crm-custom-fields" element={<SettingsCustomFields />} />
        <Route path="settings/crm-outcomes" element={<SettingsOutcomes />} />
        <Route path="settings/api-keys" element={<SettingsApiKeys />} />
        <Route path="settings/cold-email-agent" element={<SettingsColdEmailAgent />} />
        <Route path="settings/sales-call-analyzer" element={<SettingsCallAnalyzer />} />
        <Route path="settings/developer-docs" element={<SettingsDeveloperDocs />} />
        <Route path="settings/*" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to={svPath("dashboard")} />} />
    </Routes>
  );
}

/** The app. Everything that isn't one of the few tool pages in App.tsx lands here. */
export function SvApp() {
  return (
    <Routes>
      <Route path="auth/sign-in" element={<SignInPage />} />
      <Route path="auth/sign-up" element={<SignUpPage />} />
      <Route path="auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="auth/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="*"
        element={
          <SvGuard>
            <PrefsProvider>
              <AppRoutes />
            </PrefsProvider>
          </SvGuard>
        }
      />
    </Routes>
  );
}
