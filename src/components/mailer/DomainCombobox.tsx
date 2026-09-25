import { useEffect, useRef, useState } from "react";
import { Chip, Spinner } from "@heroui/react";
import { ChevronDown, Search } from "lucide-react";
import { domainService } from "../../services/api";
import type { Domain } from "../../types";

export function DomainCombobox({
  value,
  onChange,
  placeholder = "Search domains…",
}: {
  value: string;
  onChange: (domain: Domain) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);
    const timeout = window.setTimeout(async () => {
      try {
        const page = await domainService.list({ page: 1, limit: 20, search: query });
        setResults(page.items);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to search domains");
      } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query, isOpen]);

  function select(domain: Domain) {
    onChange(domain);
    setIsOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface-secondary px-3 text-left text-sm outline-none transition focus:border-accent"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className={value ? "text-foreground" : "text-muted"}>{value || placeholder}</span>
        <ChevronDown className="size-4 shrink-0 text-muted" />
      </button>

      {isOpen ? (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-border/70 bg-surface shadow-lg">
          <div className="relative border-b border-border/70 p-2">
            <Search className="absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <input
              autoFocus
              className="h-9 w-full rounded-lg border border-border bg-surface-secondary pl-8 pr-3 text-[13px] outline-none transition focus:border-accent"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type to search onboarded domains…"
              value={query}
            />
          </div>
          <div className="max-h-[260px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-[12px] text-muted">
                <Spinner color="accent" size="sm" />
                Searching…
              </div>
            ) : error ? (
              <p className="px-4 py-6 text-center text-[12px] text-danger">{error}</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-muted">No domains match "{query}".</p>
            ) : (
              results.map((domain) => (
                <button
                  className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-[13px] transition hover:bg-surface-secondary/60 ${domain.domain === value ? "bg-accent/5" : ""}`}
                  key={domain.domain}
                  onClick={() => select(domain)}
                  type="button"
                >
                  <span className="truncate font-medium text-foreground">{domain.domain}</span>
                  <Chip color={domain.status === "Verified" ? "success" : "warning"} size="sm" variant="soft">
                    {domain.status}
                  </Chip>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
