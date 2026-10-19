import { Button } from "@heroui/react";
import { AlertTriangle, ArrowRight, CheckCircle2, Info } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  adminApi,
  errorMessage,
  PLATFORM_WORKSPACE_SLUG,
  type AdminWorkspace,
  type AssignDomainsResult,
  type AssignPreview,
} from "../../services/adminApi";
import { ApiRequestError } from "../../services/api";
import { Skeleton } from "../ui/Skeleton";
import { AdminModal, ErrorBanner } from "./AdminModal";
import { inputClass } from "./AdminBits";
import { WorkspacePicker } from "./WorkspacePicker";

export interface AssignDomainsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Domain names to move. */
  domains: string[];
  /** Workspace names the domains sit in now, for the picker to skip when all are in one place. */
  currentWorkspaceId?: number | null;
  workspaces: AdminWorkspace[];
  workspacesError?: string | null;
  /** When set, the target is fixed (used for "Return to pool"). */
  fixedTarget?: AdminWorkspace | null;
  onDone: () => void;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function AssignDomainsModal({ isOpen, onClose, domains, currentWorkspaceId, workspaces, workspacesError, fixedTarget, onDone }: AssignDomainsModalProps) {
  const [targetId, setTargetId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<AssignPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssignDomainsResult | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    setTargetId(fixedTarget?.id ?? null);
    setNotes("");
    setPreview(null);
    setPreviewError(null);
    setConfirmed(false);
    setError(null);
    setResult(null);
  }, [isOpen, fixedTarget?.id]);

  // Show the impact as soon as a target is chosen, before anything is moved.
  useEffect(() => {
    if (!isOpen || targetId === null || domains.length === 0 || result) return;
    const id = ++requestRef.current;
    setPreviewing(true);
    setPreview(null);
    setPreviewError(null);
    setConfirmed(false);
    adminApi
      .previewAssign({ domains, workspaceId: targetId })
      .then((data) => {
        if (id === requestRef.current) setPreview(data);
      })
      .catch((e) => {
        if (id === requestRef.current) setPreviewError(errorMessage(e, "Unable to preview this move."));
      })
      .finally(() => {
        if (id === requestRef.current) setPreviewing(false);
      });
  }, [isOpen, targetId, domains, result]);

  const target = useMemo(() => workspaces.find((w) => w.id === targetId) ?? fixedTarget ?? null, [workspaces, targetId, fixedTarget]);
  const toPool = target?.slug === PLATFORM_WORKSPACE_SLUG;
  const blocked = preview?.blocked ?? [];
  const needsConfirm = Boolean(preview?.requiresConfirmation ?? preview?.requiresPlatformConfirmation);
  const canSubmit = Boolean(target && preview && !previewing && !isBusy && blocked.length === 0 && (!needsConfirm || confirmed));

  async function submit() {
    if (!target || !canSubmit) return;
    setIsBusy(true);
    setError(null);
    try {
      const data = await adminApi.assignDomains({
        domains,
        workspaceId: target.id,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(needsConfirm && confirmed ? { confirmFromPlatform: true } : {}),
      });
      setResult(data);
      onDone();
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === "CONFIRM_FROM_PLATFORM_REQUIRED") setPreview((p) => (p ? { ...p, requiresConfirmation: true, requiresPlatformConfirmation: true } : p));
      setError(errorMessage(e, "The domains could not be assigned."));
    } finally {
      setIsBusy(false);
    }
  }

  const title = result ? (toPool ? "Returned to the pool" : "Domains assigned") : toPool ? "Return to platform pool" : "Assign domains";

  return (
    <AdminModal
      description={result ? undefined : `${plural(domains.length, "domain")} selected: ${domains.slice(0, 3).join(", ")}${domains.length > 3 ? ` and ${domains.length - 3} more` : ""}`}
      footer={
        result ? (
          <Button size="sm" variant="primary" onClick={onClose}>Done</Button>
        ) : (
          <>
            {needsConfirm && !confirmed && !isBusy ? (
              <span className="mr-auto text-[12px] text-danger">Tick the confirmation above to continue.</span>
            ) : null}
            <Button isDisabled={isBusy} size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button isDisabled={!canSubmit} size="sm" variant={toPool ? "primary" : "primary"} onClick={() => void submit()}>
              {isBusy ? "Moving..." : toPool ? "Return to pool" : target ? `Assign to ${target.name}` : "Assign"}
            </Button>
          </>
        )
      }
      isOpen={isOpen}
      title={title}
      width={720}
      onClose={onClose}
    >
      {result ? (
        <ResultView result={result} />
      ) : (
        <div className="grid gap-4">
          {fixedTarget ? (
            <div className="rounded-xl border border-border/70 bg-default-100/60 px-3 py-2.5 text-[13px]">
              <p className="font-medium text-foreground">Target: {fixedTarget.name}</p>
              <p className="text-muted">The platform pool. Domains returned here are available to hand out again.</p>
            </div>
          ) : (
            <section aria-label="Target workspace" className="grid gap-1.5">
              <p className="text-sm font-medium text-foreground">Assign to workspace</p>
              {workspacesError ? <ErrorBanner message={workspacesError} /> : null}
              <WorkspacePicker disabledId={currentWorkspaceId} value={targetId} workspaces={workspaces} onChange={setTargetId} />
            </section>
          )}

          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Notes (optional)
            <textarea
              className={`${inputClass} h-auto min-h-[64px] py-2`}
              maxLength={500}
              placeholder="Why is this moving? Shown in the domain history."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {target === null ? (
            <p className="text-[13px] text-muted">Choose a workspace to see exactly what will change before anything moves.</p>
          ) : previewing ? (
            <div aria-busy="true" aria-label="Checking the impact" className="grid gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-16 w-full max-w-none" />
            </div>
          ) : previewError ? (
            <ErrorBanner message={previewError} />
          ) : preview ? (
            <PreviewView confirmed={confirmed} needsConfirm={needsConfirm} preview={preview} target={target} onConfirm={setConfirmed} />
          ) : null}

          {error ? <ErrorBanner message={error} /> : null}
          <RulesNote />
        </div>
      )}
    </AdminModal>
  );
}

