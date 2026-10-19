import { useState } from "react";
import { Button, Card } from "@heroui/react";
import { Check, Pencil, X } from "lucide-react";
import { StatusPill } from "../ui/StatusPill";
import { teamApi } from "../../services/teamApi";
import type { WorkspaceDetail } from "../../services/teamApi";
import { roleLabels, roleTones, fieldClass } from "./shared";

const roleHelp = [
  { role: "Owner", text: "Full control of the workspace, including renaming it and managing admins and other owners." },
  { role: "Admin", text: "Manages members and integrations, but cannot change owners or other admins." },
  { role: "Member", text: "Uses the products they have been given access to. Cannot manage the team." },
];

export function TeamHeader({ onRenamed, workspace }: { onRenamed: (workspace: WorkspaceDetail) => void; workspace: WorkspaceDetail }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOwner = workspace.role === "owner";

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Workspace name can't be empty.");
      return;
    }
    if (trimmed === workspace.name) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const updated = await teamApi.renameWorkspace(trimmed);
      onRenamed({ ...workspace, ...updated });
      setIsEditing(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to rename the workspace.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="apple-shadow border border-border/70 bg-surface">
      <Card.Content className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {isEditing ? (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
              >
                <input aria-label="Workspace name" autoFocus className={fieldClass + " w-[min(320px,100%)]"} maxLength={80} onChange={(event) => setName(event.target.value)} value={name} />
                <Button isDisabled={isSaving} size="sm" type="submit">
                  <Check className="size-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  isDisabled={isSaving}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setName(workspace.name);
                    setError(null);
                  }}
                >
                  <X className="size-4" />
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-semibold text-foreground">{workspace.name}</h1>
                {isOwner ? (
                  <button
                    aria-label="Rename workspace"
                    className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-default-100 hover:text-foreground"
                    onClick={() => {
                      setName(workspace.name);
                      setIsEditing(true);
                    }}
                    type="button"
                  >
                    <Pencil className="size-4" />
                  </button>
                ) : null}
              </div>
            )}
            {error ? <p className="mt-1.5 text-sm font-medium text-danger">{error}</p> : null}
            <p className="mt-1 text-sm text-muted">
              {workspace.type === "organization" ? "Organization workspace" : "Individual workspace"} · your role is {roleLabels[workspace.role]}
            </p>
          </div>
          <StatusPill tone={roleTones[workspace.role] === "default" ? "default" : roleTones[workspace.role]}>{roleLabels[workspace.role]}</StatusPill>
        </div>

        <dl className="grid gap-3 border-t border-border/70 pt-4 md:grid-cols-3">
          {roleHelp.map((item) => (
            <div key={item.role}>
              <dt className="text-[13px] font-semibold text-foreground">{item.role}</dt>
              <dd className="mt-0.5 text-[13px] leading-5 text-muted">{item.text}</dd>
            </div>
          ))}
        </dl>
      </Card.Content>
    </Card>
  );
}
