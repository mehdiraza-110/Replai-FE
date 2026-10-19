import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@heroui/react";
import type { useOverlayState } from "@heroui/react";
import { Check, Copy, Trash2, UserPlus } from "lucide-react";
import { memberDisplayName, teamApi } from "../../services/teamApi";
import type { Member, MemberPermissions, WorkspaceDetail } from "../../services/teamApi";
import { ModalShell, PermissionToggle, fieldClass, roleLabels } from "./shared";

type OverlayState = ReturnType<typeof useOverlayState>;

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function Field({ children, hint, label }: { children: React.ReactNode; hint?: string; label: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      {children}
      {hint ? <span className="text-[12px] font-normal leading-5 text-muted">{hint}</span> : null}
    </label>
  );
}

function PermissionFields({
  onChange,
  value,
  workspace,
}: {
  onChange: (value: MemberPermissions) => void;
  value: MemberPermissions;
  workspace: WorkspaceDetail;
}) {
  return (
    <div className="grid gap-2">
      <PermissionToggle
        checked={value.auto_responder}
        disabled={!workspace.auto_responder_enabled}
        hint={workspace.auto_responder_enabled ? undefined : "Not enabled for this workspace."}
        label="Auto Responder"
        onChange={(checked) => onChange({ ...value, auto_responder: checked })}
      />
      <PermissionToggle
        checked={value.cold_mailer}
        disabled={!workspace.cold_mailer_enabled}
        hint={workspace.cold_mailer_enabled ? undefined : "Not enabled for this workspace."}
        label="Cold Mailer"
        onChange={(checked) => onChange({ ...value, cold_mailer: checked })}
      />
    </div>
  );
}

function CopyBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 select-all break-all rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground">{value}</code>
      <Button size="sm" variant="secondary" onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function AddMemberModal({
  onAdded,
  state,
  workspace,
}: {
  onAdded: () => void;
  state: OverlayState;
  workspace: WorkspaceDetail;
}) {
  const initialPermissions = (): MemberPermissions => ({
    auto_responder: workspace.auto_responder_enabled,
    cold_mailer: workspace.cold_mailer_enabled,
  });
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [permissions, setPermissions] = useState<MemberPermissions>(initialPermissions);
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ member: Member; temporaryPassword?: string } | null>(null);

  const isOpen = state.isOpen;
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("member");
      setPermissions({ auto_responder: workspace.auto_responder_enabled, cold_mailer: workspace.cold_mailer_enabled });
      setPassword("");
      setError(null);
      setResult(null);
    }
  }, [isOpen, workspace.auto_responder_enabled, workspace.cold_mailer_enabled]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Enter the email address of the person you want to add.");
      return;
    }
    if (password && password.length < 8) {
      setError("A password must be at least 8 characters, or leave it blank to generate one.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const data = await teamApi.addMember({
        email: email.trim(),
        role,
        permissions: {
          auto_responder: workspace.auto_responder_enabled && permissions.auto_responder,
          cold_mailer: workspace.cold_mailer_enabled && permissions.cold_mailer,
        },
        ...(firstName.trim() ? { first_name: firstName.trim() } : {}),
        ...(lastName.trim() ? { last_name: lastName.trim() } : {}),
        ...(password ? { password } : {}),
      });
      setResult(data);
      onAdded();
    } catch (requestError) {
      setError(errorText(requestError, "Unable to add this member."));
    } finally {
      setIsSaving(false);
    }
  }

  if (result) {
    return (
      <ModalShell
        footer={<Button size="sm" onClick={state.close}>Done</Button>}
        state={state}
        subtitle={result.temporaryPassword ? "A new account was created." : undefined}
        title="Member added"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-foreground">
            <span className="font-semibold">{memberDisplayName(result.member)}</span> was added to {workspace.name} as {roleLabels[result.member.role]}.
            {result.temporaryPassword ? "" : " They already had an account, so they can sign in with their existing password."}
          </p>
          {result.temporaryPassword ? (
            <div className="space-y-2 rounded-2xl border border-warning/40 bg-warning/10 p-4">
              <p className="text-sm font-semibold text-foreground">Temporary password</p>
              <p className="text-[13px] leading-5 text-muted">Share this with them. It won't be shown again, so copy it before closing this window.</p>
              <CopyBox value={result.temporaryPassword} />
            </div>
          ) : null}
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      footer={
        <>
          <Button isDisabled={isSaving} size="sm" variant="secondary" onClick={state.close}>Cancel</Button>
          <Button isDisabled={isSaving} size="sm" onClick={() => void submit({ preventDefault() {} } as FormEvent)}>
            <UserPlus className="size-4" />
            {isSaving ? "Adding..." : "Add member"}
          </Button>
        </>
      }
      state={state}
      subtitle="If the person already has an account they are added right away. Otherwise an account is created for them."
      title="Add member"
    >
      <form className="grid gap-4" onSubmit={submit}>
        {error ? <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p> : null}
        <Field label="Email">
          <input autoComplete="off" className={fieldClass} onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name (optional)">
            <input className={fieldClass} onChange={(event) => setFirstName(event.target.value)} value={firstName} />
          </Field>
          <Field label="Last name (optional)">
            <input className={fieldClass} onChange={(event) => setLastName(event.target.value)} value={lastName} />
          </Field>
        </div>
        <Field label="Role">
          <select className={fieldClass} onChange={(event) => setRole(event.target.value as "admin" | "member")} value={role}>
            <option value="member">Member</option>
            {workspace.role === "owner" ? <option value="admin">Admin</option> : null}
          </select>
        </Field>
        <div className="grid gap-1.5">
          <p className="text-sm font-medium text-foreground">Product access</p>
          <PermissionFields onChange={setPermissions} value={permissions} workspace={workspace} />
          {role === "admin" ? <p className="text-[12px] leading-5 text-muted">Admins can use every product the workspace has enabled.</p> : null}
        </div>
        <Field hint="Leave blank to generate a temporary password. Ignored if the person already has an account." label="Password (optional)">
          <input autoComplete="new-password" className={fieldClass} onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
        </Field>
        <button className="hidden" type="submit" />
      </form>
    </ModalShell>
  );
}

