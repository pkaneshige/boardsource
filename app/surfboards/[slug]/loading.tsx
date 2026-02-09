import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      <nav className="flex items-center space-x-2">
        <Skeleton className="h-4 w-20" />
        <span className="text-gray-500">/</span>
        <Skeleton className="h-4 w-40" />
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="mt-2 h-6 w-1/3" />
          </div>

          <Skeleton className="h-10 w-1/4" />

          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-6 w-24" />
              </div>
            ))}
          </div>

          <div>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </div>

          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
