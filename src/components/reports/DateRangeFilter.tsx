import { DateField, DateRangePicker, RangeCalendar } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Calendar } from "lucide-react";
import { FilterMenu } from "../mailer/FilterMenu";
import { DATE_PRESETS, type DatePresetId, type DateRange } from "../../utils/dateRange";

interface DateRangeFilterProps {
  preset: DatePresetId;
  range: DateRange | null;
  /** Reports whose server needs real dates cannot offer "All time". */
  allowAllTime: boolean;
  onPreset: (preset: DatePresetId) => void;
  onRange: (range: DateRange) => void;
  /** "menu": one pill for presets next to the picker. "chips": every preset visible as a chip above it. */
  layout: "menu" | "chips";
  className?: string;
}

/** Date range for a report: quick presets plus a calendar picker for any custom range. */
export function DateRangeFilter({ preset, range, allowAllTime, onPreset, onRange, layout, className = "" }: DateRangeFilterProps) {
  // "Custom range" is not a button of its own: picking dates in the calendar selects it.
  const presets = DATE_PRESETS.filter((item) => item.id !== "custom" && (allowAllTime || item.id !== "all_time"));

  return (
    <div className={`${layout === "chips" ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2"} ${className}`}>
      {layout === "menu" ? (
        <FilterMenu
          icon={Calendar}
          label="Period"
          // The default preset is the empty choice so the pill stays untinted until someone changes it.
          options={[
            { value: "", label: "Last 30 days" },
            ...presets.filter((item) => item.id !== "last_30_days").map((item) => ({ value: item.id, label: item.label })),
            { value: "custom", label: "Custom range" },
          ]}
          value={preset === "last_30_days" ? "" : preset}
          onChange={(value) => onPreset((value || "last_30_days") as DatePresetId)}
        />
      ) : (
        <div aria-label="Date range presets" className="flex flex-wrap gap-1.5" role="radiogroup">
          {[...presets, DATE_PRESETS.find((item) => item.id === "custom")!].map((item) => {
            const isActive = preset === item.id;
            return (
              <button
                aria-checked={isActive}
                className={`h-7 rounded-full px-3 text-[12px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${
                  isActive ? "bg-foreground text-background" : "bg-surface-secondary text-foreground hover:bg-surface-tertiary"
                }`}
                key={item.id}
                role="radio"
                type="button"
                onClick={() => onPreset(item.id)}
              >
                {item.short}
              </button>
            );
          })}
        </div>
      )}
      <RangePicker preset={preset} range={range} wide={layout === "chips"} onChange={onRange} />
    </div>
  );
}

function RangePicker({ preset, range, wide, onChange }: { preset: DatePresetId; range: DateRange | null; wide: boolean; onChange: (range: DateRange) => void }) {
  return (
    <DateRangePicker
      aria-label="Custom date range"
      className={wide ? "w-full" : "w-[300px]"}
      value={range ? { start: parseDate(range.start), end: parseDate(range.end) } : null}
      onChange={(value: { start: DateValue; end: DateValue } | null) => {
        if (value) onChange({ start: value.start.toString(), end: value.end.toString() });
      }}
    >
      <DateField.Group
        className={`h-8 rounded-full px-3 text-[12px] font-medium text-foreground ${preset === "custom" ? "ring-1 ring-accent/50" : ""}`}
        fullWidth
        variant="primary"
      >
        <DateField.Input slot="start">{(segment: any) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateRangePicker.RangeSeparator />
        <DateField.Input slot="end">{(segment: any) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateRangePicker.Trigger className="ml-auto grid size-6 place-items-center rounded-full text-muted transition hover:bg-surface-tertiary hover:text-foreground">
          <DateRangePicker.TriggerIndicator />
        </DateRangePicker.Trigger>
      </DateField.Group>
      <DateRangePicker.Popover>
        <RangeCalendar aria-label="Pick a date range">
          <RangeCalendar.Header>
            <RangeCalendar.NavButton slot="previous" />
            <RangeCalendar.Heading />
            <RangeCalendar.NavButton slot="next" />
          </RangeCalendar.Header>
          <RangeCalendar.Grid>
            <RangeCalendar.GridHeader>{(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}</RangeCalendar.GridHeader>
            <RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
          </RangeCalendar.Grid>
        </RangeCalendar>
      </DateRangePicker.Popover>
    </DateRangePicker>
  );
}
