import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@heroui/react";
import { ArrowLeft, Check, Copy, Eye, Plus, Trash2 } from "lucide-react";
import {
  adminApi,
  errorMessage,
  type AdminMember,
  type AdminWorkspaceDetail as Detail,
  type MemberPermissions,
  type MemberRole,
  type WorkspaceType,
} from "../../services/adminApi";
import { setViewAs } from "../../utils/viewAs";
import { AdminModal, ConfirmDialog, ErrorBanner } from "../../components/admin/AdminModal";
import { Field, StatTile, formatDate, fullName, inputClass } from "../../components/admin/AdminBits";
import { PlanCard } from "../../components/admin/PlanCard";
import { ProductToggle } from "../../components/admin/ProductToggle";
import { WorkspacePlanPill, WorkspaceStatusPill, WorkspaceTypePill } from "../../components/admin/WorkspaceStatusPill";
import { StatusPill } from "../../components/ui/StatusPill";
import { Skeleton } from "../../components/ui/Skeleton";

const PROTECTED_SLUG = "koval-group";

export function AdminWorkspaceDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Detail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        setData(await adminApi.getWorkspace(id));
      } catch (e) {
        setError(errorMessage(e, "Unable to load this workspace."));
      } finally {
        setIsLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading && !data) {
    return (
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
        <BackLink />
        <ErrorBanner message={error ?? "Workspace not found."} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
      <BackLink />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-semibold leading-7 text-foreground">{data.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <WorkspaceTypePill type={data.type} />
            <WorkspaceStatusPill status={data.status} />
            <WorkspacePlanPill workspace={data} />
            <span className="text-[12px] text-muted">{data.slug} - created {formatDate(data.created_at)}</span>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setViewAs({ id: data.id, name: data.name });
            navigate("/");
          }}
        >
          <Eye className="size-4" />
          View as
        </Button>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => void load(true)} /> : null}

      <SettingsCard data={data} onSaved={() => load(true)} />
      <PlanCard data={data} onChanged={() => load(true)} />
      <UsageCard data={data} />
      <AiProvidersCard data={data} onSaved={() => load(true)} />
      <MembersCard
        data={data}
        tempPassword={tempPassword}
        onChanged={() => load(true)}
        onTempPassword={setTempPassword}
      />
      <DangerZone data={data} onDeleted={() => navigate("/admin/workspaces")} />
    </div>
  );
}

function BackLink() {
  return (
    <Link className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-muted hover:text-foreground" to="/admin/workspaces">
      <ArrowLeft className="size-4" />
      All workspaces
    </Link>
  );
}

function Section({ title, description, children, actions }: { title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-[12px] text-muted">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function SettingsCard({ data, onSaved }: { data: Detail; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(data.name);
  const [type, setType] = useState<WorkspaceType>(data.type);
  const [status, setStatus] = useState(data.status);
  const [ar, setAr] = useState(data.auto_responder_enabled);
  const [cm, setCm] = useState(data.cold_mailer_enabled);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(data.name);
    setType(data.type);
    setStatus(data.status);
    setAr(data.auto_responder_enabled);
    setCm(data.cold_mailer_enabled);
  }, [data]);

  const dirty =
    name.trim() !== data.name ||
    type !== data.type ||
    status !== data.status ||
    ar !== data.auto_responder_enabled ||
    cm !== data.cold_mailer_enabled;

  async function save() {
    if (!name.trim()) {
      setError("Workspace name cannot be empty.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      await adminApi.updateWorkspace(data.id, {
        ...(name.trim() !== data.name ? { name: name.trim() } : {}),
        ...(type !== data.type ? { type } : {}),
        ...(status !== data.status ? { status } : {}),
        ...(ar !== data.auto_responder_enabled ? { auto_responder_enabled: ar } : {}),
        ...(cm !== data.cold_mailer_enabled ? { cold_mailer_enabled: cm } : {}),
      });
      await onSaved();
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Section
      actions={
        <Button isDisabled={!dirty || isSaving} size="sm" variant="primary" onClick={() => void save()}>
          {isSaving ? "Saving..." : saved && !dirty ? "Saved" : "Save changes"}
        </Button>
      }
      description="Changes apply to every member immediately."
      title="Settings"
    >
      <div className="grid gap-4 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Workspace type">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as WorkspaceType)}>
              <option value="organization">Organization</option>
              <option value="individual">Individual</option>
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as Detail["status"])}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ProductToggle checked={ar} description="Lets members use AI-drafted replies to inbound mail." label="Auto Responder" onChange={setAr} />
          <ProductToggle checked={cm} description="Lets members run cold email campaigns and warmup." label="Cold Mailer" onChange={setCm} />
        </div>
        {error ? <ErrorBanner message={error} /> : null}
      </div>
    </Section>
  );
}

