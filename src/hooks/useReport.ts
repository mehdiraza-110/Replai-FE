import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportDef, ReportOption } from "../reports/types";
import { rangeForPreset, formatRangeLabel, isInRange, type DatePresetId, type DateRange } from "../utils/dateRange";
import type { ReportDataset } from "../utils/reportExport";

export const REPORT_PAGE_SIZE = 20;

type SortState = { key: string; dir: "asc" | "desc" } | null;

function compareCells(a: string | number | null, b: string | number | null) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/**
 * Everything a report screen needs: loading, date range, filters, search, sorting, paging, and the
 * finished dataset for export. The two Reports pages differ only in how they present this.
 */
export function useReport<T>(def: ReportDef<T>) {
  const [preset, setPresetState] = useState<DatePresetId>("last_30_days");
  const [range, setRange] = useState<DateRange | null>(() => rangeForPreset("last_30_days"));
  const [dateFieldKey, setDateFieldKey] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>(def.defaultSort ?? null);
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<{ id: string; rows: T[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestRef = useRef(0);

  // Switching report starts its filters, sort and search fresh; the chosen dates carry over.
  useEffect(() => {
    setFilterValues({});
    setSearch("");
    setSort(def.defaultSort ?? null);
    setDateFieldKey("");
    setPage(1);
    if (def.serverRange && preset === "all_time") {
      setPresetState("last_30_days");
      setRange(rangeForPreset("last_30_days"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id]);

  const rangeKey = def.serverRange ? `${range?.start ?? ""}:${range?.end ?? ""}` : "";

  useEffect(() => {
    const request = ++requestRef.current;
    setIsLoading(true);
    setError(null);
    def
      .load(range ?? (def.serverRange ? rangeForPreset("last_30_days") : null))
      .then((rows) => {
        if (request === requestRef.current) setLoaded({ id: def.id, rows });
      })
      .catch((requestError) => {
        if (request !== requestRef.current) return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load this report");
        setLoaded({ id: def.id, rows: [] });
      })
      .finally(() => {
        if (request === requestRef.current) setIsLoading(false);
      });
    // The range only matters here when the server applies it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id, rangeKey, reloadToken]);

  // Rows from a previous report must never be read through the new report's columns.
  const rows = useMemo(() => (loaded && loaded.id === def.id ? loaded.rows : []), [loaded, def.id]);
  const dateField = def.dateFields?.find((field) => field.key === dateFieldKey) ?? def.dateFields?.[0];

  const filterOptions = useMemo(() => {
    const resolved: Record<string, ReportOption[]> = {};
    for (const filter of def.filters) resolved[filter.key] = typeof filter.options === "function" ? filter.options(rows) : filter.options;
    return resolved;
  }, [def.filters, rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = rows.filter((row) => {
      if (dateField && !def.serverRange && !isInRange(dateField.get(row), range)) return false;
      for (const filter of def.filters) {
        const value = filterValues[filter.key];
        if (value && !filter.test(row, value)) return false;
      }
      return !query || def.search(row).toLowerCase().includes(query);
    });

    const column = sort ? def.columns.find((candidate) => candidate.key === sort.key) : undefined;
    if (!sort || !column) return matching;
    const read = column.sortValue ?? column.value;
    const direction = sort.dir === "asc" ? 1 : -1;
    return [...matching].sort((a, b) => direction * compareCells(read(a), read(b)));
  }, [rows, def, dateField, range, filterValues, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / REPORT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => filtered.slice((safePage - 1) * REPORT_PAGE_SIZE, safePage * REPORT_PAGE_SIZE), [filtered, safePage]);
  const kpis = useMemo(() => def.kpis(filtered), [def, filtered]);

  const breakdown = useMemo(() => {
    if (!def.breakdown) return [];
    const counts = new Map<string, number>();
    for (const row of filtered) {
      const key = def.breakdown.get(row) || "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  }, [def, filtered]);

  const activeFilters = def.filters
    .map((filter) => {
      const value = filterValues[filter.key];
      const option = value ? filterOptions[filter.key]?.find((candidate) => candidate.value === value) : undefined;
      return option ? { key: filter.key, label: filter.label, text: option.label } : null;
    })
    .filter((entry): entry is { key: string; label: string; text: string } => entry !== null);

  const dataset: ReportDataset = useMemo(() => {
    const meta: ReportDataset["meta"] = [["Date range", formatRangeLabel(range)]];
    if (dateField && !def.serverRange) meta.push(["Dates filtered by", dateField.label]);
    meta.push(["Filters", activeFilters.length ? activeFilters.map((entry) => `${entry.label}: ${entry.text}`).join("; ") : "None"]);
    if (search.trim()) meta.push(["Search", search.trim()]);
    return {
      title: def.label,
      meta,
      columns: def.columns.map(({ key, label, align }) => ({ key, label, align })),
      rows: filtered.map((row) => Object.fromEntries(def.columns.map((column) => [column.key, column.value(row)]))),
    };
  }, [def, filtered, range, dateField, activeFilters, search]);

  const setPreset = useCallback((next: DatePresetId) => {
    setPresetState(next);
    if (next !== "custom") setRange(rangeForPreset(next));
    setPage(1);
  }, []);

  const setCustomRange = useCallback((next: DateRange) => {
    setPresetState("custom");
    setRange(next);
    setPage(1);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilterValues((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  const toggleSort = useCallback((key: string) => {
    setSort((current) => (current?.key !== key ? { key, dir: "asc" } : current.dir === "asc" ? { key, dir: "desc" } : null));
    setPage(1);
  }, []);

  const clearAll = useCallback(() => {
    setFilterValues({});
    setSearch("");
    setPage(1);
  }, []);

  return {
    preset,
    range,
    setPreset,
    setCustomRange,
    dateField,
    setDateFieldKey,
    filterValues,
    filterOptions,
    setFilter,
    activeFilters,
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    sort,
    toggleSort,
    page: safePage,
    setPage,
    totalPages,
    rows,
    filtered,
    pageRows,
    kpis,
    breakdown,
    dataset,
    isLoading,
    error,
    reload: () => setReloadToken((token) => token + 1),
    clearAll,
    hasNarrowing: activeFilters.length > 0 || search.trim() !== "",
  };
}
