import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../../ui";
import { useSvTitle } from "../../layout/chrome";
import { ActivityTab } from "./deliverability/ActivityTab";
import { DomainsTab } from "./deliverability/DomainsTab";
import { IpsTab } from "./deliverability/IpsTab";
import { MailboxesTab } from "./deliverability/MailboxesTab";
import { OverviewTab } from "./deliverability/OverviewTab";
import { SeedsTab } from "./deliverability/SeedsTab";
import { SettingsTab } from "./deliverability/SettingsTab";
import type { Notify } from "./deliverability/shared";
import "./ops.css";

type TabKey = "overview" | "activity" | "mailboxes" | "domains" | "seeds" | "ips" | "settings";
const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "mailboxes", label: "Mailboxes" },
  { key: "domains", label: "Domains" },
  { key: "seeds", label: "Seed inboxes" },
  { key: "activity", label: "Activity" },
  { key: "ips", label: "IPs & blocklists" },
  { key: "settings", label: "Settings" },
];
const STORAGE_KEY = "deliverability-tab";

function initialTab(): TabKey {
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (TABS.some((t) => t.key === saved)) return saved as TabKey;
  } catch { /* storage unavailable */ }
  return "overview";
}

export function AdminDeliverability() {
  useSvTitle([{ label: "Admin" }, { label: "Deliverability" }]);
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const notify: Notify = (message, tone = "success") => {
    setNotice({ message, tone });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), 6000);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function change(next: TabKey) {
    setTab(next); setNotice(null);
    try { window.sessionStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ }
  }

  return (
    <div className="sv-page">
      <PageHeader title="Deliverability" subtitle="Warms new domains before any prospect is emailed. Our mailboxes exchange real conversations with seed inboxes that read, rescue from spam, star and reply." />
      <div className="sv-tabs" role="tablist" aria-label="Deliverability sections">
        {TABS.map((t) => <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`sv-tab${tab === t.key ? " is-active" : ""}`} onClick={() => change(t.key)}>{t.label}</button>)}
      </div>
      {notice ? <p className={`sv-banner is-${notice.tone === "success" ? "ok" : "error"}`} role="status" aria-live="polite" style={{ margin: 0 }}>{notice.message}</p> : null}
      <div role="tabpanel" className="sv-stack">
        {tab === "overview" ? <OverviewTab notify={notify} /> : null}
        {tab === "mailboxes" ? <MailboxesTab notify={notify} /> : null}
        {tab === "domains" ? <DomainsTab notify={notify} /> : null}
        {tab === "seeds" ? <SeedsTab notify={notify} /> : null}
        {tab === "activity" ? <ActivityTab /> : null}
        {tab === "ips" ? <IpsTab notify={notify} /> : null}
        {tab === "settings" ? <SettingsTab notify={notify} /> : null}
      </div>
    </div>
  );
}
