import { useEffect, useState } from "react";
import { errorMessage } from "../../../../services/adminApi";
import { warmnetApi, type MailboxAction, type WarmMailbox, type WarmState } from "../../../../services/warmnetApi";
import { Button, Checkbox, SkeletonRows } from "../../../ui";
import { Pager, SearchBox, useDebounced } from "../../crm/shared";
import { ConfirmModal } from "../domainParts";
import { DataTable, EmptyRow, Err, fmtDateTime, fmtRate, IpBadge, Panel, STATES, StateBadge, stateLabel, useLoad, type Notify } from "./shared";

const LIMIT = 25;
type Pending = { action: "pause" | "reset" | "release"; ids: number[] } | null;

export function MailboxesTab({ notify }: { notify: Notify }) {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [state, setState] = useState<WarmState | "">("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState("");
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [actionError, setActionError] = useState("");
  const list = useLoad(() => warmnetApi.listMailboxes({ state, search: debounced.trim(), page, limit: LIMIT }), [state, debounced, page]);
  useEffect(() => setPage(1), [state, debounced]);

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pageAll = items.length > 0 && items.every((m) => selected.has(m.mailboxId));
  const selectedIds = [...selected];
  const toggle = (id: number) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const togglePage = () => setSelected((prev) => { const next = new Set(prev); for (const m of items) { if (pageAll) next.delete(m.mailboxId); else next.add(m.mailboxId); } return next; });
  const closePending = () => { setPending(null); setDialogError(""); setForce(false); };

  async function apply(action: MailboxAction, ids: number[], extra: { reason?: string; force?: boolean } = {}) {
    setBusy(true); setDialogError(""); setActionError("");
    try {
      const r = await warmnetApi.mailboxAction({ ids, action, ...extra });
      const verb = { start: "Started", resume: "Resumed", pause: "Paused", reset: "Reset", release: "Released" }[action];
      notify(r.affected === 0 ? "Nothing changed: none of the selected mailboxes were in a state that allows this." : `${verb} ${r.affected} mailbox(es).`, r.affected ? "success" : "error");
      setPending(null); setReason(""); setForce(false); setSelected(new Set());
      await list.reload();
    } catch (e) {
      const message = errorMessage(e, "That did not work. Please try again.");
      if (pending) setDialogError(message); else setActionError(message);
    } finally { setBusy(false); }
  }

  const rowActions = (m: WarmMailbox) => {
    const buttons: Array<{ label: string; run: () => void }> = [];
    if (m.state === "queued") buttons.push({ label: "Start", run: () => void apply("start", [m.mailboxId]) });
    if (m.state === "paused") buttons.push({ label: "Resume", run: () => void apply("resume", [m.mailboxId]) });
    if (["warming", "ready", "released"].includes(m.state)) buttons.push({ label: "Pause", run: () => setPending({ action: "pause", ids: [m.mailboxId] }) });
    if (m.state === "ready") buttons.push({ label: "Release", run: () => setPending({ action: "release", ids: [m.mailboxId] }) });
    return buttons;
  };
  const filtered = Boolean(search || state);
  const n = pending?.ids.length ?? 0;

  return (
    <div className="sv-stack">
      <Err message={actionError} />
      <Err message={list.error} onRetry={() => void list.reload()} />
      <Panel>
        <div className="ops-bar">
          <SearchBox placeholder="Search mailboxes" value={search} onChange={setSearch} />
          <select aria-label="Filter by state" className="sv-select" value={state} onChange={(e) => setState(e.target.value as WarmState | "")}>
            <option value="">All states</option>
            {STATES.map((s) => <option key={s} value={s}>{stateLabel(s)}</option>)}
          </select>
          <span className="ops-bar-grow" />
          <span className="sv-actions">
            {selectedIds.length > 0 ? <span className="sv-hint">{selectedIds.length} selected</span> : null}
            <Button variant="primary" size="sm" disabled={!selectedIds.length || busy} onClick={() => void apply("start", selectedIds)}>Start / resume</Button>
            <Button size="sm" disabled={!selectedIds.length || busy} onClick={() => setPending({ action: "pause", ids: selectedIds })}>Pause</Button>
            <Button size="sm" disabled={!selectedIds.length || busy} onClick={() => setPending({ action: "release", ids: selectedIds })}>Release</Button>
            <Button size="sm" disabled={!selectedIds.length || busy} onClick={() => setPending({ action: "reset", ids: selectedIds })}>Reset</Button>
            {selectedIds.length > 0 ? <Button size="sm" onClick={() => setSelected(new Set())}>Clear</Button> : null}
          </span>
        </div>
        <DataTable minWidth={1100} head={<>
          <th style={{ width: 36 }}><Checkbox label="Select all mailboxes on this page" checked={pageAll} onChange={togglePage} /></th>
          <th>Mailbox</th><th>Sending IP</th><th>State</th><th>Ramp day</th><th>Today</th><th>Inbox rate, 7d</th><th>Replies, 7d</th><th className="is-right">Actions</th>
        </>}>
          {list.isLoading && !list.data ? <SkeletonRows columns={9} />
            : items.length === 0 ? <EmptyRow columns={9}>{filtered ? "No mailboxes match your filters." : "No mailboxes are enrolled yet. Register domains under Domains to create them."}</EmptyRow>
            : items.map((m) => (
              <tr key={m.mailboxId} className={selected.has(m.mailboxId) ? "ops-row-sel" : undefined}>
                <td><Checkbox label={`Select ${m.email}`} checked={selected.has(m.mailboxId)} onChange={() => toggle(m.mailboxId)} /></td>
                <td><div className="ops-strong">{m.email}</div><p className="ops-sub">{m.displayName}</p>{m.pauseReason && m.state === "paused" ? <p className="ops-sub" style={{ color: "#c77d0a", maxWidth: 280 }}>{m.pauseReason}</p> : null}</td>
                <td>{m.ip ? <div style={{ display: "grid", gap: 4, justifyItems: "start" }}><span>{m.ip}</span><IpBadge clean={m.ipClean} /></div> : <span className="ops-muted">Not linked</span>}</td>
                <td><StateBadge state={m.state} />{m.state === "ready" ? <p className="ops-sub">Since {fmtDateTime(m.readyAt)}</p> : null}</td>
                <td>{m.state === "queued" ? "-" : m.rampDay}{m.heldDays > 0 ? <p className="ops-sub">{m.heldDays} held</p> : null}</td>
                <td>{["warming", "released"].includes(m.state) ? `${m.todaySent} / ${m.todayTarget}` : "-"}</td>
                <td>{fmtRate(m.inboxRate7d)}<p className="ops-sub">{m.inbox7d} inbox, {m.spam7d} spam</p></td>
                <td>{m.replies7d}</td>
                <td className="is-right"><span className="sv-actions" style={{ justifyContent: "flex-end" }}>{rowActions(m).map((b) => <Button key={b.label} size="sm" disabled={busy} onClick={b.run}>{b.label}</Button>)}</span></td>
              </tr>
            ))}
        </DataTable>
      </Panel>
      <Pager page={page} limit={LIMIT} total={total} totalPages={Math.max(1, Math.ceil(total / LIMIT))} onPage={setPage} />

      {pending?.action === "pause" ? (
        <ConfirmModal title="Pause warm-up" confirmLabel="Pause mailboxes" busy={busy} onClose={closePending} onConfirm={() => void apply("pause", pending.ids, { reason: reason.trim() || undefined })}>
          <p style={{ margin: 0 }}>Stop sending warm-up mail from {n} mailbox(es). Their progress is kept and you can resume them.</p>
          <div className="sv-field"><label className="sv-field-label" htmlFor="pause-reason">Reason (optional)</label><input id="pause-reason" className="sv-input" maxLength={300} placeholder="For example: checking a spam spike" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <Err message={dialogError} />
        </ConfirmModal>
      ) : null}
      {pending?.action === "reset" ? (
        <ConfirmModal title="Reset warm-up" confirmLabel="Reset mailboxes" danger busy={busy} onClose={closePending} onConfirm={() => void apply("reset", pending.ids)}>
          <p style={{ margin: 0 }}>Send {n} mailbox(es) back to Queued: the ramp restarts at day 1 and warm-up stops until you start them again. Message history is kept.</p>
          <Err message={dialogError} />
        </ConfirmModal>
      ) : null}
      {pending?.action === "release" ? (
        <ConfirmModal title="Release to the normal lane" confirmLabel="Release mailboxes" busy={busy} onClose={closePending} onConfirm={() => void apply("release", pending.ids, { force })}>
          <p style={{ margin: 0 }}>Hand {n} mailbox(es) to their workspace's normal sending lane. They become Active with the workspace's first warm-up strategy, so campaigns and the old warm-up lane can use them. Warm-up continues in the background at the low maintenance volume.</p>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><input type="checkbox" className="sv-check" checked={force} onChange={(e) => setForce(e.target.checked)} style={{ marginTop: 2 }} /><span>Release even if not marked Ready. Only for mailboxes that are still warming or paused. They will not have met the readiness bar (21 days with a high inbox rate by default).</span></label>
          <Err message={dialogError} />
        </ConfirmModal>
      ) : null}
    </div>
  );
}
