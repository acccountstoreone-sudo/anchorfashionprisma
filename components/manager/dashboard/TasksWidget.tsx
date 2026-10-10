import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertTriangle, Circle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { fetchTasksAction } from "@/app/actions/manager/task.actions";
import type { ManagerTask } from "@/lib/repositories/manager/task.repository";

const priorityConfig: Record<
  ManagerTask["priority"],
  { label: string; className: string }
> = {
  low: { label: "Low", className: "bg-slate-100 text-slate-700" },
  medium: { label: "Medium", className: "bg-blue-100 text-blue-700" },
  high: { label: "High", className: "bg-orange-100 text-orange-700" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700" },
};

const StatusIcon = ({ status }: { status: ManagerTask["status"] }) => {
  if (status === "completed")
    return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (status === "in_progress")
    return <Clock className="h-4 w-4 text-blue-500 shrink-0" />;
  if (status === "pending")
    return <Circle className="h-4 w-4 text-muted-foreground shrink-0" />;
  return <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />;
};

export async function TasksWidget() {
  const result = await fetchTasksAction();
  const safeData = Array.isArray(result?.data) ? result.data : [];
  const tasks: ManagerTask[] = safeData
    .filter((t: ManagerTask) => t.status !== "archived" && t.status !== "completed")
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Active operational tasks.</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/manager/tasks">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            ✅ No pending tasks right now.
          </p>
        ) : (
          tasks.map((task) => {
            const priority = priorityConfig[task.priority];
            return (
              <div key={task.id} className="flex items-start gap-3">
                <StatusIcon status={task.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug truncate">
                    {task.title}
                  </p>
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Badge className={`text-xs shrink-0 ${priority.className}`}>
                  {priority.label}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
