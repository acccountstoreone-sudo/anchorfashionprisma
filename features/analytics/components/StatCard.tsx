import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  loading?: boolean;
  description?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  loading,
  description,
}: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-8 w-[120px]" />
          <Skeleton className="h-3 w-[150px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>

        {trend !== undefined && (
          <div className="mt-1 flex items-center text-xs">
            {trend > 0 ? (
              <span className="flex items-center rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-emerald-500">
                <ArrowUpIcon className="mr-1 h-3 w-3" />
                {trend}%
              </span>
            ) : trend < 0 ? (
              <span className="flex items-center rounded-sm bg-rose-500/10 px-1.5 py-0.5 text-rose-500">
                <ArrowDownIcon className="mr-1 h-3 w-3" />
                {Math.abs(trend)}%
              </span>
            ) : (
              <span className="flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-muted-foreground">
                <MinusIcon className="mr-1 h-3 w-3" />
                0%
              </span>
            )}
            <span className="ml-2 text-muted-foreground">
              vs previous period
            </span>
          </div>
        )}

        {description && !trend && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
