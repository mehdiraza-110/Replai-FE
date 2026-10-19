import { Button, Chip, Drawer, Spinner } from "@heroui/react";
import { FlaskConical, X } from "lucide-react";
import { useState } from "react";
import type { Run, SampleEmail } from "../../services/workflowApi";
import { StepTrace } from "./StepTrace";
import { statusTone } from "./runUi";

const inputClass = "w-full rounded-xl border border-border bg-surface-secondary px-3 py-2 text-[13px] text-foreground outline-none transition focus:border-accent";

export function DrawerShell({ isOpen, onClose, title, subtitle, children }: { isOpen: boolean; onClose: () => void; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Drawer.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="flex h-full max-w-[94vw] flex-col" style={{ width: "460px" }}>
            <Drawer.Header className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
              <div>
                <Drawer.Heading className="text-[15px] font-semibold text-foreground">{title}</Drawer.Heading>
                <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>
              </div>
              <Drawer.CloseTrigger className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground" aria-label="Close">
                <X className="size-4" />
              </Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body className="flex-1 overflow-y-auto p-5">{children}</Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}

export function TestRunDrawer({
  isOpen,
  onClose,
  onRun,
  isDirty,
  run,
  error,
  isRunning,
  nodeLabels,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRun: (sample: SampleEmail) => void;
  isDirty: boolean;
  run: Run | null;
  error: string | null;
  isRunning: boolean;
  nodeLabels: Record<string, string>;
}) {
  const [sample, setSample] = useState<SampleEmail>({ from: "jane@example.com", subject: "Re: Quick question", body: "Hi, this sounds interesting. Could you share pricing?" });
  const set = (patch: Partial<SampleEmail>) => setSample((s) => ({ ...s, ...patch }));

  return (
    <DrawerShell isOpen={isOpen} onClose={onClose} subtitle="A dry run. Nothing is sent and nothing is saved." title="Test run">
      <div className="space-y-4">
        {isDirty ? <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] leading-4 text-foreground">You have unsaved changes. Running the test will save them first.</p> : null}
        <label className="block space-y-1.5"><span className="text-[12px] font-medium">From</span><input className={inputClass} onChange={(e) => set({ from: e.target.value })} value={sample.from} /></label>
        <label className="block space-y-1.5"><span className="text-[12px] font-medium">Subject</span><input className={inputClass} onChange={(e) => set({ subject: e.target.value })} value={sample.subject} /></label>
        <label className="block space-y-1.5"><span className="text-[12px] font-medium">Body</span><textarea className={`${inputClass} min-h-28 resize-y`} onChange={(e) => set({ body: e.target.value })} value={sample.body} /></label>
        <Button aria-disabled={isRunning} onPress={() => { if (!isRunning) onRun(sample); }} size="sm">
          {isRunning ? <Spinner color="current" size="sm" /> : <FlaskConical className="size-4" />}
          {isRunning ? "Running..." : "Run test"}
        </Button>
        {error ? <p className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</p> : null}
        {run ? (
          <section className="space-y-3 border-t border-border/70 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-foreground">Result</h3>
              <Chip color={statusTone(run.status)} size="sm" variant="soft">{run.status}</Chip>
            </div>
            {run.error ? <p className="text-[12px] text-danger">{run.error}</p> : null}
            {run.note ? <p className="rounded-xl border border-border/70 bg-surface-secondary px-3 py-2 text-[12px] leading-4 text-foreground">{run.note}</p> : null}
            <StepTrace nodeLabels={nodeLabels} run={run} />
          </section>
        ) : null}
      </div>
    </DrawerShell>
  );
}
