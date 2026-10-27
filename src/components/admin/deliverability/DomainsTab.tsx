import { useState } from "react";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { errorMessage } from "../../../services/adminApi";
import { warmnetApi, type RegisterDomainEntry, type RegisterDomainsResult } from "../../../services/warmnetApi";
import { AdminModal, ErrorBanner } from "../AdminModal";
import { Field, inputClass } from "../AdminBits";
import { SkeletonRow } from "../../ui/Skeleton";
import { EmptyRow, IpBadge, Panel, Switch, TableCard, fmtRate, tdClass, thClass, theadClass, useLoad, type Notify } from "./Bits";

function parseEntries(text: string): RegisterDomainEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [domain, ip, pool] = line.split(/[,\s;\t]+/).filter(Boolean);
      return { domain: (domain || "").toLowerCase(), ...(ip ? { ip } : {}), ...(pool ? { pool } : {}) };
    });
}

export function DomainsTab({ notify }: { notify: Notify }) {
  const list = useLoad(() => warmnetApi.listDomains(), []);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [perDomain, setPerDomain] = useState(5);
  const [autoStart, setAutoStart] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterDomainsResult | null>(null);

  const entries = parseEntries(text);

  function close() {
    setOpen(false);
    setResult(null);
    setError(null);
    if (result) setText("");
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await warmnetApi.registerDomains({ domains: entries, mailboxesPerDomain: perDomain, autoStart });
      setResult(r);
      notify(`Registered ${r.registered} of ${r.results.length} domain(s).`, r.registered ? "success" : "error");
      await list.reload();
    } catch (e) {
      setError(errorMessage(e, "Unable to register these domains."));
    } finally {
      setBusy(false);
    }
  }

  const rows = list.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {list.error ? <ErrorBanner message={list.error} onRetry={() => void list.reload()} /> : null}
      <Panel
        actions={
          <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Register domains
          </Button>
        }
        description="Domains already set up in Postal (DNS verified there). Registering adds them to the app with American-name mailboxes, created paused and kept out of the old warm-up lane."
        title="Warm-up domains"
      >
        <TableCard minWidth={980}>
          <thead className={theadClass}>
            <tr>
              <th className={`${thClass} pl-4`}>Domain</th>
              <th className={thClass}>Workspace</th>
              <th className={thClass}>Sending IP</th>
              <th className={thClass}>Mailboxes</th>
              <th className={thClass}>By state</th>
              <th className={thClass}>Sent</th>
              <th className={thClass}>Inbox rate, 7d</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && !list.data ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow columns={7} key={i} />)
            ) : rows.length === 0 ? (
              <EmptyRow columns={7}>No warm-up domains yet. Use Register domains to add the first batch.</EmptyRow>
            ) : (
              rows.map((d) => (
                <tr className="border-b border-border/60 align-top last:border-0" key={d.id}>
                  <td className={`${tdClass} pl-4 font-medium text-foreground`}>{d.domain}</td>
                  <td className={tdClass}>{d.workspaceName ?? "-"}</td>
                  <td className={tdClass}>
                    {d.ip ? (
                      <div className="flex flex-col items-start gap-1">
                        <span className="tabular-nums">{d.ip}</span>
                        <span className="text-[12px] text-muted">{d.poolName ?? "no pool name"}</span>
                        <IpBadge clean={d.ipClean} />
                      </div>
                    ) : (
                      <span className="text-muted">Not linked</span>
                    )}
                  </td>
                  <td className={`${tdClass} tabular-nums`}>{d.mailboxes}</td>
                  <td className={`${tdClass} text-[12px] text-muted`}>
                    {Object.entries(d.states)
                      .filter(([, n]) => n > 0)
                      .map(([k, n]) => `${n} ${k}`)
                      .join(", ") || "-"}
                  </td>
                  <td className={`${tdClass} tabular-nums`}>{d.totalSent.toLocaleString()}</td>
                  <td className={`${tdClass} tabular-nums`}>
                    {fmtRate(d.inboxRate7d)}
                    <div className="text-[12px] text-muted">{d.inbox7d} inbox, {d.spam7d} spam</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TableCard>
      </Panel>

      <AdminModal
        description="One domain per line. Add the sending IP and Postal pool name after a comma if you know them, for example: brightconsultants.xyz, 5.161.30.62, ip-02"
        footer={
          result ? (
            <Button size="sm" variant="primary" onClick={close}>Done</Button>
          ) : (
            <>
              <Button isDisabled={busy} size="sm" variant="secondary" onClick={close}>Cancel</Button>
              <Button isDisabled={busy || entries.length === 0} size="sm" variant="primary" onClick={() => void submit()}>
                {busy ? "Registering..." : `Register ${entries.length || ""} domain${entries.length === 1 ? "" : "s"}`.replace("  ", " ")}
              </Button>
            </>
          )
        }
        isOpen={open}
        title="Register domains"
        width={760}
        onClose={close}
      >
        {result ? (
          <div className="grid gap-3">
            <p className="text-sm text-foreground">
              {result.registered} of {result.results.length} registered, {result.perDomain} mailbox(es) each.
            </p>
            <ul className="grid max-h-[320px] gap-1 overflow-y-auto text-[13px]">
              {result.results.map((r) => (
                <li className="flex flex-wrap justify-between gap-2 rounded-lg border border-border/60 px-3 py-2" key={r.domain}>
                  <span className="font-medium text-foreground">{r.domain}</span>
                  <span className={r.ok ? "text-success" : "text-danger"}>{r.ok ? `${r.mailboxes} mailboxes created` : r.error}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid gap-4">
            {error ? <ErrorBanner message={error} /> : null}
            <Field hint={`${entries.length} domain${entries.length === 1 ? "" : "s"} entered`} label="Domains">
              <textarea
                className={`${inputClass} h-40 resize-y py-2 font-mono`}
                placeholder={"example-one.xyz, 5.161.30.62, ip-02\nexample-two.xyz"}
                spellCheck={false}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field hint="Between 1 and 10." label="Mailboxes per domain">
                <input
                  className={inputClass}
                  max={10}
                  min={1}
                  type="number"
                  value={perDomain}
                  onChange={(e) => setPerDomain(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                />
              </Field>
              <div className="flex items-start gap-3 sm:pt-6">
                <Switch checked={autoStart} label="Start warming immediately" onChange={setAutoStart} />
                <div>
                  <p className="text-sm font-medium text-foreground">Start warming immediately</p>
                  <p className="text-[12px] text-muted">Off: mailboxes wait as Queued until you start them.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
