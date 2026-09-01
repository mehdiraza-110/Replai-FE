import { Spinner } from "@heroui/react";

/**
 * Centered circular loader for a card, panel, or table body while its data
 * is loading. Use inside a container with enough height to center against
 * (pass `minHeight` for a fixed-height slot, e.g. a table's empty body).
 */
export function LoadingState({
  label,
  minHeight = 160,
  size = "lg",
}: {
  label?: string;
  minHeight?: number;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 py-10" style={{ minHeight }}>
      <Spinner color="accent" size={size} />
      {label ? <p className="text-sm font-medium text-muted">{label}</p> : null}
    </div>
  );
}
