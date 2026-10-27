import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  noun?: string;
}

/** Page numbers around the current page, with first/last always reachable: [1, …, 4, 5, 6, …, 20]. */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((value) => pages.add(value));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((value) => pages.add(value));
  const sorted = Array.from(pages).filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push("gap");
    result.push(value);
  });
  return result;
}

export function Pagination({ page, totalPages, total, pageSize, isLoading, onPageChange, onPageSizeChange, pageSizeOptions = [10, 25, 50, 100], noun = "results" }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-[12px] text-muted">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          {total === 0 ? `No ${noun}` : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} ${noun}`}
        </span>
        {onPageSizeChange ? (
          <label className="flex items-center gap-1.5">
            Rows
            <select
              className="h-7 rounded-lg border border-border bg-surface-secondary px-1.5 text-[12px] text-foreground outline-none focus:border-accent"
              disabled={isLoading}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              value={pageSize}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button aria-label="Previous page" isDisabled={isLoading || page <= 1} isIconOnly onPress={() => onPageChange(page - 1)} size="sm" variant="secondary">
          <ChevronLeft className="size-4" />
        </Button>
        {pageWindow(page, totalPages).map((entry, index) =>
          entry === "gap" ? (
            <span className="px-1.5" key={`gap-${index}`}>…</span>
          ) : (
            <button
              aria-current={entry === page ? "page" : undefined}
              className={[
                "h-8 min-w-8 rounded-lg px-2 text-[12px] font-medium transition",
                entry === page ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-default-100",
              ].join(" ")}
              disabled={isLoading}
              key={entry}
              onClick={() => onPageChange(entry)}
              type="button"
            >
              {entry}
            </button>
          )
        )}
        <Button aria-label="Next page" isDisabled={isLoading || page >= totalPages} isIconOnly onPress={() => onPageChange(page + 1)} size="sm" variant="secondary">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
