export function GameCardSkeleton() {
  return (
    <div className="glass-card px-4 py-3" aria-hidden="true">
      {/* Status row skeleton */}
      <div className="flex items-center justify-between mb-3">
        <div className="glass-skeleton h-3 w-16" />
        <div className="glass-skeleton h-3 w-14" />
      </div>

      {/* Teams + Score row skeleton */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="glass-skeleton h-7 w-7 !rounded-full shrink-0" />
          <div className="glass-skeleton h-4 w-10" />
        </div>
        <div className="glass-skeleton h-5 w-14 shrink-0" />
        <div className="flex items-center gap-2.5 flex-1 justify-end">
          <div className="glass-skeleton h-4 w-10" />
          <div className="glass-skeleton h-7 w-7 !rounded-full shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function GameGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  );
}
