import { useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { CloudDownload, X } from "lucide-react";
import { mailboxService } from "../../services/api";
import type { MaildosoSyncSummary } from "../../types";

// Super-admin only. Pulls the domains and mailboxes bought in Maildoso into the platform pool (Koval Group).
export function SyncMaildosoButton({ onDone }: { onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<MaildosoSyncSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      setSummary(await mailboxService.syncMaildoso());
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  const dismiss = () => {
    setSummary(null);
    setError(null);
  };

  return (
    <>
      <Button isDisabled={busy} onPress={run} size="sm" variant="secondary">
        {busy ? <Spinner color="current" size="sm" /> : <CloudDownload className="size-4" />}
        Sync from Maildoso
      </Button>
      {summary || error ? (
        <div
          className={`fixed bottom-4 right-4 z-50 max-w-[420px] rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            error ? "border-danger/20 bg-danger/10 text-danger" : "border-border/70 bg-surface text-foreground"
          }`}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            {error ? (
              <p>{error}</p>
            ) : summary ? (
              <div className="space-y-1">
                <p className="font-semibold">Maildoso sync finished</p>
                <p>
                  {summary.domains} domain{summary.domains === 1 ? "" : "s"} found · {summary.mailboxesCreated} new mailbox
                  {summary.mailboxesCreated === 1 ? "" : "es"} · {summary.mailboxesUpdated} updated · {summary.skipped.length} skipped
                </p>
                {summary.skipped.length > 0 ? (
                  <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-[12px] text-muted">
                    {summary.skipped.map((s) => (
                      <li key={s.email}>
                        {s.email}: {s.reason}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <button aria-label="Dismiss" className="shrink-0 text-muted hover:text-foreground" onClick={dismiss} type="button">
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
