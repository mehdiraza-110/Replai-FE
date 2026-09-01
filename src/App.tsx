import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { useAuth } from "./context/AuthContext";
import { AIDebugging } from "./pages/AIDebugging";
import { AIAgents } from "./pages/AIAgents";
import { Analytics } from "./pages/Analytics";
import { Auth } from "./pages/Auth";
import { CreateAgent } from "./pages/CreateAgent";
import { Dashboard } from "./pages/Dashboard";
import { EventLogs } from "./pages/EventLogs";
import { HumanReview } from "./pages/HumanReview";
import { InboxManagers } from "./pages/InboxManagers";
import { Integrations } from "./pages/Integrations";
import { KnowledgeBase } from "./pages/KnowledgeBase";
import { LeadRouting } from "./pages/LeadRouting";
import { Leads } from "./pages/Leads";
import { Messages } from "./pages/Messages";
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
        <Route index element={<Dashboard />} />
        <Route path="review" element={<HumanReview />} />
        <Route path="inbox" element={<InboxManagers />} />
        <Route path="messages" element={<Messages />} />
        <Route path="leads" element={<Leads />} />
        <Route path="lead-routing" element={<LeadRouting />} />
        <Route path="agents" element={<AIAgents />} />
        <Route path="agents/new" element={<CreateAgent />} />
        <Route path="agents/:id/edit" element={<CreateAgent />} />
        <Route path="campaigns" element={<PlusVibeCampaigns />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
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
