import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { AlertTriangle, CheckCircle2, Cloud, FileSpreadsheet, Loader2, X } from "lucide-react";
import { AdminModal, ConfirmDialog, ErrorBanner } from "../admin/AdminModal";
import { leadLibraryService, type LeadInput } from "../../services/leadLibraryApi";
import type { LeadImportResult, LeadList, LeadSelection, LibraryLeadDetail } from "../../types";
import { formatDate, inputClass, ListSelect } from "./leadBits";

const FILE_EXTENSIONS = ["csv", "xlsx", "xls", "txt"];

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// ---- Create / rename a list -------------------------------------------------------------------------------------

export function ListFormModal({ list, onClose, onSaved }: { list: LeadList | "new" | null; onClose: () => void; onSaved: (list: LeadList) => void }) {
  const editing = list && list !== "new" ? list : null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setError(null);
  }, [list, editing]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = { name: name.trim(), description: description.trim() };
      onSaved(editing ? await leadLibraryService.updateList(editing.id, payload) : await leadLibraryService.createList(payload));
    } catch (requestError) {
      setError(message(requestError, "Unable to save the list"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal
      footer={
        <>
          <Button isDisabled={busy} onPress={onClose} size="sm" variant="secondary">Cancel</Button>
          <Button isDisabled={busy || !name.trim()} onPress={save} size="sm">{busy ? "Saving…" : editing ? "Save changes" : "Create list"}</Button>
        </>
      }
      isOpen={list !== null}
      onClose={onClose}
      title={editing ? "Edit list" : "New lead list"}
      width={440}
    >
      <div className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium text-foreground">
          Name
          <input autoFocus className={inputClass} maxLength={160} onChange={(event) => setName(event.target.value)} placeholder="e.g. Staffing agencies — US" value={name} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-foreground">
          Description <span className="font-normal text-muted">(optional)</span>
          <textarea
            className="min-h-[72px] w-full resize-y rounded-xl border border-border bg-surface-secondary px-3 py-2 text-sm outline-none transition focus:border-accent"
            maxLength={1000}
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </label>
        {error ? <ErrorBanner message={error} /> : null}
      </div>
    </AdminModal>
  );
}

// ---- Import a file ----------------------------------------------------------------------------------------------

type ImportStage = "idle" | "uploading" | "processing" | "done" | "error";

export function ImportLeadsModal({
  isOpen,
  defaultListId,
  onClose,
  onImported,
}: {
  isOpen: boolean;
  defaultListId: number | null;
  onClose: () => void;
  onImported: () => void;
}) {
  const [target, setTarget] = useState<"existing" | "new">("new");
  const [listId, setListId] = useState<number | null>(null);
  const [newListName, setNewListName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<ImportStage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LeadImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = stage === "uploading" || stage === "processing";

  useEffect(() => {
    if (!isOpen) return;
    setTarget(defaultListId ? "existing" : "new");
    setListId(defaultListId);
    setNewListName("");
    setFile(null);
    setStage("idle");
    setProgress(0);
    setError(null);
    setResult(null);
  }, [isOpen, defaultListId]);

  function pickFile(next: File | undefined) {
    if (!next) return;
    const extension = next.name.toLowerCase().split(".").pop() || "";
    if (!FILE_EXTENSIONS.includes(extension)) {
      setError(`Unsupported file type ".${extension}". Upload a .csv, .xlsx, .xls, or .txt file.`);
      return;
    }
    setError(null);
    setFile(next);
    if (!newListName) setNewListName(next.name.replace(/\.[^.]+$/, ""));
  }

  const ready = Boolean(file) && (target === "existing" ? listId !== null : newListName.trim().length > 0);

  async function run() {
    if (!file || !ready) return;
    setError(null);
    setStage("uploading");
    setProgress(0);
    try {
      const imported = await leadLibraryService.importFile(
        file,
        target === "existing" ? { listId: listId ?? undefined } : { newListName: newListName.trim() },
        (percent) => {
          setProgress(percent);
          if (percent >= 100) setStage("processing");
        }
      );
      setResult(imported);
      setStage("done");
      onImported();
    } catch (requestError) {
      setError(message(requestError, "Unable to import that file"));
      setStage("error");
    }
  }

  return (
    <AdminModal
      footer={
        stage === "done" ? (
          <Button onPress={onClose} size="sm">Done</Button>
        ) : (
          <>
            <Button isDisabled={busy} onPress={onClose} size="sm" variant="secondary">Cancel</Button>
            <Button isDisabled={busy || !ready} onPress={run} size="sm">{busy ? "Importing…" : "Import leads"}</Button>
          </>
        )
      }
      isOpen={isOpen}
      onClose={() => (busy ? undefined : onClose())}
      title="Import leads"
      description="Upload a CSV, XLSX, or TXT file. Every column is kept with each lead; duplicates and invalid emails are skipped."
      width={520}
    >
      {stage === "done" && result ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 px-3.5 py-3 text-sm font-medium text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            {result.added.toLocaleString()} lead{result.added === 1 ? "" : "s"} added to “{result.list.name}”
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Rows in file" value={result.totalRows} />
            <Stat label="Added" tone="success" value={result.added} />
            <Stat label="Already in list" value={result.alreadyInList} />
            <Stat label="Invalid / repeats" tone={result.invalid > 0 ? "warning" : undefined} value={result.invalid + result.duplicatesInFile} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <input accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={(event) => pickFile(event.target.files?.[0])} ref={inputRef} type="file" />
          {!file ? (
            <div
              className={[
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition",
                dragging ? "border-accent bg-accent/5" : "border-border bg-surface-secondary/60 hover:bg-surface-secondary",
              ].join(" ")}
              onClick={() => inputRef.current?.click()}
              onDragLeave={() => setDragging(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                pickFile(event.dataTransfer.files?.[0]);
              }}
              role="button"
              tabIndex={0}
            >
              <span className="grid size-10 place-items-center rounded-full bg-accent/10 text-accent"><Cloud className="size-5" /></span>
              <p className="text-[13px] font-semibold text-foreground">Drag and drop your lead file here</p>
              <p className="text-[12px] text-muted">or click to browse — .csv, .xlsx, .xls, or .txt</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent"><FileSpreadsheet className="size-4" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{file.name}</p>
                    <p className="text-[11px] text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                {!busy ? (
                  <button aria-label="Remove file" className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-danger" onClick={() => { setFile(null); setStage("idle"); }} type="button">
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
              {stage === "uploading" ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[12px] font-medium text-foreground">
                    <span className="flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin text-accent" /> Uploading…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-default-100"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div>
                </div>
              ) : null}
              {stage === "processing" ? (
                <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                  <Loader2 className="size-3.5 animate-spin text-accent" /> Reading the file, checking emails, and saving leads. Large files can take a few seconds.
                </p>
              ) : null}
            </div>
          )}

          <fieldset className="grid gap-2" disabled={busy}>
            <legend className="mb-1 text-sm font-medium text-foreground">Add these leads to</legend>
            <label className="flex items-center gap-2 text-[13px] text-foreground">
              <input checked={target === "new"} className="accent-[var(--accent)]" onChange={() => setTarget("new")} type="radio" />
              A new list
            </label>
            {target === "new" ? <input className={inputClass} maxLength={160} onChange={(event) => setNewListName(event.target.value)} placeholder="List name" value={newListName} /> : null}
            <label className="flex items-center gap-2 text-[13px] text-foreground">
              <input checked={target === "existing"} className="accent-[var(--accent)]" onChange={() => setTarget("existing")} type="radio" />
              An existing list
            </label>
            {target === "existing" ? <ListSelect onChange={setListId} value={listId} /> : null}
          </fieldset>

          {error ? (
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-danger"><AlertTriangle className="size-3.5 shrink-0" />{error}</p>
          ) : null}
        </div>
      )}
    </AdminModal>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-xl border border-border/70 p-2.5">
      <p className={`text-[18px] font-semibold leading-none ${toneClass}`}>{value.toLocaleString()}</p>
      <p className="mt-1 text-[10.5px] font-medium text-muted">{label}</p>
    </div>
  );
}