function UsageCard({ data }: { data: Detail }) {
  const usage = data.usage ?? { emailsSent: 0, repliesReceived: 0, draftsGenerated: 0 };
  return (
    <Section description="Last 30 days" title="Usage">
      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 xl:grid-cols-7">
        <StatTile label="Emails sent" value={usage.emailsSent} />
        <StatTile label="Replies" value={usage.repliesReceived} />
        <StatTile label="Drafts" value={usage.draftsGenerated} />
        <StatTile label="Domains" value={data.counts.domains} />
        <StatTile label="Mailboxes" value={data.counts.mailboxes} />
        <StatTile label="Campaigns" value={data.counts.campaigns} />
        <StatTile label="Agents" value={data.counts.agents} />
      </div>
    </Section>
  );
}

const providerNames: Record<string, string> = { openai: "OpenAI", anthropic: "Anthropic", gemini: "Gemini" };

function AiProvidersCard({ data, onSaved }: { data: Detail; onSaved: () => Promise<void> }) {
  const providers = data.aiProviders ?? [];
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function setPlatformKeys(next: boolean) {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      await adminApi.updateWorkspace(data.id, { platform_ai_enabled: next });
      await onSaved();
      setNotice(next ? "This workspace can now use the platform's built-in AI keys." : "Built-in AI keys switched off for this workspace.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsSaving(false);
    }
  }

  const ownKeys = providers.filter((p) => p.configured && p.source !== "platform").length;

  return (
    <Section description="Which AI keys this workspace's features will use." title="AI providers">
      <div className="space-y-3 border-b border-border/60 p-4">
        <ProductToggle
          checked={data.platform_ai_enabled}
          description="On: this workspace may use the platform's own built-in AI keys whenever it has not added its own, and the platform pays for that usage. Off: it must connect its own keys under AI Keys, and AI drafting stops until it does. A workspace's own key is always used first. Changes apply immediately."
          disabled={isSaving}
          label="Use the platform's built-in AI keys"
          onChange={(next) => void setPlatformKeys(next)}
        />
        <p className="text-[12px] text-muted">
          {data.platform_ai_enabled
            ? ownKeys > 0
              ? `Using its own ${ownKeys === 1 ? "key" : "keys"} where connected, the built-in keys for the rest.`
              : "No own keys connected: every AI request uses the built-in keys and is paid for by the platform."
            : ownKeys > 0
              ? "Using only its own connected keys."
              : "No AI is available to this workspace yet: it has no own key and built-in keys are off."}
        </p>
        {error ? <ErrorBanner message={error} /> : null}
        {notice ? <p className="rounded-xl border border-success/20 bg-success/10 px-3 py-2 text-[13px] text-success" role="status">{notice}</p> : null}
      </div>
      {providers.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">No provider information available.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {providers.map((p) => (
            <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" key={p.provider}>
              <div>
                <p className="text-sm font-medium text-foreground">{providerNames[p.provider] ?? p.provider}</p>
                <p className="text-[12px] text-muted">
                  {p.configured ? (p.preview ? `Key ${p.preview}` : "Key on file") : "No key"}
                  {p.updated_at ? ` - updated ${formatDate(p.updated_at)}` : ""}
                </p>
              </div>
              {p.configured && p.source !== "platform" ? (
                <StatusPill tone="success">Own key</StatusPill>
              ) : p.source === "platform" ? (
                <StatusPill tone="accent">Built-in key</StatusPill>
              ) : (
                <StatusPill tone="warning">Not connected</StatusPill>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function MembersCard({
  data,
  tempPassword,
  onChanged,
  onTempPassword,
}: {
  data: Detail;
  tempPassword: { email: string; password: string } | null;
  onChanged: () => Promise<void>;
  onTempPassword: (v: { email: string; password: string } | null) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMember | null>(null);
  const [removing, setRemoving] = useState<AdminMember | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function remove() {
    if (!removing) return;
    setIsBusy(true);
    setRemoveError(null);
    try {
      await adminApi.removeMember(data.id, removing.user_id);
      setRemoving(null);
      await onChanged();
    } catch (e) {
      setRemoveError(errorMessage(e));
    } finally {
      setIsBusy(false);
    }
  }

  async function copy() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword.password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable; the password is visible to copy by hand */
    }
  }

  return (
    <Section
      actions={
        <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add member
        </Button>
      }
      description={`${data.members.length} ${data.members.length === 1 ? "member" : "members"}`}
      title="Members"
    >
      {tempPassword ? (
        <div className="m-4 rounded-xl border border-warning/30 bg-warning/10 p-4" role="status">
          <p className="text-sm font-medium text-foreground">Temporary password for {tempPassword.email}</p>
          <p className="mt-1 text-[12px] text-muted">This is shown only once. Share it securely; they should change it after signing in.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm text-foreground">{tempPassword.password}</code>
            <Button size="sm" variant="secondary" onClick={() => void copy()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onTempPassword(null)}>Dismiss</Button>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-2 py-3 font-medium">Role</th>
              <th className="px-2 py-3 font-medium">Access</th>
              <th className="px-2 py-3 font-medium">Added</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.members.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={5}>No members yet.</td>
              </tr>
            ) : (
              data.members.map((m) => (
                <tr className="border-b border-border/60 last:border-0" key={m.user_id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{fullName(m.first_name, m.last_name) || m.email}</p>
                    {fullName(m.first_name, m.last_name) ? <p className="text-[12px] text-muted">{m.email}</p> : null}
                  </td>
                  <td className="px-2 py-3">
                    <StatusPill tone={m.role === "owner" ? "accent" : m.role === "admin" ? "success" : "default"}>{m.role}</StatusPill>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.role !== "member" ? (
                        <StatusPill tone="default">All enabled products</StatusPill>
                      ) : (
                        <>
                          <StatusPill tone={m.permissions?.auto_responder ? "success" : "default"}>Auto Responder</StatusPill>
                          <StatusPill tone={m.permissions?.cold_mailer ? "success" : "default"}>Cold Mailer</StatusPill>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-muted">{formatDate(m.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(m)}>Edit</Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setRemoveError(null);
                          setRemoving(m);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddMemberModal
        data={data}
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={async (email, password) => {
          setAddOpen(false);
          onTempPassword(password ? { email, password } : null);
          await onChanged();
        }}
      />
      <EditMemberModal
        data={data}
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await onChanged();
        }}
      />
      <ConfirmDialog
        confirmLabel="Remove member"
        description={`Remove ${removing?.email} from ${data.name}? They will lose access to this workspace.`}
        error={removeError}
        isBusy={isBusy}
        isOpen={removing !== null}
        title="Remove member?"
        tone="danger"
        onClose={() => setRemoving(null)}
        onConfirm={() => void remove()}
      />
    </Section>
  );
}

function PermissionChecks({
  value,
  onChange,
  data,
}: {
  value: MemberPermissions;
  onChange: (v: MemberPermissions) => void;
  data: Detail;
}) {
  const items: Array<[keyof MemberPermissions, string, boolean]> = [
    ["auto_responder", "Auto Responder", data.auto_responder_enabled],
    ["cold_mailer", "Cold Mailer", data.cold_mailer_enabled],
  ];
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium text-foreground">Product permissions</legend>
      {items.map(([key, label, enabled]) => (
        <label className="flex items-center gap-2 text-sm text-foreground" key={key}>
          <input
            checked={value[key]}
            className="size-4 accent-[var(--accent)]"
            disabled={!enabled}
            type="checkbox"
            onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
          />
          {label}
          {!enabled ? <span className="text-[12px] text-muted">(not enabled for this workspace)</span> : null}
        </label>
      ))}
    </fieldset>
  );
}

function AddMemberModal({
  data,
  isOpen,
  onClose,
  onAdded,
}: {
  data: Detail;
  isOpen: boolean;
  onClose: () => void;
  onAdded: (email: string, temporaryPassword?: string) => Promise<void>;
}) {
  const defaults = useMemo<MemberPermissions>(
    () => ({ auto_responder: data.auto_responder_enabled, cold_mailer: data.cold_mailer_enabled }),
    [data.auto_responder_enabled, data.cold_mailer_enabled],
  );
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [permissions, setPermissions] = useState(defaults);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setRole("member");
      setPermissions(defaults);
      setFirstName("");
      setLastName("");
      setPassword("");
      setEmailError(null);
      setServerError(null);
    }
  }, [isOpen, defaults]);

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      setServerError(null);
      return;
    }
    setEmailError(null);
    setIsBusy(true);
    setServerError(null);
    try {
      const result = await adminApi.addMember(data.id, {
        email: email.trim(),
        role,
        permissions,
        ...(firstName.trim() ? { first_name: firstName.trim() } : {}),
        ...(lastName.trim() ? { last_name: lastName.trim() } : {}),
        ...(password ? { password } : {}),
      });
      await onAdded(email.trim(), result.temporaryPassword);
    } catch (e) {
      setServerError(errorMessage(e));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AdminModal
      description="Existing accounts are added directly. For a new email, an account is created."
      footer={
        <>
          <Button isDisabled={isBusy} size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button isDisabled={isBusy} size="sm" variant="primary" onClick={() => void submit()}>{isBusy ? "Adding..." : "Add member"}</Button>
        </>
      }
      isOpen={isOpen}
      title="Add member"
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field error={emailError} label="Email">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Role">
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as "admin" | "member")}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <PermissionChecks data={data} value={permissions} onChange={setPermissions} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name (new accounts)">
            <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Last name (new accounts)">
            <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>
        <Field hint="Leave blank to generate a temporary password." label="Password (new accounts)">
          <input autoComplete="new-password" className={inputClass} type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {serverError ? <ErrorBanner message={serverError} /> : null}
      </form>
    </AdminModal>
  );
}

function EditMemberModal({
  data,
  member,
  onClose,
  onSaved,
}: {
  data: Detail;
  member: AdminMember | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [role, setRole] = useState<MemberRole>("member");
  const [permissions, setPermissions] = useState<MemberPermissions>({ auto_responder: false, cold_mailer: false });
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (member) {
      setRole(member.role);
      setPermissions(member.permissions ?? { auto_responder: false, cold_mailer: false });
      setError(null);
    }
  }, [member]);

  async function submit() {
    if (!member) return;
    setIsBusy(true);
    setError(null);
    try {
      await adminApi.updateMember(data.id, member.user_id, {
        ...(role !== member.role ? { role } : {}),
        permissions,
      });
      await onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AdminModal
      description={member?.email}
      footer={
        <>
          <Button isDisabled={isBusy} size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button isDisabled={isBusy} size="sm" variant="primary" onClick={() => void submit()}>{isBusy ? "Saving..." : "Save"}</Button>
        </>
      }
      isOpen={member !== null}
      title="Edit member"
      onClose={onClose}
    >
      <div className="grid gap-4">
        <Field label="Role">
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
        </Field>
        <PermissionChecks data={data} value={permissions} onChange={setPermissions} />
        {error ? <ErrorBanner message={error} /> : null}
      </div>
    </AdminModal>
  );
}

function DangerZone({ data, onDeleted }: { data: Detail; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isProtected = data.slug === PROTECTED_SLUG;

  async function remove() {
    setIsBusy(true);
    setError(null);
    try {
      await adminApi.deleteWorkspace(data.id);
      onDeleted();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-danger/30 bg-surface">
      <div className="border-b border-danger/20 px-4 py-3">
        <h2 className="text-[15px] font-semibold text-danger">Danger zone</h2>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-foreground">Delete this workspace</p>
          <p className="mt-0.5 text-[12px] leading-5 text-muted">
            The workspace is hidden from everyone and its members lose access. {isProtected ? "This workspace is protected and cannot be deleted." : ""}
          </p>
        </div>
        <Button
          isDisabled={isProtected}
          size="sm"
          variant="danger"
          onClick={() => {
            setTyped("");
            setError(null);
            setOpen(true);
          }}
        >
          <Trash2 className="size-4" />
          Delete workspace
        </Button>
      </div>
      <ConfirmDialog
        confirmLabel="Delete workspace"
        description={`Type ${data.name} to confirm deleting this workspace.`}
        error={error}
        isBusy={isBusy}
        isConfirmDisabled={typed !== data.name}
        isOpen={open}
        title="Delete workspace?"
        tone="danger"
        onClose={() => setOpen(false)}
        onConfirm={() => void remove()}
      >
        <input
          aria-label="Workspace name"
          className={`${inputClass} mt-3`}
          placeholder={data.name}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </ConfirmDialog>
    </section>
  );
}

