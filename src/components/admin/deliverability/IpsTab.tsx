import { useState } from "react";
import { Button } from "@heroui/react";
import { Plus, RefreshCw } from "lucide-react";
import { errorMessage } from "../../../services/adminApi";
import { warmnetApi, type WarmIp } from "../../../services/warmnetApi";
import { AdminModal, ConfirmDialog, ErrorBanner } from "../AdminModal";
import { Field, inputClass } from "../AdminBits";
import { SkeletonRow } from "../../ui/Skeleton";
import { EmptyRow, IpBadge, Panel, TableCard, fmtDateTime, tdClass, thClass, theadClass, useLoad, type Notify } from "./Bits";

const BLANK = { ip: "", hostname: "", poolName: "", notes: "" };

export function IpsTab({ notify }: { notify: Notify }) {
  const list = useLoad(() => warmnetApi.listIps(), []);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState<number | "all" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<WarmIp | null>(null);

  const ips = list.data?.items ?? [];

  async function add() {
    setBusy(true);
    setFormError(null);
    try {
      await warmnetApi.addIp({ ip: form.ip.trim(), hostname: form.hostname.trim() || undefined, poolName: form.poolName.trim() || undefined, notes: form.notes.trim() || undefined });
      notify("IP added and checked against the blocklists.");
      setAddOpen(false);
      setForm(BLANK);
      await list.reload();
    } catch (e) {
      setFormError(errorMessage(e, "Unable to add this IP."));
    } finally {
      setBusy(false);
    }
  }

  async function check(id: number | "all") {
    setChecking(id);
    setActionError(null);
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
    } catch (e) {
      setActionError(errorMessage(e, "Unable to run the check."));
    } finally {
      setChecking(null);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await warmnetApi.deleteIp(deleting.id);
      notify("IP removed.");
      setDeleting(null);
      await list.reload();
    } catch (e) {
      setActionError(errorMessage(e, "Unable to remove this IP."));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {actionError ? <ErrorBanner message={actionError} /> : null}
      {list.error ? <ErrorBanner message={list.error} onRetry={() => void list.reload()} /> : null}
      <Panel
        actions={
          <>
            <Button isDisabled={checking !== null || ips.length === 0} size="sm" variant="secondary" onClick={() => void check("all")}>
              <RefreshCw className="size-4" />
              {checking === "all" ? "Checking..." : "Check all"}
            </Button>
            <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add IP
            </Button>
          </>
        }
        description={`Checked daily at 06:30 server time against ${list.data ? list.data.blocklists.length : "several"} blocklists. Mailboxes on a listed IP stop sending until it is clean again.`}
        title="Sending IPs"
      >
        <TableCard minWidth={980}>
          <thead className={theadClass}>
            <tr>
              <th className={`${thClass} pl-4`}>IP</th>
              <th className={thClass}>Hostname</th>
              <th className={thClass}>Pool</th>
              <th className={thClass}>Domains</th>
              <th className={thClass}>Mailboxes</th>
              <th className={thClass}>Blocklists</th>
              <th className={thClass}>Last checked</th>
              <th className={`${thClass} pr-4 text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && !list.data ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow columns={8} key={i} />)
            ) : ips.length === 0 ? (
              <EmptyRow columns={8}>No sending IPs yet. Add the IPs your mail server sends from, or register domains with an IP.</EmptyRow>
            ) : (
              ips.map((ip) => (
                <tr className="border-b border-border/60 align-top last:border-0" key={ip.id}>
                  <td className={`${tdClass} pl-4 font-medium tabular-nums text-foreground`}>{ip.ip}</td>
                  <td className={tdClass}>{ip.hostname ?? "-"}</td>
                  <td className={tdClass}>{ip.poolName ?? "-"}</td>
                  <td className={`${tdClass} tabular-nums`}>{ip.domains}</td>
                  <td className={`${tdClass} tabular-nums`}>{ip.mailboxes}</td>
                  <td className={tdClass}>
                    <IpBadge clean={ip.clean} unchecked={ip.unchecked.length > 0} />
                    {ip.listings.length > 0 ? <div className="mt-1 max-w-[260px] text-[12px] text-danger">Listed on {ip.listings.join(", ")}</div> : null}
                    {ip.unchecked.length > 0 ? <div className="mt-1 max-w-[260px] text-[12px] text-muted">Could not reach: {ip.unchecked.join(", ")}</div> : null}
                  </td>
                  <td className={`${tdClass} text-[12px] text-muted`}>{fmtDateTime(ip.lastCheckedAt)}</td>
                  <td className="px-3 py-3 pr-4">
                    <div className="flex justify-end gap-1.5">
                      <Button isDisabled={checking !== null} size="sm" variant="secondary" onClick={() => void check(ip.id)}>{checking === ip.id ? "Checking..." : "Check"}</Button>
                      <Button size="sm" variant="secondary" onClick={() => setDeleting(ip)}>Remove</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TableCard>
      </Panel>

      <AdminModal
        footer={
          <>
            <Button isDisabled={busy} size="sm" variant="secondary" onClick={() => { setAddOpen(false); setFormError(null); }}>Cancel</Button>
            <Button isDisabled={busy || !form.ip.trim()} size="sm" variant="primary" onClick={() => void add()}>{busy ? "Adding..." : "Add IP"}</Button>
          </>
        }
        isOpen={addOpen}
        title="Add sending IP"
        width={480}
        onClose={() => { setAddOpen(false); setFormError(null); }}
      >
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (form.ip.trim() && !busy) void add(); }}>
          {formError ? <ErrorBanner message={formError} /> : null}
          <Field hint="IPv4 only." label="IP address">
            <input autoFocus className={inputClass} placeholder="5.161.30.62" value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} />
          </Field>
          <Field label="Hostname (optional)">
            <input className={inputClass} placeholder="mta2.kovalr.com" value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} />
          </Field>
          <Field hint="The Postal IP pool this address belongs to." label="Pool name (optional)">
            <input className={inputClass} placeholder="ip-02" value={form.poolName} onChange={(e) => setForm({ ...form, poolName: e.target.value })} />
          </Field>
          <Field label="Notes (optional)">
            <input className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      </AdminModal>

      <ConfirmDialog
        confirmLabel="Remove IP"
        description={deleting ? `Stop tracking ${deleting.ip}? Domains linked to it keep working but lose their blocklist protection.` : undefined}
        isBusy={busy}
        isOpen={deleting !== null}
        title="Remove IP"
        tone="danger"
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
