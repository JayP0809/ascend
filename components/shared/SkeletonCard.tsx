import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 h-72">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 h-72">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
