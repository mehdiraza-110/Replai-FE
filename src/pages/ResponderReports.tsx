import { useState } from "react";
import { Button, Chip, Spinner } from "@heroui/react";
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Download, RefreshCw, Search, X } from "lucide-react";
import { FilterMenu } from "../components/mailer/FilterMenu";
import { DateRangeFilter } from "../components/reports/DateRangeFilter";
import { REPORT_PAGE_SIZE, useReport } from "../hooks/useReport";
import { RESPONDER_REPORTS } from "../reports/responderReports";
import type { ReportTone } from "../reports/types";
import { EXPORT_FORMATS, exportReport, type ExportFormat } from "../utils/reportExport";

const MAX_CHIP_OPTIONS = 4;

const toneText: Record<ReportTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

/**
 * Auto Responder reports: a studio. Reports are picked from a gallery of cards, results read as
 * soft figure cards, a distribution chart and a card table, and filters plus export live in a side panel.
 */
export function ResponderReports() {
  const [reportId, setReportId] = useState(RESPONDER_REPORTS[0].id);
  const [format, setFormat] = useState<ExportFormat>("xls");
  const def = RESPONDER_REPORTS.find((report) => report.id === reportId) ?? RESPONDER_REPORTS[0];
  const report = useReport(def);
  const maxBreakdown = Math.max(1, ...report.breakdown.map((entry) => entry.count));
  const chosenFormat = EXPORT_FORMATS.find((item) => item.id === format) ?? EXPORT_FORMATS[0];

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-5">
      <div>
        <h1 className="text-[20px] font-semibold leading-7 text-foreground">Reports</h1>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          Choose a report, narrow it to the replies you care about, and download it in the format you need.
        </p>
      </div>

      <div aria-label="Report types" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup">
        {RESPONDER_REPORTS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === def.id;
          return (
            <button
              aria-checked={isActive}
              className={`group flex items-start gap-3 rounded-[20px] border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${
                isActive ? "border-accent bg-accent/5 shadow-[0_0_0_1px_var(--accent)]" : "border-border/70 bg-surface hover:border-foreground/20"
              }`}
              key={item.id}
              role="radio"
              type="button"
              onClick={() => setReportId(item.id)}
            >
              <span className={`grid size-10 shrink-0 place-items-center rounded-full transition ${isActive ? "bg-accent text-accent-foreground" : "bg-default-100 text-foreground"}`}>
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-5 text-foreground">{item.label}</span>
                <span className="mt-0.5 block text-[12px] leading-4 text-muted">{item.description}</span>
              </span>
              {isActive ? <Check className="mt-1 size-4 shrink-0 text-accent" /> : null}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {report.error ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              <span>{report.error}</span>
              <Button size="sm" variant="secondary" onPress={report.reload}>Retry</Button>
            </div>
          ) : null}

          <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {report.kpis.map((item) => (
              <div className="rounded-[20px] bg-surface p-4 apple-shadow dark:border dark:border-default-100" key={item.label}>
                <p className="text-[12px] font-medium text-muted">{item.label}</p>
                <p className={`mt-3 truncate text-[26px] font-semibold leading-none ${item.tone ? toneText[item.tone] : "text-foreground"}`}>
                  {report.isLoading ? <span className="inline-block h-6 w-16 animate-pulse rounded-md bg-default-200 align-middle" /> : item.value}
                </p>
                {item.hint ? <p className="mt-1.5 text-[12px] text-muted">{item.hint}</p> : null}
              </div>
            ))}
          </section>

          {def.breakdown && report.breakdown.length > 0 && !report.isLoading ? (
            <section className="rounded-[20px] bg-surface p-5 apple-shadow dark:border dark:border-default-100">
              <p className="text-[14px] font-semibold text-foreground">{def.breakdown.label}</p>
              <ul className="mt-4 space-y-2.5">
                {report.breakdown.slice(0, 8).map((entry) => (
                  <li className="grid grid-cols-[minmax(90px,160px)_1fr_auto] items-center gap-3 text-[12px]" key={entry.label}>
                    <span className="truncate font-medium text-foreground" title={entry.label}>{entry.label}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-default-100">
                      <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(entry.count / maxBreakdown) * 100}%` }} />
                    </span>
                    <span className="tabular-nums text-muted">{entry.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-[20px] bg-surface apple-shadow dark:border dark:border-default-100">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
              <div>
                <p className="text-[14px] font-semibold text-foreground">{def.label}</p>
                <p className="text-[12px] text-muted">
                  {report.isLoading
                    ? "Loading…"
                    : `${report.filtered.length.toLocaleString()} ${report.filtered.length === 1 ? "row" : "rows"}${report.rows.length !== report.filtered.length ? ` of ${report.rows.length.toLocaleString()}` : ""}`}
                </p>
              </div>
              <Button isDisabled={report.isLoading} size="sm" variant="secondary" onPress={report.reload}>
                {report.isLoading ? <Spinner color="current" size="sm" /> : <RefreshCw className="size-4" />}
                Refresh
              </Button>
            </div>

            <div className="thin-scrollbar overflow-x-auto px-3 pb-3">
              <table className="w-full min-w-[720px] border-separate border-spacing-y-1 text-left text-[13px]">
                <thead>
                  <tr className="text-[11px] font-semibold text-muted">
                    {def.columns.map((column) => {
                      const sorted = report.sort?.key === column.key ? report.sort.dir : null;
                      return (
                        <th
                          aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                          className={`whitespace-nowrap px-3 py-2 ${column.align === "right" ? "text-right" : ""}`}
                          key={column.key}
                        >
                          <button
                            className={`inline-flex items-center gap-1 rounded-md outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent ${sorted ? "text-foreground" : ""}`}
                            type="button"
                            onClick={() => report.toggleSort(column.key)}
                          >
                            {column.label}
                            {sorted === "asc" ? <ArrowUp className="size-3" /> : sorted === "desc" ? <ArrowDown className="size-3" /> : null}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {report.isLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={index}>
                        <td className="rounded-[12px] bg-surface-secondary/50 p-3" colSpan={def.columns.length}>
                          <div className="h-4 w-2/3 animate-pulse rounded-md bg-default-200" />
                        </td>
                      </tr>
                    ))
                  ) : report.pageRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-12 text-center text-sm font-medium text-muted" colSpan={def.columns.length}>
                        {report.rows.length === 0 ? "No data for this report yet." : "Nothing matches these dates and filters. Try widening them."}
                      </td>
                    </tr>
                  ) : (
                    report.pageRows.map((row, rowIndex) => (
                      <tr className="group" key={rowIndex}>
                        {def.columns.map((column, columnIndex) => {
                          const value = column.value(row);
                          const tone = column.tone?.(row);
                          const isNumber = typeof value === "number";
                          return (
                            <td
                              className={`max-w-[240px] truncate whitespace-nowrap bg-surface-secondary/40 px-3 py-2.5 text-foreground transition group-hover:bg-surface-secondary ${columnIndex === 0 ? "rounded-l-[12px] font-medium" : ""} ${columnIndex === def.columns.length - 1 ? "rounded-r-[12px]" : ""} ${isNumber || column.align === "right" ? "text-right tabular-nums" : ""}`}
                              key={column.key}
                              title={value === null ? undefined : String(value)}
                            >
                              {value === null || value === "" ? (
                                <span className="text-muted">—</span>
                              ) : tone ? (
                                <Chip color={tone} size="sm" variant="soft">{value}</Chip>
                              ) : isNumber ? (
                                value.toLocaleString()
                              ) : (
                                value
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[12px] text-muted">
              <span>
                Showing {report.filtered.length === 0 ? 0 : (report.page - 1) * REPORT_PAGE_SIZE + 1}–{Math.min(report.page * REPORT_PAGE_SIZE, report.filtered.length)} · Page {report.page} of {report.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button isDisabled={report.isLoading || report.page <= 1} size="sm" variant="secondary" onPress={() => report.setPage(report.page - 1)}>
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button isDisabled={report.isLoading || report.page >= report.totalPages} size="sm" variant="secondary" onPress={() => report.setPage(report.page + 1)}>
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[72px]">
          <section aria-label="Filters" className="rounded-[20px] bg-surface p-5 apple-shadow dark:border dark:border-default-100">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold text-foreground">Filters</p>
              {report.hasNarrowing ? (
                <button
                  className="inline-flex items-center gap-1 rounded-md text-[12px] font-medium text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
                  type="button"
                  onClick={report.clearAll}
                >
                  <X className="size-3.5" />
                  Reset
                </button>
              ) : null}
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                aria-label={def.searchPlaceholder}
                className="h-9 w-full rounded-xl border border-border bg-surface-secondary pl-9 pr-3 text-[13px] outline-none transition focus:border-accent"
                placeholder={def.searchPlaceholder}
                value={report.search}
                onChange={(event) => report.setSearch(event.target.value)}
              />
            </div>

            <FilterGroup label="Date range">
              <DateRangeFilter
                allowAllTime={!def.serverRange}
                layout="chips"
                preset={report.preset}
                range={report.range}
                onPreset={report.setPreset}
                onRange={report.setCustomRange}
              />
            </FilterGroup>

            {def.dateFields && def.dateFields.length > 1 && report.dateField ? (
              <FilterGroup label="Apply dates to">
                <ChipChoice
                  options={def.dateFields.map((field) => ({ value: field.key, label: field.label }))}
                  value={report.dateField.key}
                  onChange={report.setDateFieldKey}
                />
              </FilterGroup>
            ) : null}

            {def.filters.map((filter) => {
              const options = report.filterOptions[filter.key] ?? [];
              const value = report.filterValues[filter.key] ?? "";
              return (
                <FilterGroup key={filter.key} label={filter.label}>
                  {options.length <= MAX_CHIP_OPTIONS ? (
                    <ChipChoice options={[{ value: "", label: "All" }, ...options]} value={value} onChange={(next) => report.setFilter(filter.key, next)} />
                  ) : (
                    <FilterMenu label={filter.label} options={[{ value: "", label: filter.allLabel }, ...options]} value={value} onChange={(next) => report.setFilter(filter.key, next)} />
                  )}
                </FilterGroup>
              );
            })}
          </section>

          <section aria-label="Export" className="rounded-[20px] bg-surface p-5 apple-shadow dark:border dark:border-default-100">
            <p className="text-[14px] font-semibold text-foreground">Download</p>
            <p className="mt-0.5 text-[12px] text-muted">Exports every matching row, not just this page.</p>
            <div aria-label="Export format" className="mt-4 grid grid-cols-3 gap-2" role="radiogroup">
              {EXPORT_FORMATS.map((item) => {
                const isActive = item.id === format;
                return (
                  <button
                    aria-checked={isActive}
                    className={`rounded-[14px] border px-3 py-2.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${
                      isActive ? "border-accent bg-accent/5" : "border-border/70 hover:border-foreground/20"
                    }`}
                    key={item.id}
                    role="radio"
                    type="button"
                    onClick={() => setFormat(item.id)}
                  >
                    <span className="flex items-center justify-between text-[13px] font-semibold text-foreground">
                      {item.label}
                      {isActive ? <Check className="size-3.5 text-accent" /> : null}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-muted">.{item.extension}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 min-h-8 text-[12px] leading-4 text-muted">{chosenFormat.description}.</p>
            <Button className="mt-3 w-full" isDisabled={report.isLoading || report.filtered.length === 0} variant="primary" onPress={() => exportReport(report.dataset, format)}>
              <Download className="size-4" />
              Download {chosenFormat.label} ({report.filtered.length.toLocaleString()} rows)
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      {children}
    </div>
  );
}

function ChipChoice({ options, value, onChange }: { options: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            aria-checked={isActive}
            className={`h-7 rounded-full px-3 text-[12px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${
              isActive ? "bg-foreground text-background" : "bg-surface-secondary text-foreground hover:bg-surface-tertiary"
            }`}
            key={option.value || "all"}
            role="radio"
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
