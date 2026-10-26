export type ReportCell = string | number | null;

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

/** A finished report: what the screen shows and what every export format is built from. */
export interface ReportDataset {
  title: string;
  /** Lines such as "Date range: …" and "Filters: …" printed above the table. */
  meta: Array<[label: string, value: string]>;
  columns: ReportColumn[];
  rows: Array<Record<string, ReportCell>>;
}

export type ExportFormat = "csv" | "xls" | "pdf";

export const EXPORT_FORMATS: Array<{ id: ExportFormat; label: string; extension: string; description: string }> = [
  { id: "csv", label: "CSV", extension: "csv", description: "Plain rows for spreadsheets and data tools" },
  { id: "xls", label: "Excel", extension: "xls", description: "Formatted table that opens in Excel" },
  { id: "pdf", label: "PDF", extension: "pdf", description: "Print-ready document, saved from the print dialog" },
];

function fileStem(dataset: ReportDataset) {
  const slug = dataset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "report"}-${new Date().toISOString().slice(0, 10)}`;
}

function download(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cellText(value: ReportCell) {
  return value === null || value === undefined ? "" : String(value);
}

/** Spreadsheet apps run text that starts with these characters as a formula; a leading quote keeps it as text. */
function safeForSpreadsheet(text: string) {
  return /^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
}

function toCsv(dataset: ReportDataset) {
  const quote = (text: string) => `"${text.replace(/"/g, '""')}"`;
  const lines = [dataset.columns.map((column) => quote(column.label)).join(",")];
  for (const row of dataset.rows) {
    lines.push(dataset.columns.map((column) => quote(safeForSpreadsheet(cellText(row[column.key])))).join(","));
  }
  // The BOM makes Excel read the file as UTF-8.
  return `﻿${lines.join("\r\n")}`;
}

const DOCUMENT_STYLES = `
  body { font: 12px/1.45 -apple-system, "Segoe UI", Inter, Arial, sans-serif; color: #111318; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  dl { margin: 8px 0 16px; color: #5d6675; }
  dl div { display: flex; gap: 6px; }
  dt { font-weight: 600; }
  dd { margin: 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #d7dae0; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #f0f1f3; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  @page { margin: 14mm; }
`;

function toHtmlDocument(dataset: ReportDataset) {
  const head = dataset.columns
    .map((column) => `<th${column.align === "right" ? ' class="num"' : ""}>${escapeHtml(column.label)}</th>`)
    .join("");
  const body = dataset.rows
    .map(
      (row) =>
        `<tr>${dataset.columns
          .map((column) => `<td${column.align === "right" ? ' class="num"' : ""}>${escapeHtml(cellText(row[column.key]))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const meta = dataset.meta
    .concat([["Rows", String(dataset.rows.length)], ["Generated", new Date().toLocaleString()]])
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}:</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(dataset.title)}</title><style>${DOCUMENT_STYLES}</style></head><body><h1>${escapeHtml(dataset.title)}</h1><dl>${meta}</dl><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

function printAsPdf(dataset: ReportDataset) {
  // A hidden frame avoids pop-up blockers; the user picks "Save as PDF" in the print dialog.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const cleanup = () => window.setTimeout(() => frame.remove(), 1000);

  const frameWindow = frame.contentWindow;
  if (!frameWindow) {
    frame.remove();
    return;
  }
  frameWindow.document.open();
  frameWindow.document.write(toHtmlDocument(dataset));
  frameWindow.document.close();
  frameWindow.onafterprint = cleanup;
  window.setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
  }, 250);
}

export function exportReport(dataset: ReportDataset, format: ExportFormat) {
  const stem = fileStem(dataset);

  if (format === "csv") {
    download(toCsv(dataset), `${stem}.csv`, "text/csv;charset=utf-8");
  } else if (format === "xls") {
    // Excel opens an HTML table saved as .xls and keeps the layout.
    const html = toHtmlDocument(dataset).replace("</head>", '<meta name="ProgId" content="Excel.Sheet"></head>');
    download(`﻿${html}`, `${stem}.xls`, "application/vnd.ms-excel");
  } else {
    printAsPdf(dataset);
  }
}
