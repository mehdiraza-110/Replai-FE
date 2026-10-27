import { useEffect, useState } from "react";
import { warmnetApi, type Placement } from "../../../services/warmnetApi";
import { ErrorBanner } from "../AdminModal";
import { Pagination, inputClass } from "../AdminBits";
import { StatusPill } from "../../ui/StatusPill";
import { SkeletonRow } from "../../ui/Skeleton";
import { EmptyRow, Panel, PlacementBadge, TableCard, fmtDateTime, tdClass, thClass, theadClass, useLoad } from "./Bits";

const LIMIT = 30;

export function ActivityTab() {
  const [placement, setPlacement] = useState<Placement | "">("");
  const [direction, setDirection] = useState<"to_seed" | "from_seed" | "">("");
  const [failedOnly, setFailedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const list = useLoad(
    () => warmnetApi.listMessages({ placement, direction, status: failedOnly ? "failed" : "", page, limit: LIMIT }),
    [placement, direction, failedOnly, page]
  );
  useEffect(() => setPage(1), [placement, direction, failedOnly]);

  const items = list.data?.items ?? [];
  const filtered = Boolean(placement || direction || failedOnly);

  return (
    <div className="flex flex-col gap-4">
      {list.error ? <ErrorBanner message={list.error} onRetry={() => void list.reload()} /> : null}
      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 px-4 py-3">
          <select aria-label="Filter by where it landed" className={`${inputClass} w-auto`} value={placement} onChange={(e) => setPlacement(e.target.value as Placement | "")}>
            <option value="">Any placement</option>
            <option value="inbox">Inbox</option>
            <option value="spam">Spam</option>
            <option value="unknown">Not seen yet</option>
            <option value="other">Other folder</option>
          </select>
          <select aria-label="Filter by direction" className={`${inputClass} w-auto`} value={direction} onChange={(e) => setDirection(e.target.value as "to_seed" | "from_seed" | "")}>
            <option value="">Both directions</option>
            <option value="to_seed">Mailbox to seed</option>
            <option value="from_seed">Seed to mailbox</option>
          </select>
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input checked={failedOnly} className="size-4" type="checkbox" onChange={(e) => setFailedOnly(e.target.checked)} />
            Failed sends only
          </label>
        </div>
        <TableCard minWidth={980}>
          <thead className={theadClass}>
            <tr>
              <th className={`${thClass} pl-4`}>When</th>
              <th className={thClass}>From</th>
              <th className={thClass}>To</th>
              <th className={thClass}>Subject</th>
              <th className={thClass}>Result</th>
              <th className={thClass}>Seed activity</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && !list.data ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow columns={6} key={i} />)
            ) : items.length === 0 ? (
              <EmptyRow columns={6}>{filtered ? "No messages match your filters." : "No warm-up mail has been sent yet."}</EmptyRow>
            ) : (
              items.map((m) => {
                const out = m.direction === "to_seed";
                return (
                  <tr className="border-b border-border/60 align-top last:border-0" key={m.id}>
                    <td className={`${tdClass} whitespace-nowrap pl-4 text-[12px] text-muted`}>{fmtDateTime(m.sentAt)}</td>
                    <td className={tdClass}>{out ? m.mailboxEmail : m.seedEmail}</td>
                    <td className={tdClass}>{out ? m.seedEmail : m.mailboxEmail}</td>
                    <td className={`${tdClass} max-w-[260px]`}>
                      <div className="truncate text-foreground" title={m.subject ?? ""}>{m.subject}</div>
                      <div className="text-[12px] text-muted">{m.kind === "reply" ? "Reply" : "First message"}</div>
                    </td>
                    <td className={tdClass}>
                      {m.status === "failed" ? (
                        <div>
                          <StatusPill tone="danger">Failed</StatusPill>
                          {m.error ? <div className="mt-1 max-w-[240px] text-[12px] text-danger">{m.error}</div> : null}
                        </div>
                      ) : out ? (
                        <PlacementBadge placement={m.placement} rescued={m.rescued} />
                      ) : (
                        <StatusPill tone={m.status === "received" ? "success" : "default"}>{m.status === "received" ? "Received" : "Sent"}</StatusPill>
                      )}
                    </td>
                    <td className={`${tdClass} text-[12px] text-muted`}>
                      {out ? (
                        <>
                          {m.seedReadAt ? `Read ${fmtDateTime(m.seedReadAt)}` : "Not read yet"}
                          {m.repliedAt ? <div>Replied {fmtDateTime(m.repliedAt)}</div> : null}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableCard>
        <Pagination limit={LIMIT} page={page} total={list.data?.total ?? 0} onPage={setPage} />
      </Panel>
    </div>
  );
}