function RulesNote() {
  return (
    <div className="flex gap-2 rounded-xl border border-border/70 bg-default-100/60 p-3 text-[12px] leading-5 text-muted">
      <Info className="mt-0.5 size-4 shrink-0" />
      <ul className="list-disc space-y-0.5 pl-4">
        <li>Mailboxes move with their domain. Warm-up progress (stage and daily limit) is kept.</li>
        <li>Campaign history stays with the previous workspace.</li>
        <li>Campaigns that lose all of their mailboxes are paused automatically.</li>
        <li>The receiving workspace is notified by email.</li>
      </ul>
    </div>
  );
}

function PreviewView({
  preview,
  target,
  needsConfirm,
  confirmed,
  onConfirm,
}: {
  preview: AssignPreview;
  target: AdminWorkspace;
  needsConfirm: boolean;
  confirmed: boolean;
  onConfirm: (v: boolean) => void;
}) {
  return (
    <div aria-live="polite" className="grid gap-3">
      <p className="text-sm font-medium text-foreground">
        {plural(preview.domains.length, "domain")} and {plural(preview.mailboxesMoving, "mailbox", "mailboxes")} will move to {target.name}.
      </p>

      {preview.blocked.length > 0 ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-[13px] leading-5 text-danger" role="alert">
          <p className="font-medium">This move is blocked</p>
          <ul className="mt-1 list-disc pl-4">
            {preview.blocked.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      ) : null}

      {preview.warnings.length > 0 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-[13px] leading-5 text-foreground">
          <p className="font-medium">Heads up</p>
          <ul className="mt-1 list-disc pl-4">
            {preview.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      ) : null}

      <ul aria-label="Domains moving" className="divide-y divide-border/60 rounded-xl border border-border/70 text-[13px]">
        {preview.domains.map((d) => (
          <li className="px-3 py-2" key={d.domain}>
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-medium text-foreground">{d.domain}</span>
              <span className="text-[12px] text-muted">{d.provider_label}</span>
              <span className="ml-auto flex items-center gap-1 text-[12px] text-muted">
                {(d.workspace ?? d.current_workspace)?.name ?? "Unknown"}
                <ArrowRight className="size-3" />
                {target.name}
              </span>
            </div>
            <p className="text-[12px] text-muted">
              {(d.owner_email ?? d.current_owner_email) ? `Currently owned by ${d.owner_email ?? d.current_owner_email}. ` : ""}
              {plural(d.mailboxes.length, "mailbox", "mailboxes")}
              {d.mailboxes.length > 0 ? `: ${d.mailboxes.slice(0, 3).map((m) => m.email).join(", ")}${d.mailboxes.length > 3 ? ", ..." : ""}` : ""}
            </p>
          </li>
        ))}
      </ul>

      <section aria-label="Affected campaigns">
        <p className="mb-1.5 text-sm font-medium text-foreground">Campaigns affected</p>
        {preview.campaigns.length === 0 ? (
          <p className="text-[13px] text-muted">No campaigns use these mailboxes.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/70 text-[13px]">
            {preview.campaigns.map((c) => (
              <li className="flex flex-wrap items-baseline gap-x-2 px-3 py-2" key={c.id}>
                <span className="font-medium text-foreground">{c.name}</span>
                <span className="text-[12px] text-muted">{c.workspaceName}{c.isWarmup ? " · warm-up" : ""}</span>
                {c.willPause ? (
                  <span className="ml-auto flex items-center gap-1 font-medium text-danger">
                    <AlertTriangle className="size-3.5" />
                    Will be paused
                  </span>
                ) : (
                  <span className="ml-auto text-success">Keeps running with {plural(c.remainingMailboxes, "mailbox", "mailboxes")}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {needsConfirm ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-[13px] leading-5 text-foreground">
          <input checked={confirmed} className="mt-1 size-4" type="checkbox" onChange={(e) => onConfirm(e.target.checked)} />
          <span>
            <span className="block font-semibold text-danger">Moving out of the platform pool</span>
            These domains belong to the Koval Group platform pool. Moving them gives them to {target.name}. I understand and want to continue.
          </span>
        </label>
      ) : null}
    </div>
  );
}

function ResultView({ result }: { result: AssignDomainsResult }) {
  const paused = result.campaigns.filter((c) => c.outcome === "paused");
  return (
    <div className="grid gap-3" role="status">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CheckCircle2 className="size-5 text-success" />
        {plural(result.domains.length, "domain")} and {plural(result.mailboxesMoved, "mailbox", "mailboxes")} moved to {result.workspace.name}.
      </div>
      <ul aria-label="Moved domains" className="divide-y divide-border/60 rounded-xl border border-border/70 text-[13px]">
        {result.domains.map((d) => {
          const from = typeof d.from_workspace === "string" ? d.from_workspace : d.from_workspace?.name;
          return (
            <li className="flex flex-wrap items-baseline gap-x-3 px-3 py-2" key={d.id}>
              <span className="font-medium text-foreground">{d.domain}</span>
              <span className="text-muted">{from ? `from ${from}` : ""}</span>
              <span className="ml-auto text-success">Moved</span>
            </li>
          );
        })}
      </ul>
      {result.campaigns.length > 0 ? (
        <section aria-label="Campaign outcomes">
          <p className="mb-1.5 text-sm font-medium text-foreground">Campaigns</p>
          <ul className="divide-y divide-border/60 rounded-xl border border-border/70 text-[13px]">
            {result.campaigns.map((c) => (
              <li className="flex flex-wrap items-baseline gap-x-3 px-3 py-2" key={c.id}>
                <span className="font-medium text-foreground">{c.name}</span>
                {c.outcome === "paused" ? (
                  <span className="ml-auto font-medium text-danger">Paused (no mailboxes left)</span>
                ) : (
                  <span className="ml-auto text-success">Kept running with {plural(c.remainingMailboxes, "mailbox", "mailboxes")}</span>
                )}
              </li>
            ))}
          </ul>
          {paused.length > 0 ? <p className="mt-1.5 text-[12px] text-muted">Paused campaigns can be resumed once they have mailboxes again.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
