import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { errorMessage } from "../../../../services/adminApi";
import { warmnetApi, type WarmIp } from "../../../../services/warmnetApi";
import { Button, Modal, SkeletonRows } from "../../../ui";
import { ConfirmModal } from "../domainParts";
import { DataTable, EmptyRow, Err, Fld, fmtDateTime, IpBadge, Panel, useLoad, type Notify } from "./shared";

const BLANK = { ip: "", hostname: "", poolName: "", notes: "" };

export function IpsTab({ notify }: { notify: Notify }) {
  const list = useLoad(() => warmnetApi.listIps(), []);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState<number | "all" | null>(null);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [deleting, setDeleting] = useState<WarmIp | null>(null);
  const ips = list.data?.items ?? [];
  const closeAdd = () => { setAddOpen(false); setFormError(""); };

  async function add() {
    setBusy(true); setFormError("");
    try {
      await warmnetApi.addIp({ ip: form.ip.trim(), hostname: form.hostname.trim() || undefined, poolName: form.poolName.trim() || undefined, notes: form.notes.trim() || undefined });
      notify("IP added and checked against the blocklists.");
      setAddOpen(false); setForm(BLANK); await list.reload();
    } catch (e) { setFormError(errorMessage(e, "Unable to add this IP.")); } finally { setBusy(false); }
  }
  async function check(id: number | "all") {
    setChecking(id); setActionError("");
    try {
      if (id === "all") {
        const r = await warmnetApi.checkAllIps();
        const listed = r.filter((x) => !x.clean).length;
        notify(listed ? `${listed} IP(s) are listed on a blocklist.` : `All ${r.length} IP(s) are clean.`, listed ? "error" : "success");
      } else {
        const r = await warmnetApi.checkIp(id);
        notify(r.clean ? "That IP is clean." : `Listed on: ${r.listings.join(", ")}.`, r.clean ? "success" : "error");
      }
      await list.reload();
    } catch (e) { setActionError(errorMessage(e, "Unable to run the check.")); } finally { setChecking(null); }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try { await warmnetApi.deleteIp(deleting.id); notify("IP removed."); setDeleting(null); await list.reload(); }
    catch (e) { setActionError(errorMessage(e, "Unable to remove this IP.")); setDeleting(null); } finally { setBusy(false); }
  }

  return (
    <div className="sv-stack">
      <Err message={actionError} />
      <Err message={list.error} onRetry={() => void list.reload()} />
      <Panel title="Sending IPs" description={`Checked daily at 06:30 server time against ${list.data ? list.data.blocklists.length : "several"} blocklists. Mailboxes on a listed IP stop sending until it is clean again.`} actions={
        <>
          <Button icon={RefreshCw} disabled={checking !== null || ips.length === 0} onClick={() => void check("all")}>{checking === "all" ? "Checking…" : "Check all"}</Button>
          <Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)}>Add IP</Button>
        </>
      }>
        <DataTable minWidth={960} head={<><th>IP</th><th>Hostname</th><th>Pool</th><th>Domains</th><th>Mailboxes</th><th>Blocklists</th><th>Last checked</th><th className="is-right">Actions</th></>}>
          {list.isLoading && !list.data ? <SkeletonRows columns={8} />
            : ips.length === 0 ? <EmptyRow columns={8}>No sending IPs yet. Add the IPs your mail server sends from, or register domains with an IP.</EmptyRow>
            : ips.map((ip) => (
              <tr key={ip.id}>
                <td className="ops-strong">{ip.ip}</td>
                <td>{ip.hostname ?? "-"}</td>
                <td>{ip.poolName ?? "-"}</td>
                <td>{ip.domains}</td>
                <td>{ip.mailboxes}</td>
                <td><IpBadge clean={ip.clean} unchecked={ip.unchecked.length > 0} />
                  {ip.listings.length > 0 ? <p className="ops-sub" style={{ color: "#e5484d", maxWidth: 260 }}>Listed on {ip.listings.join(", ")}</p> : null}
                  {ip.unchecked.length > 0 ? <p className="ops-sub" style={{ maxWidth: 260 }}>Could not reach: {ip.unchecked.join(", ")}</p> : null}
                </td>
                <td className="ops-muted" style={{ fontSize: 12 }}>{fmtDateTime(ip.lastCheckedAt)}</td>
                <td className="is-right"><span className="sv-actions" style={{ justifyContent: "flex-end" }}>
                  <Button size="sm" disabled={checking !== null} onClick={() => void check(ip.id)}>{checking === ip.id ? "Checking…" : "Check"}</Button>
                  <Button size="sm" onClick={() => setDeleting(ip)}>Remove</Button>
                </span></td>
              </tr>
            ))}
        </DataTable>
      </Panel>

      <Modal open={addOpen} title="Add sending IP" onClose={closeAdd} footer={<><Button disabled={busy} onClick={closeAdd}>Cancel</Button><Button variant="primary" disabled={busy || !form.ip.trim()} onClick={() => void add()}>{busy ? "Adding…" : "Add IP"}</Button></>}>
        <form style={{ display: "grid", gap: 14 }} onSubmit={(e) => { e.preventDefault(); if (form.ip.trim() && !busy) void add(); }}>
          <Err message={formError} />
          <Fld id="ip-addr" label="IP address" hint="IPv4 only."><input id="ip-addr" autoFocus className="sv-input" placeholder="203.0.113.10" value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} /></Fld>
          <Fld id="ip-host" label="Hostname (optional)"><input id="ip-host" className="sv-input" placeholder="mta.example.com" value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} /></Fld>
          <Fld id="ip-pool" label="Pool name (optional)" hint="The Postal IP pool this address belongs to."><input id="ip-pool" className="sv-input" placeholder="ip-02" value={form.poolName} onChange={(e) => setForm({ ...form, poolName: e.target.value })} /></Fld>
          <Fld id="ip-notes" label="Notes (optional)"><input id="ip-notes" className="sv-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Fld>
          <button type="submit" hidden />
        </form>
      </Modal>

      {deleting ? <ConfirmModal title="Remove IP" confirmLabel="Remove IP" danger busy={busy} onClose={() => setDeleting(null)} onConfirm={() => void remove()}><p style={{ margin: 0 }}>Stop tracking {deleting.ip}? Domains linked to it keep working but lose their blocklist protection.</p></ConfirmModal> : null}
    </div>
  );
}
