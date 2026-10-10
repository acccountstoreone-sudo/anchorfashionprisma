import { cn } from "@/lib/utils";

export function SkeletonProduct({ className }: { className?: string }) {
  return (
    <div className={cn("group relative flex flex-col gap-4", className)}>
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100 animate-pulse" />
      <div className="flex flex-col gap-2">
        <div className="flex justify-between">
          <div className="h-3 w-1/3 bg-gray-200 animate-pulse" />
          <div className="h-3 w-1/4 bg-gray-200 animate-pulse" />
        </div>
        <div className="h-4 w-2/3 bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}
