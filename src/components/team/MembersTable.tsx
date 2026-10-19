import { Avatar, Button, Chip } from "@heroui/react";
import { Pencil, Trash2 } from "lucide-react";
import { StatusPill } from "../ui/StatusPill";
import { SkeletonRow } from "../ui/Skeleton";
import { canManageMember, memberDisplayName } from "../../services/teamApi";
import type { Member, WorkspaceDetail } from "../../services/teamApi";
import { roleLabels, roleTones } from "./shared";

function initialsOf(member: Member) {
  return memberDisplayName(member)
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function AccessChips({ member, workspace }: { member: Member; workspace: WorkspaceDetail }) {
  const products = [
    { key: "auto_responder", label: "Auto Responder", enabled: workspace.auto_responder_enabled },
    { key: "cold_mailer", label: "Cold Mailer", enabled: workspace.cold_mailer_enabled },
  ] as const;
  const hasFullAccess = member.role !== "member";

  return (
    <div className="flex flex-wrap gap-1.5">
      {products.map((product) => {
        const granted = hasFullAccess || member.permissions?.[product.key];
        const active = product.enabled && granted;
        return (
          <Chip
            className={"whitespace-nowrap px-2 text-[11px] font-medium " + (active ? "" : "opacity-45")}
            color={active ? "success" : "default"}
            key={product.key}
            size="sm"
            variant="soft"
          >
            {product.label}
            {!product.enabled ? " (off)" : !granted ? " (no access)" : ""}
          </Chip>
        );
      })}
    </div>
  );
}

export function MembersTable({
  isLoading,
  members,
  onEdit,
  onRemove,
  workspace,
}: {
  isLoading: boolean;
  members: Member[];
  onEdit: (member: Member) => void;
  onRemove: (member: Member) => void;
  workspace: WorkspaceDetail;
}) {
  const showActions = workspace.role !== "member";

  return (
    <div className="overflow-x-auto">
      <table className="w-full md:min-w-[760px] text-left text-sm">
        <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Member</th>
            <th className="px-2 py-3 font-medium">Role</th>
            <th className="hidden px-2 py-3 font-medium md:table-cell">Product access</th>
            <th className="hidden px-2 py-3 font-medium md:table-cell">Joined</th>
            {showActions ? <th className="px-4 py-3 text-right font-medium">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => <SkeletonRow columns={showActions ? 5 : 4} key={index} />)
            : members.map((member) => {
                const { canEdit, canRemove, lastOwner } = canManageMember(workspace.role, member, members);
                return (
                  <tr className="border-b border-border/60 last:border-0" key={member.user_id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 shrink-0">
                          <Avatar.Fallback>{initialsOf(member)}</Avatar.Fallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium text-foreground">
                            <span className="truncate">{memberDisplayName(member)}</span>
                            {member.is_you ? <StatusPill tone="accent">You</StatusPill> : null}
                          </p>
                          <p className="truncate text-[12px] text-muted">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <StatusPill tone={roleTones[member.role]}>{roleLabels[member.role]}</StatusPill>
                    </td>
                    <td className="hidden px-2 py-3 md:table-cell">
                      <AccessChips member={member} workspace={workspace} />
                    </td>
                    <td className="hidden px-2 py-3 text-muted md:table-cell">{formatDate(member.created_at)}</td>
                    {showActions ? (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button aria-label={`Edit ${memberDisplayName(member)}`} isDisabled={!canEdit} isIconOnly size="sm" variant="secondary" onClick={() => onEdit(member)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            aria-label={`Remove ${memberDisplayName(member)}`}
                            isDisabled={!canRemove}
                            isIconOnly
                            size="sm"
                            variant="secondary"
                            onClick={() => onRemove(member)}
                          >
                            <Trash2 className={"size-4 " + (canRemove ? "text-danger" : "")} />
                          </Button>
                          {lastOwner ? <span className="sr-only">The last owner can't be changed or removed.</span> : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
