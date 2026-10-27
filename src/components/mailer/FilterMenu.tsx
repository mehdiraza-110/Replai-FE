import { Dropdown } from "@heroui/react";
import { Check, ChevronDown } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

const ANY_KEY = "__any";

/** Pill-style dropdown: shows its label, plus the current choice and an accent tint while a filter is set. */
export function FilterMenu({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const current = options.find((option) => option.value === value) ?? options[0];
  const isSet = value !== "" && value !== "default";

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={`${label}: ${current.label}`}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${
          isSet
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-border bg-surface text-foreground hover:bg-surface-secondary"
        }`}
      >
        {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
        <span className={isSet ? "text-accent/80" : "text-muted"}>{label}</span>
        {isSet ? <span className="max-w-[160px] truncate font-semibold">{current.label}</span> : null}
        <ChevronDown className="size-3.5 shrink-0 opacity-70" />
      </Dropdown.Trigger>
      <Dropdown.Popover className="min-w-[200px]" placement="bottom start">
        <Dropdown.Menu aria-label={label} onAction={(key) => onChange(key === ANY_KEY ? "" : String(key))}>
          {options.map((option) => {
            const selected = option.value === current.value;
            return (
              <Dropdown.Item id={option.value === "" ? ANY_KEY : option.value} key={option.value || ANY_KEY}>
                <span className={`flex-1 text-[13px] ${selected ? "font-semibold text-foreground" : "text-foreground"}`}>{option.label}</span>
                {selected ? <Check className="size-4 shrink-0 text-accent" /> : null}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