// ---- Add leads by hand ------------------------------------------------------------------------------------------

export function AddLeadsModal({ isOpen, defaultListId, onClose, onAdded }: { isOpen: boolean; defaultListId: number | null; onClose: () => void; onAdded: (summary: string) => void }) {
  const [mode, setMode] = useState<"single" | "paste">("single");
  const [listId, setListId] = useState<number | null>(null);
  const [form, setForm] = useState<LeadInput>({ email: "" });
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setListId(defaultListId);
    setForm({ email: "" });
    setPasted("");
    setMode("single");
    setError(null);
  }, [isOpen, defaultListId]);

  const set = (key: keyof LeadInput) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const ready = listId !== null && (mode === "single" ? form.email.trim().length > 3 : pasted.trim().length > 3);

  async function save() {
    if (listId === null) return;
    setBusy(true);
    setError(null);
    try {
      const result = await leadLibraryService.addLeads(mode === "single" ? { listId, contacts: [form] } : { listId, emails: pasted });
      const extras = [result.duplicates ? `${result.duplicates} already there` : "", result.invalid ? `${result.invalid} invalid` : ""].filter(Boolean).join(", ");
      onAdded(`${result.added} lead${result.added === 1 ? "" : "s"} added${extras ? ` (${extras})` : ""}.`);
    } catch (requestError) {
      setError(message(requestError, "Unable to add leads"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal
      footer={
        <>
          <Button isDisabled={busy} onPress={onClose} size="sm" variant="secondary">Cancel</Button>
          <Button isDisabled={busy || !ready} onPress={save} size="sm">{busy ? "Adding…" : "Add leads"}</Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Add leads"
      width={520}
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5 text-sm font-medium text-foreground">
          List
          <ListSelect onChange={setListId} value={listId} />
        </div>
        <div className="inline-flex w-fit rounded-xl bg-default-100 p-0.5 text-[12px] font-medium">
          {(["single", "paste"] as const).map((value) => (
            <button
              className={["rounded-[10px] px-3 py-1.5 transition", mode === value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"].join(" ")}
              key={value}
              onClick={() => setMode(value)}
              type="button"
            >
              {value === "single" ? "One lead" : "Paste emails"}
            </button>
          ))}
        </div>
        {mode === "single" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email" required><input autoFocus className={inputClass} onChange={set("email")} type="email" value={form.email} /></Field>
            <Field label="Company"><input className={inputClass} onChange={set("company")} value={form.company ?? ""} /></Field>
            <Field label="First name"><input className={inputClass} onChange={set("firstName")} value={form.firstName ?? ""} /></Field>
            <Field label="Last name"><input className={inputClass} onChange={set("lastName")} value={form.lastName ?? ""} /></Field>
            <Field label="Role"><input className={inputClass} onChange={set("role")} value={form.role ?? ""} /></Field>
            <Field label="Phone"><input className={inputClass} onChange={set("phone")} value={form.phone ?? ""} /></Field>
            <Field label="Location"><input className={inputClass} onChange={set("location")} value={form.location ?? ""} /></Field>
            <Field label="Website"><input className={inputClass} onChange={set("website")} value={form.website ?? ""} /></Field>
            <div className="sm:col-span-2"><Field label="LinkedIn"><input className={inputClass} onChange={set("linkedinUrl")} value={form.linkedinUrl ?? ""} /></Field></div>
          </div>
        ) : (
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Emails <span className="font-normal text-muted">(one per line, or separated by commas — up to 5,000)</span>
            <textarea
              className="min-h-[140px] w-full resize-y rounded-xl border border-border bg-surface-secondary px-3 py-2.5 font-mono text-[12.5px] outline-none transition focus:border-accent"
              onChange={(event) => setPasted(event.target.value)}
              placeholder={"jane@company.com\njohn@startup.io"}
              value={pasted}
            />
          </label>
        )}
        {error ? <ErrorBanner message={error} /> : null}
      </div>
    </AdminModal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[13px] font-medium text-foreground">
      <span>{label}{required ? <span className="text-danger"> *</span> : null}</span>
      {children}
    </label>
  );
}

// ---- Move / copy ------------------------------------------------------------------------------------------------

export function MoveLeadsModal({
  selection,
  count,
  excludeListId,
  onClose,
  onDone,
}: {
  selection: LeadSelection | null;
  count: number;
  excludeListId: number | null;
  onClose: () => void;
  onDone: (summary: string) => void;
}) {
  const [mode, setMode] = useState<"copy" | "move">("copy");
  const [target, setTarget] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode("copy");
    setTarget(null);
    setError(null);
  }, [selection]);

  async function run() {
    if (!selection || target === null) return;
    setBusy(true);
    setError(null);
    try {
      const result = await leadLibraryService.moveLeads(selection, target, mode);
      const skipped = result.alreadyInTarget ? ` ${result.alreadyInTarget} already in “${result.list.name}”.` : "";
      onDone(`${result.added.toLocaleString()} lead${result.added === 1 ? "" : "s"} ${mode === "move" ? "moved" : "copied"} to “${result.list.name}”.${skipped}`);
    } catch (requestError) {
      setError(message(requestError, "Unable to update leads"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal
      footer={
        <>
          <Button isDisabled={busy} onPress={onClose} size="sm" variant="secondary">Cancel</Button>
          <Button isDisabled={busy || target === null} onPress={run} size="sm">{busy ? "Working…" : mode === "move" ? "Move leads" : "Copy leads"}</Button>
        </>
      }
      isOpen={selection !== null}
      onClose={onClose}
      title={`${count.toLocaleString()} lead${count === 1 ? "" : "s"} selected`}
      description="Leads already in the chosen list are skipped."
      width={440}
    >
      <div className="grid gap-4">
        <div className="inline-flex w-fit rounded-xl bg-default-100 p-0.5 text-[12px] font-medium">
          {(["copy", "move"] as const).map((value) => (
            <button
              className={["rounded-[10px] px-3 py-1.5 capitalize transition", mode === value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"].join(" ")}
              key={value}
              onClick={() => setMode(value)}
              type="button"
            >
              {value} to a list
            </button>
          ))}
        </div>
        <ListSelect excludeId={excludeListId} onChange={setTarget} value={target} />
        {error ? <ErrorBanner message={error} /> : null}
      </div>
    </AdminModal>
  );
}

// ---- Delete -----------------------------------------------------------------------------------------------------

export function DeleteLeadsDialog({ selection, count, onClose, onDone }: { selection: LeadSelection | null; count: number; onClose: () => void; onDone: (summary: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), [selection]);

  async function run() {
    if (!selection) return;
    setBusy(true);
    setError(null);
    try {
      const result = await leadLibraryService.deleteLeads(selection);
      onDone(`${result.deleted.toLocaleString()} lead${result.deleted === 1 ? "" : "s"} deleted.`);
    } catch (requestError) {
      setError(message(requestError, "Unable to delete leads"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      confirmLabel={`Delete ${count.toLocaleString()} lead${count === 1 ? "" : "s"}`}
      description={`This removes ${count.toLocaleString()} lead${count === 1 ? "" : "s"} from your lead lists. Campaigns that already include them keep sending.`}
      error={error}
      isBusy={busy}
      isOpen={selection !== null}
      onClose={onClose}
      onConfirm={run}
      title="Delete leads?"
      tone="danger"
    />
  );
}

export function DeleteListDialog({ list, onClose, onDone }: { list: LeadList | null; onClose: () => void; onDone: (summary: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), [list]);

  async function run() {
    if (!list) return;
    setBusy(true);
    setError(null);
    try {
      await leadLibraryService.deleteList(list.id);
      onDone(`List “${list.name}” deleted.`);
    } catch (requestError) {
      setError(message(requestError, "Unable to delete the list"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      confirmLabel="Delete list"
      description={list ? `“${list.name}” and its ${list.contactCount.toLocaleString()} lead${list.contactCount === 1 ? "" : "s"} will be removed. Campaigns that already include these leads keep sending.` : ""}
      error={error}
      isBusy={busy}
      isOpen={list !== null}
      onClose={onClose}
      onConfirm={run}
      title="Delete this list?"
      tone="danger"
    />
  );
}

// ---- Lead detail ------------------------------------------------------------------------------------------------

export function LeadDetailModal({ leadId, onClose, onChanged }: { leadId: number | null; onClose: () => void; onChanged: () => void }) {
  const [lead, setLead] = useState<LibraryLeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<LeadInput>({ email: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLead(null);
    setEditing(false);
    setError(null);
    if (leadId === null) return;
    let cancelled = false;
    setLoading(true);
    leadLibraryService
      .getLead(leadId)
      .then((detail) => !cancelled && setLead(detail))
      .catch((requestError) => !cancelled && setError(message(requestError, "Unable to load this lead")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  function startEdit() {
    if (!lead) return;
    setForm({
      email: lead.email, firstName: lead.firstName, lastName: lead.lastName, fullName: lead.fullName, company: lead.company, role: lead.role,
      phone: lead.phone, location: lead.location, website: lead.website, linkedinUrl: lead.linkedinUrl,
    });
    setEditing(true);
  }

  async function save() {
    if (!lead) return;
    setBusy(true);
    setError(null);
    try {
      setLead(await leadLibraryService.updateLead(lead.id, form));
      setEditing(false);
      onChanged();
    } catch (requestError) {
      setError(message(requestError, "Unable to save this lead"));
    } finally {
      setBusy(false);
    }
  }

  const set = (key: keyof LeadInput) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const rawEntries = lead ? Object.entries(lead.raw).filter(([, value]) => value !== null && value !== "") : [];

  return (
    <AdminModal
      footer={
        editing ? (
          <>
            <Button isDisabled={busy} onPress={() => setEditing(false)} size="sm" variant="secondary">Cancel</Button>
            <Button isDisabled={busy || !form.email.trim()} onPress={save} size="sm">{busy ? "Saving…" : "Save changes"}</Button>
          </>
        ) : (
          <>
            {lead ? <Button onPress={startEdit} size="sm" variant="secondary">Edit</Button> : null}
            <Button onPress={onClose} size="sm">Close</Button>
          </>
        )
      }
      isOpen={leadId !== null}
      onClose={onClose}
      title={lead ? lead.fullName || lead.email : "Lead"}
      description={lead ? `${lead.email} · in “${lead.listName}”` : undefined}
      width={760}
    >
      {loading ? <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> Loading…</p> : null}
      {error && !lead ? <ErrorBanner message={error} /> : null}
      {lead && editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" required><input className={inputClass} onChange={set("email")} type="email" value={form.email} /></Field>
          <Field label="Company"><input className={inputClass} onChange={set("company")} value={form.company ?? ""} /></Field>
          <Field label="First name"><input className={inputClass} onChange={set("firstName")} value={form.firstName ?? ""} /></Field>
          <Field label="Last name"><input className={inputClass} onChange={set("lastName")} value={form.lastName ?? ""} /></Field>
          <Field label="Full name"><input className={inputClass} onChange={set("fullName")} value={form.fullName ?? ""} /></Field>
          <Field label="Role"><input className={inputClass} onChange={set("role")} value={form.role ?? ""} /></Field>
          <Field label="Phone"><input className={inputClass} onChange={set("phone")} value={form.phone ?? ""} /></Field>
          <Field label="Location"><input className={inputClass} onChange={set("location")} value={form.location ?? ""} /></Field>
          <Field label="Website"><input className={inputClass} onChange={set("website")} value={form.website ?? ""} /></Field>
          <Field label="LinkedIn"><input className={inputClass} onChange={set("linkedinUrl")} value={form.linkedinUrl ?? ""} /></Field>
          {error ? <div className="sm:col-span-2"><ErrorBanner message={error} /></div> : null}
        </div>
      ) : null}
      {lead && !editing ? (
        <div className="space-y-5">
          {lead.status === "Suppressed" ? (
            <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-[13px] font-medium text-foreground">
              <AlertTriangle className="size-4 shrink-0 text-warning" />
              On your suppression list ({(lead.suppressionReason || "suppressed").replace("_", " ")}). Campaigns skip this address.
            </div>
          ) : null}
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {[
              ["Email", lead.email], ["Company", lead.company], ["Role", lead.role], ["Phone", lead.phone], ["Location", lead.location],
              ["Website", lead.website], ["LinkedIn", lead.linkedinUrl], ["Added", formatDate(lead.createdAt)],
            ].map(([label, value]) => (
              <div className="min-w-0" key={label}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
                <dd className="mt-0.5 break-words text-[13px] text-foreground">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          {lead.lists.length > 1 ? (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Also in lists</p>
              <div className="flex flex-wrap gap-1.5">
                {lead.lists.map((list) => (
                  <span className="rounded-full border border-border/70 bg-surface-secondary/60 px-2.5 py-1 text-[11px] font-medium text-foreground" key={list.id}>{list.name}</span>
                ))}
              </div>
            </div>
          ) : null}
          {rawEntries.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Everything from the original file</p>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-border/70">
                <table className="w-full text-left text-[12px]">
                  <tbody>
                    {rawEntries.map(([key, value]) => (
                      <tr className="border-b border-border/60 last:border-0" key={key}>
                        <td className="w-2/5 px-3 py-1.5 font-medium text-muted">{key}</td>
                        <td className="break-words px-3 py-1.5 text-foreground">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Campaign history</p>
            {lead.campaigns.length === 0 ? (
              <p className="text-[13px] text-muted">Not used in a campaign yet.</p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
                {lead.campaigns.map((campaign) => (
                  <li className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]" key={campaign.id}>
                    <span className="min-w-0 truncate font-medium text-foreground">{campaign.name}</span>
                    <span className="shrink-0 text-muted">{campaign.leadStatus}{campaign.sentAt ? ` · ${formatDate(campaign.sentAt)}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </AdminModal>
  );
}
