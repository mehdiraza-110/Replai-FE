import { FlaskConical } from "lucide-react";
import { useState } from "react";
import type { Run, SampleEmail } from "../../../../services/workflowApi";
import { Badge, Button } from "../../../ui";
import { Drawer } from "./Drawer";
import { Field, Note } from "./Form";
import { StepTrace } from "./StepTrace";
import { statusTone } from "./runUi";

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
    <Drawer isOpen={isOpen} onClose={onClose} subtitle="A dry run. Nothing is sent and nothing is saved." title="Test run">
      <div className="wf-stack is-loose">
        {isDirty ? <Note tone="warning">You have unsaved changes. Running the test will save them first.</Note> : null}
        <Field label="From"><input className="sv-input" onChange={(e) => set({ from: e.target.value })} value={sample.from} /></Field>
        <Field label="Subject"><input className="sv-input" onChange={(e) => set({ subject: e.target.value })} value={sample.subject} /></Field>
        <Field label="Body"><textarea className="sv-textarea wf-tall" onChange={(e) => set({ body: e.target.value })} value={sample.body} /></Field>
        <div>
          <Button variant="primary" icon={FlaskConical} disabled={isRunning} onClick={() => { if (!isRunning) onRun(sample); }}>
            {isRunning ? "Running…" : "Run test"}
          </Button>
        </div>
        {error ? <p className="sv-banner is-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
        {run ? (
          <section className="wf-stack is-loose wf-result">
            <div className="wf-row">
              <h3 className="sv-set-title" style={{ fontSize: 14 }}>Result</h3>
              <Badge tone={statusTone(run.status)}>{run.status}</Badge>
            </div>
            {run.error ? <p className="wf-trace-text is-error">{run.error}</p> : null}
            {run.note ? <Note>{run.note}</Note> : null}
            <StepTrace nodeLabels={nodeLabels} run={run} />
          </section>
        ) : null}
      </div>
    </Drawer>
  );
}
