import { useState } from "react";
import { Button, Dropdown, Spinner } from "@heroui/react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, FileText, ListFilter, RefreshCw, Search, X } from "lucide-react";
import { FilterMenu } from "../components/mailer/FilterMenu";
import { DateRangeFilter } from "../components/reports/DateRangeFilter";
import { SkeletonRow } from "../components/ui/Skeleton";
import { REPORT_PAGE_SIZE, useReport } from "../hooks/useReport";
import { MAILER_REPORTS } from "../reports/mailerReports";
import type { ReportTone } from "../reports/types";
import { EXPORT_FORMATS, exportReport, type ExportFormat } from "../utils/reportExport";

const toneClass: Record<ReportTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

/**
 * Cold Mailer reports: a ledger. A catalog of reports on the left, one dense toolbar of filters,
 * a hairline-divided figures strip, and a sortable table that is the main surface.
 */
export function MailerReports() {
  const [reportId, setReportId] = useState(MAILER_REPORTS[0].id);
  const def = MAILER_REPORTS.find((report) => report.id === reportId) ?? MAILER_REPORTS[0];
  const report = useReport(def);
  const from = report.filtered.length === 0 ? 0 : (report.page - 1) * REPORT_PAGE_SIZE + 1;
  const to = Math.min(report.page * REPORT_PAGE_SIZE, report.filtered.length);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Reports</h2>
          <p className="mt-0.5 text-[13px] text-muted">Pull sending, mailbox and domain figures for any period, then export them.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button isDisabled={report.isLoading} size="sm" variant="secondary" onPress={report.reload}>
            {report.isLoading ? <Spinner color="current" size="sm" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
          <Dropdown>
            <Dropdown.Trigger
              aria-label="Export report"
              className={`inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[13px] font-medium text-accent-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                report.isLoading || report.filtered.length === 0 ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <Download className="size-4" />
              Export
              <span className="text-[11px] opacity-80">{report.filtered.length.toLocaleString()} rows</span>
            </Dropdown.Trigger>
            <Dropdown.Popover className="w-[260px]" placement="bottom end">
              <Dropdown.Menu aria-label="Export format" onAction={(key) => exportReport(report.dataset, String(key) as ExportFormat)}>
                {EXPORT_FORMATS.map((format) => (
                  <Dropdown.Item id={format.id} key={format.id}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-default-100 text-foreground">
                      <FileText className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold leading-4 text-foreground">
                        {format.label} <span className="font-normal text-muted">.{format.extension}</span>
                      </span>
                      <span className="block truncate text-[11px] leading-4 text-muted">{format.description}</span>
                    </span>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)]">
        <nav aria-label="Report types" className="h-fit overflow-hidden rounded-2xl border border-border/70 bg-surface lg:sticky lg:top-[72px]">
          <p className="border-b border-border/70 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Report</p>
          <ul className="flex gap-0 overflow-x-auto lg:block lg:overflow-visible">
            {MAILER_REPORTS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === def.id;
              return (
                <li className="min-w-[200px] shrink-0 border-b border-border/60 last:border-b-0 lg:min-w-0" key={item.id}>
                  <button
                    aria-current={isActive ? "page" : undefined}
                    className={`flex w-full items-start gap-2.5 border-l-2 px-4 py-3 text-left outline-none transition focus-visible:bg-surface-secondary ${
                      isActive ? "border-accent bg-surface-secondary/70" : "border-transparent hover:bg-surface-secondary/50"
                    }`}
                    type="button"
                    onClick={() => setReportId(item.id)}
                  >
                    <Icon className={`mt-0.5 size-4 shrink-0 ${isActive ? "text-accent" : "text-muted"}`} />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-4 text-foreground">{item.label}</span>
                      <span className="mt-1 block text-[11px] leading-4 text-muted">{item.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-4">
          <section aria-label="Filters" className="rounded-2xl border border-border/70 bg-surface">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
              <div className="relative w-full max-w-[300px]">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  aria-label={def.searchPlaceholder}
                  className="h-8 w-full rounded-full border border-border bg-surface-secondary pl-9 pr-3 text-[12px] outline-none transition focus:border-accent"
                  placeholder={def.searchPlaceholder}
                  value={report.search}
                  onChange={(event) => report.setSearch(event.target.value)}
                />
              </div>
              <span aria-hidden className="mx-1 hidden h-5 w-px bg-border sm:block" />
              <DateRangeFilter
                allowAllTime={!def.serverRange}
                layout="menu"
                preset={report.preset}
                range={report.range}
                onPreset={report.setPreset}
                onRange={report.setCustomRange}
              />
              {def.dateFields && def.dateFields.length > 1 && report.dateField ? (
                <FilterMenu
                  label="Dates by"
                  options={def.dateFields.map((field, index) => ({ value: index === 0 ? "" : field.key, label: field.label }))}
                  value={report.dateField.key === def.dateFields[0].key ? "" : report.dateField.key}
                  onChange={(value) => report.setDateFieldKey(value || def.dateFields![0].key)}
                />
              ) : null}
            </div>
            {def.filters.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                <ListFilter className="size-4 text-muted" />
                {def.filters.map((filter) => (
                  <FilterMenu
                    key={filter.key}
                    label={filter.label}
                    options={[{ value: "", label: filter.allLabel }, ...(report.filterOptions[filter.key] ?? [])]}
                    value={report.filterValues[filter.key] ?? ""}
                    onChange={(value) => report.setFilter(filter.key, value)}
                  />
                ))}
                {report.hasNarrowing ? (
                  <button
                    className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium text-muted outline-none transition hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
                    type="button"
                    onClick={report.clearAll}
                  >
                    <X className="size-3.5" />
                    Clear ({report.activeFilters.length + (report.search.trim() ? 1 : 0)})
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>

          {report.error ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              <span>{report.error}</span>
              <Button size="sm" variant="secondary" onPress={report.reload}>Retry</Button>
            </div>
          ) : null}

          <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border/70 bg-surface lg:grid-cols-4">
            {report.kpis.map((item, index) => (
              <div
                className={`px-4 py-3 ${index > 0 ? "lg:border-l lg:border-border/70" : ""} ${index % 2 === 1 ? "border-l border-border/70" : ""} ${index > 1 ? "border-t border-border/70 lg:border-t-0" : ""}`}
                key={item.label}
              >
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">{item.label}</dt>
                <dd className={`mt-1 font-mono text-[20px] font-semibold leading-6 tabular-nums ${item.tone ? toneClass[item.tone] : "text-foreground"}`}>
                  {report.isLoading ? "—" : item.value}
                </dd>
                {item.hint ? <p className="font-mono text-[11px] text-muted">{item.hint}</p> : null}
              </div>
            ))}
          </dl>

          <section className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
              <p className="text-[13px] font-semibold text-foreground">{def.label}</p>
              <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
                {report.isLoading ? (
                  <>
                    <Spinner color="accent" size="sm" /> Loading…
                  </>
                ) : (
                  `${from.toLocaleString()}–${to.toLocaleString()} of ${report.filtered.length.toLocaleString()}`
                )}
              </p>
            </div>
            <div className="thin-scrollbar max-h-[640px] overflow-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 z-10 bg-surface-secondary text-[10px] uppercase tracking-wide text-muted">
                  <tr>
                    {def.columns.map((column) => {
                      const sorted = report.sort?.key === column.key ? report.sort.dir : null;
                      const SortIcon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
                      return (
                        <th
                          aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                          className={`whitespace-nowrap px-3 py-2 font-semibold first:pl-4 last:pr-4 ${column.align === "right" ? "text-right" : ""}`}
                          key={column.key}
                        >
                          <button
                            className={`inline-flex items-center gap-1 uppercase outline-none transition hover:text-foreground focus-visible:text-foreground ${sorted ? "text-foreground" : ""}`}
                            type="button"
                            onClick={() => report.toggleSort(column.key)}
                          >
                            {column.label}
                            <SortIcon className={`size-3 ${sorted ? "" : "opacity-40"}`} />
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {report.isLoading ? (
                    Array.from({ length: 8 }).map((_, index) => <SkeletonRow columns={def.columns.length} key={index} />)
                  ) : report.pageRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-12 text-center text-sm font-medium text-muted" colSpan={def.columns.length}>
                        {report.rows.length === 0 ? "No data for this report yet." : "Nothing matches these dates and filters."}
                      </td>
                    </tr>
                  ) : (
                    report.pageRows.map((row, rowIndex) => (
                      <tr className="border-t border-border/60 transition hover:bg-surface-secondary/60" key={rowIndex}>
                        {def.columns.map((column) => {
                          const value = column.value(row);
                          const tone = column.tone?.(row);
                          const isNumber = typeof value === "number";
                          return (
                            <td
                              className={`max-w-[260px] truncate whitespace-nowrap px-3 py-2 first:pl-4 last:pr-4 ${isNumber || column.align === "right" ? "text-right font-mono tabular-nums" : ""} ${tone ? `${toneClass[tone]} font-medium` : "text-foreground"}`}
                              key={column.key}
                              title={value === null ? undefined : String(value)}
                            >
                              {value === null || value === "" ? <span className="text-muted">—</span> : isNumber ? value.toLocaleString() : value}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-2.5 text-[12px] text-muted">
              <span className="font-mono">Page {report.page} / {report.totalPages}</span>
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
      </div>
    </div>
  );
}
