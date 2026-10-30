import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, ShieldCheck, ShieldOff, UserCheck, UserX } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { adminApi, type AdminUser } from "../../../services/adminApi";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, Button, PageHeader, SkeletonRows } from "../../ui";
import { Banner, Pager, SearchBox, TableCard, useDebounced, useRemote } from "../crm/shared";
import { Confirm, dateText, fullName, useViewAsAction } from "./shared";

const LIMIT = 20;
type Pending = { user: AdminUser; kind: "admin" | "active" };

export function AdminUsers() {
  useSvTitle([{ label: "Admin" }, { label: "Users" }]);
  const { user: me } = useAuth();
  const viewAs = useViewAsAction();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => setPage(1), [debounced]);
  const list = useRemote(() => adminApi.listUsers({ search: debounced.trim(), page, limit: LIMIT }), [debounced, page]);
  const data = list.data;

  const label = pending ? fullName(pending.user.first_name, pending.user.last_name) || pending.user.email : "";
  const copy = (() => {
    if (!pending) return { title: "", text: "", cta: "", danger: false };
    if (pending.kind === "admin") {
      return pending.user.is_super_admin
        ? { title: "Remove super admin?", text: `${label} will lose access to the admin pages.`, cta: "Remove super admin", danger: true }
        : { title: "Make super admin?", text: `${label} will be able to manage every workspace and user on the platform.`, cta: "Make super admin", danger: false };
    }
    return pending.user.is_deleted
      ? { title: "Reactivate user?", text: `${label} will be able to sign in again.`, cta: "Reactivate", danger: false }
      : { title: "Deactivate user?", text: `${label} will no longer be able to sign in.`, cta: "Deactivate", danger: true };
  })();

  return (
    <div className="sv-page">
      <PageHeader title="Users" subtitle="Every account on the platform and the workspaces they belong to. Use the eye next to a workspace to work inside it." />
      <Banner error={list.error} />
      <div className="adm-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search by name or email" /></div>
      <TableCard
        head={<><th>User</th><th>Workspaces</th><th>Flags</th><th>Joined</th><th style={{ width: 300 }} /></>}
        empty={data && data.items.length === 0 ? (search ? "No users match your search." : "No users yet.") : undefined}
      >
        {!data && !list.error ? <SkeletonRows columns={5} /> : null}
        {data?.items.map((u) => {
          const isSelf = me?.id === u.id;
          const name = fullName(u.first_name, u.last_name);
          return (
            <tr key={u.id} style={u.is_deleted ? { opacity: 0.7 } : undefined}>
              <td><div style={{ fontWeight: 500 }}>{name || u.email}</div>{name ? <div className="sv-hint">{u.email}</div> : null}</td>
              <td>
                {u.workspaces.length === 0 ? <span className="sv-hint">None</span> : (
                  <div className="adm-chips">
                    {u.workspaces.map((w) => (
                      <span className="adm-chip" key={w.id}>
                        <Link to={svPath(`admin/workspaces/${w.id}`)}>{w.name}</Link><span className="adm-role">{w.role}</span>
                        <button type="button" aria-label={`View as ${w.name}`} title={`View as ${w.name}`} onClick={() => viewAs(w)}><Eye className="sv-icon" style={{ width: 14, height: 14 }} aria-hidden /></button>
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td><div className="adm-chips">{u.is_super_admin ? <Badge tone="blue">Super admin</Badge> : null}{u.is_deleted ? <Badge tone="red">Deactivated</Badge> : null}{isSelf ? <Badge>You</Badge> : null}</div></td>
              <td>{dateText(u.created_at)}</td>
              <td>
                <div className="sv-actions" style={{ justifyContent: "flex-end" }}>
                  <Button size="sm" icon={u.is_super_admin ? ShieldOff : ShieldCheck} disabled={isSelf && u.is_super_admin} title={isSelf && u.is_super_admin ? "You cannot change your own account here." : undefined} onClick={() => setPending({ user: u, kind: "admin" })}>{u.is_super_admin ? "Remove super admin" : "Make super admin"}</Button>
                  <Button size="sm" icon={u.is_deleted ? UserCheck : UserX} disabled={isSelf && !u.is_deleted} title={isSelf && !u.is_deleted ? "You cannot change your own account here." : undefined} onClick={() => setPending({ user: u, kind: "active" })}>{u.is_deleted ? "Reactivate" : "Deactivate"}</Button>
                </div>
              </td>
            </tr>
          );
        })}
      </TableCard>
      {data ? <Pager page={page} limit={LIMIT} total={data.total} totalPages={Math.max(1, Math.ceil(data.total / LIMIT))} onPage={setPage} /> : null}

      {pending ? (
        <Confirm
          title={copy.title} body={copy.text} confirmLabel={copy.cta} danger={copy.danger}
          onClose={() => setPending(null)}
          onConfirm={async () => {
            await adminApi.updateUser(pending.user.id, pending.kind === "admin" ? { is_super_admin: !pending.user.is_super_admin } : { is_deleted: !pending.user.is_deleted });
            setPending(null); list.reload();
          }}
        />
      ) : null}
    </div>
  );
}