export function EditMemberModal({
  member,
  onSaved,
  state,
  workspace,
}: {
  member: Member | null;
  onSaved: () => void;
  state: OverlayState;
  workspace: WorkspaceDetail;
}) {
  const [role, setRole] = useState<"owner" | "admin" | "member">("member");
  const [permissions, setPermissions] = useState<MemberPermissions>({ auto_responder: false, cold_mailer: false });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = member?.user_id;
  useEffect(() => {
    if (member) {
      setRole(member.role);
      setPermissions({ auto_responder: Boolean(member.permissions?.auto_responder), cold_mailer: Boolean(member.permissions?.cold_mailer) });
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, state.isOpen]);

  async function save() {
    if (!member) return;
    setIsSaving(true);
    setError(null);
    try {
      await teamApi.updateMember(member.user_id, {
        ...(role !== member.role ? { role } : {}),
        permissions,
      });
      onSaved();
      state.close();
    } catch (requestError) {
      setError(errorText(requestError, "Unable to update this member."));
    } finally {
      setIsSaving(false);
    }
  }

  const isOwnerActor = workspace.role === "owner";

  return (
    <ModalShell
      footer={
        <>
          <Button isDisabled={isSaving} size="sm" variant="secondary" onClick={state.close}>Cancel</Button>
          <Button isDisabled={isSaving} size="sm" onClick={() => void save()}>
            <Check className="size-4" />
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </>
      }
      state={state}
      subtitle={member ? `${memberDisplayName(member)} · ${member.email}` : undefined}
      title="Edit member"
    >
      <div className="grid gap-4">
        {error ? <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p> : null}
        <Field label="Role">
          <select className={fieldClass} disabled={!isOwnerActor} onChange={(event) => setRole(event.target.value as "owner" | "admin" | "member")} value={role}>
            {member?.role === "owner" ? <option value="owner">Owner</option> : null}
            {isOwnerActor ? <option value="admin">Admin</option> : null}
            <option value="member">Member</option>
          </select>
        </Field>
        <div className="grid gap-1.5">
          <p className="text-sm font-medium text-foreground">Product access</p>
          <PermissionFields onChange={setPermissions} value={permissions} workspace={workspace} />
        </div>
      </div>
    </ModalShell>
  );
}

export function RemoveMemberModal({
  member,
  onRemoved,
  state,
}: {
  member: Member | null;
  onRemoved: () => void;
  state: OverlayState;
}) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.isOpen) setError(null);
  }, [state.isOpen, member?.user_id]);

  async function confirm() {
    if (!member) return;
    setIsRemoving(true);
    setError(null);
    try {
      await teamApi.removeMember(member.user_id);
      onRemoved();
      state.close();
    } catch (requestError) {
      setError(errorText(requestError, "Unable to remove this member."));
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <ModalShell
      footer={
        <>
          <Button isDisabled={isRemoving} size="sm" variant="secondary" onClick={state.close}>Cancel</Button>
          <Button isDisabled={isRemoving} size="sm" variant="danger" onClick={() => void confirm()}>
            <Trash2 className="size-4" />
            {isRemoving ? "Removing..." : "Remove member"}
          </Button>
        </>
      }
      state={state}
      subtitle="They will lose access to this workspace immediately."
      title="Remove member?"
    >
      <div className="grid gap-3">
        {error ? <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p> : null}
        <p className="text-sm leading-6 text-foreground">
          Remove <span className="font-semibold">{member ? memberDisplayName(member) : "this person"}</span>
          {member?.is_you ? " (you)" : ""} from the workspace? Their account stays active and they keep access to any other workspaces they belong to.
        </p>
      </div>
    </ModalShell>
  );
}
