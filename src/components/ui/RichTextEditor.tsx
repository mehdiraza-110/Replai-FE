import { useEffect, useRef, type ClipboardEvent, type ReactNode } from "react";
import { Tooltip } from "@heroui/react";
import { Bold, Italic, Link2, List, ListOrdered, RemoveFormatting, Underline } from "lucide-react";
import { isComposerEmpty, sanitizeComposerHtml } from "../../utils/composerHtml";

export interface MergeVariable {
  key: string;
  label: string;
  description: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel: string;
  minHeightClassName?: string;
  resetKey?: string | number;
  variables?: MergeVariable[];
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your message…",
  disabled = false,
  ariaLabel,
  minHeightClassName = "min-h-[160px]",
  resetKey,
  variables,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = value || "";
    // Only re-sync from outside when the reset key changes (e.g. switching context) —
    // otherwise every keystroke's onChange would fight the caret position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  function syncValue() {
    onChange(sanitizeComposerHtml(editorRef.current?.innerHTML || ""));
  }

  function runCommand(command: string, arg?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    syncValue();
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    syncValue();
  }

  function insertLink() {
    const url = window.prompt("Link URL (https:// or mailto:)");
    if (!url) return;
    runCommand("createLink", url);
  }

  function insertVariable(key: string) {
    runCommand("insertText", `{{${key}}}`);
  }

  const isEmpty = isComposerEmpty(value);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface transition focus-within:border-accent">
      <div className="flex items-center gap-1 border-b border-border/70 bg-background/60 px-2 py-1.5">
        <ToolbarButton label="Bold" onClick={() => runCommand("bold")}><Bold className="size-4" /></ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => runCommand("italic")}><Italic className="size-4" /></ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => runCommand("underline")}><Underline className="size-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border/80" />
        <ToolbarButton label="Bulleted list" onClick={() => runCommand("insertUnorderedList")}><List className="size-4" /></ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => runCommand("insertOrderedList")}><ListOrdered className="size-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border/80" />
        <ToolbarButton label="Insert link" onClick={insertLink}><Link2 className="size-4" /></ToolbarButton>
        <ToolbarButton label="Clear formatting" onClick={() => runCommand("removeFormat")}><RemoveFormatting className="size-4" /></ToolbarButton>
      </div>
      {variables && variables.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/70 bg-background/60 px-2 py-1.5">
          <span className="pl-0.5 text-[11px] font-medium text-muted">Insert:</span>
          {variables.map((variable) => (
            <Tooltip delay={200} key={variable.key}>
              <Tooltip.Trigger>
                <button
                  className="rounded-full border border-border/70 bg-surface px-2.5 py-1 font-mono text-[11px] font-medium text-accent transition hover:border-accent hover:bg-accent/5"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertVariable(variable.key);
                  }}
                  type="button"
                >
                  {`{{${variable.key}}}`}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content className="max-w-[220px] text-[11px] leading-4">
                <p className="font-semibold text-foreground">{variable.label}</p>
                <p className="mt-0.5 text-muted">{variable.description}</p>
              </Tooltip.Content>
            </Tooltip>
          ))}
        </div>
      ) : null}
      <div className="relative">
        {isEmpty ? (
          <p className="pointer-events-none absolute left-3 top-2.5 text-sm leading-6 text-muted">{placeholder}</p>
        ) : null}
        <div
          aria-label={ariaLabel}
          className={`rich-reply-editor thin-scrollbar max-h-[360px] overflow-auto px-3 py-2.5 text-sm leading-6 text-foreground outline-none ${minHeightClassName}`}
          contentEditable={!disabled}
          onInput={syncValue}
          onPaste={handlePaste}
          ref={editorRef}
          role="textbox"
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
}

function ToolbarButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-surface-tertiary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
