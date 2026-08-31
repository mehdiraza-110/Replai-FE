import { Chip } from "@heroui/react";
import type { StatusTone } from "../../types";

interface StatusPillProps {
  children: React.ReactNode;
  tone?: StatusTone;
}

export function StatusPill({ children, tone = "default" }: StatusPillProps) {
  return (
    <Chip className="whitespace-nowrap px-2 text-[11px] font-medium" color={tone} size="sm" variant="soft">
      {children}
    </Chip>
  );
}
