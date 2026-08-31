import { Card, Chip } from "@heroui/react";
import { ArrowUpRight } from "lucide-react";
import type { Metric } from "../../types";

export function MetricCard({ metric }: { metric: Metric }) {
  const chipColor = metric.tone === "danger" || metric.tone === "warning" ? "danger" : "success";

  return (
    <Card className="metric-card apple-shadow h-[100px] border border-transparent bg-surface px-4 py-4 dark:border-default-100">
      <Card.Content className="relative flex h-full p-0">
        <dt className="text-[14px] font-medium leading-5 text-default-500">{metric.label}</dt>
        <dd className="mt-auto pb-1 text-[25px] font-semibold leading-none tracking-normal text-default-700">
          {metric.value}
        </dd>
        <Chip
          className="absolute bottom-1 right-0 h-[20px] min-h-[20px] px-2 text-[11px] font-semibold leading-none"
          color={chipColor}
          size="sm"
          variant="soft"
        >
          <span className="inline-flex items-center gap-0.5">
            <ArrowUpRight className="size-3" />
            {metric.change}
          </span>
        </Chip>
      </Card.Content>
    </Card>
  );
}
