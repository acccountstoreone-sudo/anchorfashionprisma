import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-2 h-9 w-[250px]" />
        <Skeleton className="h-5 w-[400px]" />
      </div>

      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-10 w-[260px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="mb-2 h-8 w-[120px]" />
            <Skeleton className="h-4 w-[80px]" />
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border bg-card p-6">
        <Skeleton className="mb-4 h-6 w-[200px]" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );
}
