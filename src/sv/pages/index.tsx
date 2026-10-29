import type { ReactElement } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { Calendar, ListFilter, Mail, MessageSquareText, Search, Settings as SettingsIcon, ThumbsUp, Users, PhoneCall, Plus } from "lucide-react";
import { crmTabs, settingsNav, svPath } from "../nav";
import { useSvTitle } from "../layout/chrome";
import { Button, Card, EmptyState, FilterButton, PageHeader, StatCard, TabNav } from "../ui";
import { Dashboard as DashboardPage } from "./Dashboard";
export { DashboardPage };
import { AppointmentsTab, CompaniesTab, DealsTab, FilesTab, NotesTab, PeopleTab, ScheduledTab, SubmissionsTab, TasksTab } from "./crm/Tabs";

export function Placeholder({ title, subtitle, phase }: { title: string; subtitle?: string; phase: string }) {
  return (
    <div className="sv-page">
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState title="Not built yet" body={`This screen arrives in ${phase}.`} />
    </div>
  );
}

/** First real screen on the new design system: the Cold Email Agent campaign list (data wiring is Phase 3). */
export function ColdEmailHome() {
  useSvTitle([{ label: "Cold Email Agent" }]);
  return (
    <div className="sv-page">
      <PageHeader
        title="All Campaigns"
        actions={
          <>
            <Button icon={SettingsIcon}>Settings</Button>
            <Button icon={Mail}>Email Accounts</Button>
            <Button variant="primary" icon={Plus}>
              New Campaign
            </Button>
          </>
        }
      />
      <div className="sv-stats">
        <StatCard label="Contacted Leads" value="—" icon={Users} />
        <StatCard label="Positive Replies" value="—" icon={ThumbsUp} />
        <StatCard label="Positive Reply Rate" value="—" icon={MessageSquareText} />
        <StatCard label="Booked Call Rate" value="—" icon={PhoneCall} />
        <StatCard label="Calls Booked" value="—" icon={Calendar} />
      </div>
      <div style={{ display: "flex", gap: 8, margin: "24px 0 16px", alignItems: "center" }}>
        <FilterButton icon={ListFilter}>Status</FilterButton>
        <FilterButton icon={Calendar}>Date Range</FilterButton>
        <div style={{ flex: 1 }} />
        <label className="sv-settings-search" style={{ margin: 0, width: 240, height: 36 }}>
          <Search className="sv-icon" aria-hidden />
          <input placeholder="Search campaigns…" aria-label="Search campaigns" />
        </label>
      </div>
      <Card>
        <div style={{ padding: 16 }}>
          <EmptyState title="No campaigns yet" body="Campaigns you create will show up here." />
        </div>
      </Card>
    </div>
  );
}

export function CrmLayout() {
  useSvTitle([{ label: "CRM" }]);
  return (
    <div className="sv-page" style={{ paddingTop: 12 }}>
      <TabNav tabs={crmTabs} />
      <div style={{ height: 24 }} />
      <Outlet />
    </div>
  );
}

const CRM_TABS: Record<string, () => ReactElement> = {
  tasks: TasksTab,
  deals: DealsTab,
  appointments: AppointmentsTab,
  people: PeopleTab,
  "lead-submissions": SubmissionsTab,
  companies: CompaniesTab,
  notes: NotesTab,
  files: FilesTab,
  "scheduled-messages": ScheduledTab,
};

export function CrmTab() {
  const { tab } = useParams();
  const Tab = tab ? CRM_TABS[tab] : undefined;
  if (!Tab) return <Navigate replace to={svPath("crm/tasks")} />;
  return <Tab key={tab} />;
}

export function SettingsRedirect() {
  return <Navigate replace to={svPath("settings/profile")} />;
}

export function SettingsPage() {
  const { pathname } = useLocation();
  const page = settingsNav.flatMap((group) => group.pages).find((item) => pathname === svPath(item.to));
  useSvTitle([{ label: page?.label ?? "Settings" }]);
  if (!page) return <Navigate replace to={svPath("settings/profile")} />;
  return (
    <div className="sv-page">
      <div className="sv-settings-col">
        <PageHeader title={page.label} />
        <EmptyState title="Not built yet" body="Settings pages arrive in Phase 6." />
      </div>
    </div>
  );
}
