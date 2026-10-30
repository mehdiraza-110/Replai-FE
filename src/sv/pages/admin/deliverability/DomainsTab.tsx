import { useState } from "react";
import { Plus } from "lucide-react";
import { errorMessage } from "../../../../services/adminApi";
import { warmnetApi, type RegisterDomainEntry, type RegisterDomainsResult } from "../../../../services/warmnetApi";
import { Button, Modal, Toggle, SkeletonRows } from "../../../ui";
import { DataTable, EmptyRow, Err, fmtRate, IpBadge, Panel, useLoad, type Notify } from "./shared";

function parseEntries(text: string): RegisterDomainEntry[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
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
  const [error, setError] = useState("");
  const [result, setResult] = useState<RegisterDomainsResult | null>(null);
  const entries = parseEntries(text);

  function close() { setOpen(false); setResult(null); setError(""); if (result) setText(""); }

  async function submit() {
    setBusy(true); setError("");
    try {
      const r = await warmnetApi.registerDomains({ domains: entries, mailboxesPerDomain: perDomain, autoStart });
      setResult(r);
      notify(`Registered ${r.registered} of ${r.results.length} domain(s).`, r.registered ? "success" : "error");
      await list.reload();
    } catch (e) { setError(errorMessage(e, "Unable to register these domains.")); } finally { setBusy(false); }
  }
  const rows = list.data ?? [];

  return (
    <div className="sv-stack">
      <Err message={list.error} onRetry={() => void list.reload()} />
      <Panel title="Warm-up domains" description="Domains already set up in Postal (DNS verified there). Registering adds them to the app with American-name mailboxes, created paused and kept out of the old warm-up lane." actions={<Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>Register domains</Button>}>
        <DataTable minWidth={960} head={<><th>Domain</th><th>Workspace</th><th>Sending IP</th><th>Mailboxes</th><th>By state</th><th>Sent</th><th>Inbox rate, 7d</th></>}>
          {list.isLoading && !list.data ? <SkeletonRows columns={7} />
            : rows.length === 0 ? <EmptyRow columns={7}>No warm-up domains yet. Use Register domains to add the first batch.</EmptyRow>
            : rows.map((d) => (
              <tr key={d.id}>
                <td className="ops-strong">{d.domain}</td>
                <td>{d.workspaceName ?? "-"}</td>
                <td>{d.ip ? <div style={{ display: "grid", gap: 4, justifyItems: "start" }}><span>{d.ip}</span><span className="ops-sub">{d.poolName ?? "no pool name"}</span><IpBadge clean={d.ipClean} /></div> : <span className="ops-muted">Not linked</span>}</td>
                <td>{d.mailboxes}</td>
                <td className="ops-muted" style={{ fontSize: 12 }}>{Object.entries(d.states).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(", ") || "-"}</td>
                <td>{d.totalSent.toLocaleString()}</td>
                <td>{fmtRate(d.inboxRate7d)}<p className="ops-sub">{d.inbox7d} inbox, {d.spam7d} spam</p></td>
              </tr>
            ))}
        </DataTable>
      </Panel>

      <Modal open={open} wide title="Register domains" onClose={close} footer={result ? <Button variant="primary" onClick={close}>Done</Button> : (
        <><Button disabled={busy} onClick={close}>Cancel</Button><Button variant="primary" disabled={busy || entries.length === 0} onClick={() => void submit()}>{busy ? "Registering…" : `Register ${entries.length || ""} domain${entries.length === 1 ? "" : "s"}`.replace("  ", " ")}</Button></>
      )}>
        {result ? (
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13 }}>{result.registered} of {result.results.length} registered, {result.perDomain} mailbox(es) each.</p>
            <ul className="ops-list" style={{ maxHeight: 320, overflowY: "auto" }}>
              {result.results.map((r) => <li key={r.domain}><div className="ops-list-head"><span className="ops-strong">{r.domain}</span><span className="is-end" style={{ color: r.ok ? "#30a46c" : "#e5484d" }}>{r.ok ? `${r.mailboxes} mailboxes created` : r.error}</span></div></li>)}
            </ul>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <p className="sv-hint">One domain per line. Add the sending IP and Postal pool name after a comma if you know them, for example: brightconsultants.xyz, 5.161.30.62, ip-02</p>
            <Err message={error} />
            <div className="sv-field">
              <label className="sv-field-label" htmlFor="reg-domains">Domains</label>
              <textarea id="reg-domains" className="sv-textarea" rows={7} style={{ fontFamily: "monospace" }} spellCheck={false} placeholder={"example-one.xyz, 5.161.30.62, ip-02\nexample-two.xyz"} value={text} onChange={(e) => setText(e.target.value)} />
              <p className="sv-hint">{entries.length} domain{entries.length === 1 ? "" : "s"} entered</p>
            </div>
            <div className="ops-grid-2">
              <div className="sv-field">
                <label className="sv-field-label" htmlFor="reg-per">Mailboxes per domain</label>
                <input id="reg-per" className="sv-input" type="number" min={1} max={10} value={perDomain} onChange={(e) => setPerDomain(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} />
                <p className="sv-hint">Between 1 and 10.</p>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingTop: 22 }}>
                <Toggle checked={autoStart} label="Start warming immediately" onChange={setAutoStart} />
                <div><div style={{ fontWeight: 500, fontSize: 13 }}>Start warming immediately</div><p className="sv-hint">Off: mailboxes wait as Queued until you start them.</p></div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
