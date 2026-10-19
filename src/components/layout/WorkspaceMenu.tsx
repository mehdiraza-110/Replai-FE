import { Dropdown, Spinner } from "@heroui/react";
import { useEffect, useState } from "react";
import { Building2, Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { WorkspaceSummary } from "../../types";
import { pluralDays } from "../trial/trialUtils";

const typeLabel: Record<WorkspaceSummary["type"], string> = {
  organization: "Organization",
  individual: "Individual",
};

const roleLabel: Record<WorkspaceSummary["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function WorkspaceIcon({ type, className }: { type: WorkspaceSummary["type"]; className?: string }) {
  const Icon = type === "individual" ? User : Building2;
  return <Icon className={className} />;
}

/**
 * Shows the active workspace (the tenant) and lets the user switch to another one or create a new one.
 * Not to be confused with the system switcher (Auto Responder / Cold Mailer).
 */
export function WorkspaceMenu({ compact = false }: { compact?: boolean }) {
  const { activeWorkspace, isTrialEnded, openTrialModal, plan, switchWorkspace, user } = useAuth();
  const navigate = useNavigate();
  const [switchingTo, setSwitchingTo] = useState<WorkspaceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workspaces = user?.workspaces ?? [];

  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  async function handleSwitch(workspace: WorkspaceSummary) {
    if (workspace.id === activeWorkspace?.id) return;

    setError(null);
    setSwitchingTo(workspace);

    try {
      await switchWorkspace(workspace.id);
      navigate("/");
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "We could not switch workspaces. Please try again.");
    } finally {
      setSwitchingTo(null);
    }
  }

  if (!activeWorkspace && workspaces.length === 0) {
    return null;
  }

  const name = activeWorkspace?.name ?? "Choose a workspace";
  const planText = plan?.type === "trial" ? (isTrialEnded ? "Trial ended" : `Trial · ${pluralDays(plan.days_left)} left`) : plan ? "Standard plan" : null;
  const meta = activeWorkspace ? `${roleLabel[activeWorkspace.role]} · ${typeLabel[activeWorkspace.type]}` : "No workspace selected";

  return (
    <>
      <Dropdown>
        <Dropdown.Trigger aria-label={`Workspace menu, current workspace ${name}`} className={compact ? "block min-w-0" : "block w-full"}>
          <div
            className={
              compact
                ? "flex max-w-[180px] items-center gap-2 rounded-full border border-border/70 bg-surface px-2.5 py-1.5 text-left transition hover:bg-surface-secondary/70"
                : "flex w-full items-center gap-2.5 rounded-[13px] border border-border/70 bg-surface px-2.5 py-2 text-left transition hover:bg-surface-secondary/70"
            }
          >
            <span className={`grid shrink-0 place-items-center rounded-full bg-accent/10 text-accent ${compact ? "size-6" : "size-8"}`}>
              <WorkspaceIcon className="size-4" type={activeWorkspace?.type ?? "organization"} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold leading-4 text-foreground">{name}</span>
              {compact ? null : <span className="block truncate text-[10px] leading-3 text-muted">{meta}</span>}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted" />
          </div>
        </Dropdown.Trigger>
        <Dropdown.Popover className="w-[260px]" placement="bottom start">
          {planText ? (
            <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Plan</p>
                <p className={`truncate text-[13px] font-semibold ${isTrialEnded ? "text-danger" : "text-foreground"}`}>{planText}</p>
              </div>
              {plan?.type === "trial" && !isTrialEnded ? (
                <button className="shrink-0 text-[12px] font-semibold text-accent underline underline-offset-2" type="button" onClick={openTrialModal}>
                  Details
                </button>
              ) : null}
            </div>
          ) : null}
          <Dropdown.Menu aria-label="Switch workspace">
            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspace?.id;

              return (
                <Dropdown.Item id={`workspace-${workspace.id}`} key={workspace.id} textValue={workspace.name} onAction={() => handleSwitch(workspace)}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground">
                    <WorkspaceIcon className="size-4" type={workspace.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold leading-4 text-foreground">{workspace.name}</span>
                    <span className="block truncate text-[11px] leading-4 text-muted">
                      {roleLabel[workspace.role]} · {typeLabel[workspace.type]}
                      {workspace.status === "suspended" ? " · Suspended" : ""}
                    </span>
                  </span>
                  {isActive ? <Check className="size-4 shrink-0 text-accent" /> : null}
                </Dropdown.Item>
              );
            })}
            <Dropdown.Item id="create-workspace" textValue="Create workspace" onAction={() => navigate("/create-workspace")}>
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-dashed border-border text-foreground">
                <Plus className="size-4" />
              </span>
              <span className="text-[13px] font-semibold text-foreground">Create workspace</span>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      {error ? (
        <p className="mt-1.5 px-1 text-[11px] font-medium leading-4 text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {switchingTo ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
          <Spinner color="accent" size="lg" />
          <p className="text-sm font-semibold text-foreground">Switching to {switchingTo.name}…</p>
        </div>
      ) : null}
    </>
  );
}
