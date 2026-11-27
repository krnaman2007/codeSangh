export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-white/[0.06] ${className}`.trim()}
    />
  );
}

export function ProjectCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl glass-surface p-5 flex flex-col justify-between min-h-[168px]"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-3 w-28 mt-3" />
        <Skeleton className="h-3 w-44 mt-6" />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center -space-x-1.5">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
