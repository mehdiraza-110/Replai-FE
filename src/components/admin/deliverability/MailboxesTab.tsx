import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { errorMessage } from "../../../services/adminApi";
import { warmnetApi, type MailboxAction, type WarmMailbox, type WarmState } from "../../../services/warmnetApi";
import { ConfirmDialog, ErrorBanner } from "../AdminModal";
import { Field, Pagination, SearchBox, inputClass, useDebounced } from "../AdminBits";
import { SkeletonRow } from "../../ui/Skeleton";
import { EmptyRow, IpBadge, Panel, STATES, StateBadge, TableCard, fmtDateTime, fmtRate, stateLabel, tdClass, thClass, theadClass, useLoad, type Notify } from "./Bits";

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
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = useLoad(() => warmnetApi.listMailboxes({ state, search: debounced.trim(), page, limit: LIMIT }), [state, debounced, page]);

  useEffect(() => setPage(1), [state, debounced]);

  const items = list.data?.items ?? [];
  const pageAll = items.length > 0 && items.every((m) => selected.has(m.mailboxId));
  const selectedIds = [...selected];

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of items) {
        if (pageAll) next.delete(m.mailboxId);
        else next.add(m.mailboxId);
      }
      return next;
    });
  }

  async function apply(action: MailboxAction, ids: number[], extra: { reason?: string; force?: boolean } = {}) {
    setBusy(true);
    setDialogError(null);
    setActionError(null);
    try {
      const r = await warmnetApi.mailboxAction({ ids, action, ...extra });
      const verb = { start: "Started", resume: "Resumed", pause: "Paused", reset: "Reset", release: "Released" }[action];
      notify(r.affected === 0 ? "Nothing changed: none of the selected mailboxes were in a state that allows this." : `${verb} ${r.affected} mailbox(es).`, r.affected ? "success" : "error");
      setPending(null);
      setReason("");
      setForce(false);
      setSelected(new Set());
      await list.reload();
    } catch (e) {
      const message = errorMessage(e, "That did not work. Please try again.");
      if (pending) setDialogError(message);
      else setActionError(message);
    } finally {
      setBusy(false);
    }
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

  return (
    <div className="flex flex-col gap-4">
      {actionError ? <ErrorBanner message={actionError} /> : null}
      {list.error ? <ErrorBanner message={list.error} onRetry={() => void list.reload()} /> : null}

      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 px-4 py-3">
          <SearchBox placeholder="Search mailboxes" value={search} onChange={setSearch} />
          <select aria-label="Filter by state" className={`${inputClass} w-auto`} value={state} onChange={(e) => setState(e.target.value as WarmState | "")}>
            <option value="">All states</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{stateLabel(s)}</option>
            ))}
          </select>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 ? <span className="text-[12px] text-muted">{selectedIds.length} selected</span> : null}
            <Button isDisabled={!selectedIds.length || busy} size="sm" variant="primary" onClick={() => void apply("start", selectedIds)}>Start / resume</Button>
            <Button isDisabled={!selectedIds.length || busy} size="sm" variant="secondary" onClick={() => setPending({ action: "pause", ids: selectedIds })}>Pause</Button>
            <Button isDisabled={!selectedIds.length || busy} size="sm" variant="secondary" onClick={() => setPending({ action: "release", ids: selectedIds })}>Release</Button>
            <Button isDisabled={!selectedIds.length || busy} size="sm" variant="secondary" onClick={() => setPending({ action: "reset", ids: selectedIds })}>Reset</Button>
            {selectedIds.length > 0 ? <Button size="sm" variant="secondary" onClick={() => setSelected(new Set())}>Clear</Button> : null}
          </div>
        </div>

        <TableCard minWidth={1100}>
          <thead className={theadClass}>
            <tr>
              <th className="w-10 px-4 py-3">
                <input aria-label="Select all mailboxes on this page" checked={pageAll} className="size-4" type="checkbox" onChange={togglePage} />
              </th>
              <th className={thClass}>Mailbox</th>
              <th className={thClass}>Sending IP</th>
              <th className={thClass}>State</th>
              <th className={thClass}>Ramp day</th>
              <th className={thClass}>Today</th>
              <th className={thClass}>Inbox rate, 7d</th>
              <th className={thClass}>Replies, 7d</th>
              <th className={`${thClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && !list.data ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow columns={9} key={i} />)
            ) : items.length === 0 ? (
              <EmptyRow columns={9}>{filtered ? "No mailboxes match your filters." : "No mailboxes are enrolled yet. Register domains under Domains to create them."}</EmptyRow>
            ) : (
              items.map((m) => (
                <tr className={`border-b border-border/60 align-top last:border-0 ${selected.has(m.mailboxId) ? "bg-accent/5" : ""}`} key={m.mailboxId}>
                  <td className="px-4 py-3">
                    <input aria-label={`Select ${m.email}`} checked={selected.has(m.mailboxId)} className="size-4" type="checkbox" onChange={() => toggle(m.mailboxId)} />
                  </td>
                  <td className={tdClass}>
                    <div className="font-medium text-foreground">{m.email}</div>
                    <div className="text-[12px] text-muted">{m.displayName}</div>
                    {m.pauseReason && m.state === "paused" ? <div className="mt-1 max-w-[280px] text-[12px] text-warning">{m.pauseReason}</div> : null}
                  </td>
                  <td className={tdClass}>
                    {m.ip ? (
                      <div className="flex flex-col items-start gap-1">
                        <span className="tabular-nums">{m.ip}</span>
                        <IpBadge clean={m.ipClean} />
                      </div>
                    ) : (
                      <span className="text-muted">Not linked</span>
                    )}
                  </td>
                  <td className={tdClass}>
                    <StateBadge state={m.state} />
                    {m.state === "ready" ? <div className="mt-1 text-[12px] text-muted">Since {fmtDateTime(m.readyAt)}</div> : null}
                  </td>
                  <td className={`${tdClass} tabular-nums`}>
                    {m.state === "queued" ? "-" : m.rampDay}
                    {m.heldDays > 0 ? <div className="text-[12px] text-muted">{m.heldDays} held</div> : null}
                  </td>
                  <td className={`${tdClass} tabular-nums`}>{["warming", "released"].includes(m.state) ? `${m.todaySent} / ${m.todayTarget}` : "-"}</td>
                  <td className={`${tdClass} tabular-nums`}>
                    {fmtRate(m.inboxRate7d)}
                    <div className="text-[12px] text-muted">{m.inbox7d} inbox, {m.spam7d} spam</div>
                  </td>
                  <td className={`${tdClass} tabular-nums`}>{m.replies7d}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1.5">
                      {rowActions(m).map((b) => (
                        <Button isDisabled={busy} key={b.label} size="sm" variant="secondary" onClick={b.run}>{b.label}</Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TableCard>
        <Pagination limit={LIMIT} page={page} total={list.data?.total ?? 0} onPage={setPage} />
      </Panel>

      <ConfirmDialog
        confirmLabel="Pause mailboxes"
        description={`Stop sending warm-up mail from ${pending?.ids.length ?? 0} mailbox(es). Their progress is kept and you can resume them.`}
        error={dialogError}
        isBusy={busy}
        isOpen={pending?.action === "pause"}
        title="Pause warm-up"
        onClose={() => { setPending(null); setDialogError(null); }}
        onConfirm={() => pending && void apply("pause", pending.ids, { reason: reason.trim() || undefined })}
      >
        <div className="mt-3">
          <Field label="Reason (optional)">
            <input className={inputClass} maxLength={300} placeholder="For example: checking a spam spike" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        confirmLabel="Reset mailboxes"
        description={`Send ${pending?.ids.length ?? 0} mailbox(es) back to Queued: the ramp restarts at day 1 and warm-up stops until you start them again. Message history is kept.`}
        error={dialogError}
        isBusy={busy}
        isOpen={pending?.action === "reset"}
        title="Reset warm-up"
        tone="danger"
        onClose={() => { setPending(null); setDialogError(null); }}
        onConfirm={() => pending && void apply("reset", pending.ids)}
      />

      <ConfirmDialog
        confirmLabel="Release mailboxes"
        description={`Hand ${pending?.ids.length ?? 0} mailbox(es) to their workspace's normal sending lane. They become Active with the workspace's first warm-up strategy, so campaigns and the old warm-up lane can use them. Warm-up continues in the background at the low maintenance volume.`}
        error={dialogError}
        isBusy={busy}
        isOpen={pending?.action === "release"}
        title="Release to the normal lane"
        onClose={() => { setPending(null); setDialogError(null); setForce(false); }}
        onConfirm={() => pending && void apply("release", pending.ids, { force })}
      >
        <label className="mt-3 flex items-start gap-2 text-[13px] text-foreground">
          <input checked={force} className="mt-0.5 size-4" type="checkbox" onChange={(e) => setForce(e.target.checked)} />
          <span>
            Release even if not marked Ready. Only for mailboxes that are still warming or paused. They will not have met the readiness bar (21 days with a high inbox rate by default).
          </span>
        </label>
      </ConfirmDialog>
    </div>
  );
}
