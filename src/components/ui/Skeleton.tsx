export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-default-200 ${className}`} />;
}

export function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      {Array.from({ length: columns }).map((_, index) => (
        <td className="px-4 py-4" key={index}>
          <Skeleton className="h-4 w-full max-w-[140px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-3 ${className}`}>
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  );
}
