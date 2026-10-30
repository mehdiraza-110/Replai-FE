import { useEffect, useState } from "react";
import { warmnetApi, type Placement } from "../../../../services/warmnetApi";
import { Badge, Checkbox, SkeletonRows } from "../../../ui";
import { Pager } from "../../crm/shared";
import { DataTable, EmptyRow, Err, fmtDateTime, Panel, PlacementBadge, useLoad } from "./shared";

const LIMIT = 30;

export function ActivityTab() {
  const [placement, setPlacement] = useState<Placement | "">("");
  const [direction, setDirection] = useState<"to_seed" | "from_seed" | "">("");
  const [failedOnly, setFailedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const list = useLoad(() => warmnetApi.listMessages({ placement, direction, status: failedOnly ? "failed" : "", page, limit: LIMIT }), [placement, direction, failedOnly, page]);
  useEffect(() => setPage(1), [placement, direction, failedOnly]);
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const filtered = Boolean(placement || direction || failedOnly);

  return (
    <div className="sv-stack">
      <Err message={list.error} onRetry={() => void list.reload()} />
      <Panel>
        <div className="ops-bar">
          <select aria-label="Filter by where it landed" className="sv-select" value={placement} onChange={(e) => setPlacement(e.target.value as Placement | "")}>
            <option value="">Any placement</option><option value="inbox">Inbox</option><option value="spam">Spam</option><option value="unknown">Not seen yet</option><option value="other">Other folder</option>
          </select>
          <select aria-label="Filter by direction" className="sv-select" value={direction} onChange={(e) => setDirection(e.target.value as "to_seed" | "from_seed" | "")}>
            <option value="">Both directions</option><option value="to_seed">Mailbox to seed</option><option value="from_seed">Seed to mailbox</option>
          </select>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><Checkbox label="Failed sends only" checked={failedOnly} onChange={setFailedOnly} />Failed sends only</label>
        </div>
        <DataTable minWidth={960} head={<><th>When</th><th>From</th><th>To</th><th>Subject</th><th>Result</th><th>Seed activity</th></>}>
          {list.isLoading && !list.data ? <SkeletonRows columns={6} />
            : items.length === 0 ? <EmptyRow columns={6}>{filtered ? "No messages match your filters." : "No warm-up mail has been sent yet."}</EmptyRow>
            : items.map((m) => {
              const out = m.direction === "to_seed";
              return (
                <tr key={m.id}>
                  <td className="ops-muted" style={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmtDateTime(m.sentAt)}</td>
                  <td>{out ? m.mailboxEmail : m.seedEmail}</td>
                  <td>{out ? m.seedEmail : m.mailboxEmail}</td>
                  <td style={{ maxWidth: 260 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.subject ?? ""}>{m.subject}</div><p className="ops-sub">{m.kind === "reply" ? "Reply" : "First message"}</p></td>
                  <td>
                    {m.status === "failed" ? <div><Badge tone="red">Failed</Badge>{m.error ? <p className="ops-sub" style={{ color: "#e5484d", maxWidth: 240 }}>{m.error}</p> : null}</div>
                      : out ? <PlacementBadge placement={m.placement} rescued={m.rescued} />
                      : <Badge tone={m.status === "received" ? "green" : "neutral"}>{m.status === "received" ? "Received" : "Sent"}</Badge>}
                  </td>
                  <td className="ops-muted" style={{ fontSize: 12 }}>{out ? <>{m.seedReadAt ? `Read ${fmtDateTime(m.seedReadAt)}` : "Not read yet"}{m.repliedAt ? <div>Replied {fmtDateTime(m.repliedAt)}</div> : null}</> : "-"}</td>
                </tr>
              );
            })}
        </DataTable>
      </Panel>
      <Pager page={page} limit={LIMIT} total={total} totalPages={Math.max(1, Math.ceil(total / LIMIT))} onPage={setPage} />
    </div>
  );
}
