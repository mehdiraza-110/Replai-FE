import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Badge, type BadgeTone } from "../../ui";
import type { Status } from "../../api/ai";

export const STATUS_TONE: Record<Status, BadgeTone> = { processing: "blue", completed: "green", failed: "red" };
export const STATUS_LABEL: Record<Status, string> = { processing: "Analyzing", completed: "Completed", failed: "Failed" };
export const StatusBadge = ({ status, processingLabel }: { status: Status; processingLabel?: string }) => <Badge tone={STATUS_TONE[status]}>{status === "processing" && processingLabel ? processingLabel : STATUS_LABEL[status]}</Badge>;

export const when = (value: string | null) => (value ? new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—");
export const scoreTone = (score: number) => (score >= 7 ? "green" : score >= 4 ? "yellow" : "red");
export const ScoreChip = ({ score }: { score: number }) => <span className={`sv-score is-${scoreTone(score)}`}>{score.toFixed(1)}/10</span>;

/** Calls `reload` every few seconds while `active` is true (something is still being generated). */
export function usePolling(active: boolean, reload: () => void, ms = 3000) {
  const ref = useRef(reload);
  ref.current = reload;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => ref.current(), ms);
    return () => window.clearInterval(timer);
  }, [active, ms]);
}

export function useCopy() {
  const [done, setDone] = useState("");
  return { done, copy: async (key: string, value: string) => { try { await navigator.clipboard.writeText(value); setDone(key); window.setTimeout(() => setDone(""), 1500); } catch { setDone(""); } } };
}

function inline(textValue: string): ReactNode[] {
  return textValue.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={index}>{part.slice(1, -1)}</code>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/** Renders the small subset of markdown the models use (headings, lists, bold, code). Never injects HTML. */
export function Prose({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    out.push(<Tag key={out.length}>{list.items.map((item, i) => <li key={i}>{inline(item)}</li>)}</Tag>);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flush();
      list = list ?? { ordered, items: [] };
      list.items.push((bullet || numbered)![1]);
      continue;
    }
    flush();
    if (heading) out.push(<h4 key={out.length}>{inline(heading[1])}</h4>);
    else if (line.trim()) out.push(<p key={out.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="sv-prose">{out}</div>;
}

export function downloadText(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "report";

/** Reads a small text file the user picked (transcripts). */
export function readTextFile(file: File, maxBytes = 2_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) return reject(new Error("That file is too large. Use a text transcript under 2 MB."));
    if (!/\.(txt|md|vtt|srt|csv)$/i.test(file.name) && !file.type.startsWith("text/")) return reject(new Error("Upload a text transcript (.txt, .vtt or .srt). Audio and video files aren't supported yet."));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsText(file);
  });
}
