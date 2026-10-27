import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../../components/admin/AdminBits";
import { ActivityTab } from "../../components/admin/deliverability/ActivityTab";
import { TabBar, type Notify, type TabDef } from "../../components/admin/deliverability/Bits";
import { DomainsTab } from "../../components/admin/deliverability/DomainsTab";
import { IpsTab } from "../../components/admin/deliverability/IpsTab";
import { MailboxesTab } from "../../components/admin/deliverability/MailboxesTab";
import { OverviewTab } from "../../components/admin/deliverability/OverviewTab";
import { SeedsTab } from "../../components/admin/deliverability/SeedsTab";
import { SettingsTab } from "../../components/admin/deliverability/SettingsTab";

type TabKey = "overview" | "mailboxes" | "domains" | "seeds" | "activity" | "ips" | "settings";

const TABS: Array<TabDef<TabKey>> = [
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
  } catch {
    /* storage unavailable */
  }
  return "overview";
}

export function AdminDeliverability() {
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
    setTab(next);
    setNotice(null);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-5">
      <PageHeader
        description="Warms new domains before any prospect is emailed. Our mailboxes exchange real conversations with seed inboxes that read, rescue from spam, star and reply."
        title="Deliverability"
      />
      <TabBar tabs={TABS} value={tab} onChange={change} />

      {notice ? (
        <div
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${notice.tone === "success" ? "border-success/30 bg-success/10 text-foreground" : "border-danger/20 bg-danger/10 text-danger"}`}
          role="status"
        >
          {notice.message}
        </div>
      ) : null}

      <div role="tabpanel">
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
