import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { AddTaskDialog } from "./AddTaskDialog";
import { TaskCardActions } from "./TaskCardActions";
import { fetchTasksAction } from "@/app/actions/manager/task.actions";
import { ManagerTask } from "@/lib/repositories/manager/task.repository";

export const metadata: Metadata = {
  title: "Tasks | Manager Dashboard",
  description: "Manage daily operational tasks and assignments.",
};

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  let safeTasks: ManagerTask[] = [];
  try {
    const res = await fetchTasksAction();
    safeTasks = Array.isArray(res?.data) ? res.data : [];
  } catch (err) {
    console.error("TasksPage fetchTasksAction failed:", err);
    safeTasks = [];
  }

  const pendingTasks = safeTasks.filter(
    (t: ManagerTask) => t.status === "pending"
  );
  const inProgressTasks = safeTasks.filter(
    (t: ManagerTask) => t.status === "in_progress"
  );
  const completedTasks = safeTasks.filter(
    (t: ManagerTask) => t.status === "completed"
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-500 font-bold";
      case "high":
        return "text-orange-500 font-semibold";
      case "medium":
        return "text-blue-500";
      case "low":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "No due date";
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Due Today";

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return "Due Tomorrow";

    return `Due ${d.toLocaleDateString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your daily operational tasks and assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddTaskDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Pending Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1 border-b">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              To Do
            </h2>
            <Badge variant="secondary">{pendingTasks.length}</Badge>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No tasks to do
            </div>
          ) : (
            pendingTasks.map((task: ManagerTask) => (
              <Card key={task.id} className="transition-all hover:shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-base font-semibold leading-snug line-clamp-2">
                    {task.title}
                  </CardTitle>
                  <TaskCardActions task={task} />
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-3">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between text-xs pt-1 border-t">
                    <span className={getPriorityColor(task.priority)}>
                      {formatDate(task.due_date)}
                    </span>
                    <span className="text-muted-foreground truncate max-w-[120px]" title={task.assignee_name || task.assigned_to || "General"}>
                      {task.assignee_name || task.assigned_to || task.related_entity_type || "General"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* In Progress Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1 border-b">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Clock className="h-4 w-4 text-blue-500" />
              In Progress
            </h2>
            <Badge variant="secondary">{inProgressTasks.length}</Badge>
          </div>

          {inProgressTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No tasks currently in progress
            </div>
          ) : (
            inProgressTasks.map((task: ManagerTask) => (
              <Card key={task.id} className="border-blue-200 dark:border-blue-900/50 transition-all hover:shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-base font-semibold leading-snug line-clamp-2">
                    {task.title}
                  </CardTitle>
                  <TaskCardActions task={task} />
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-3">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between text-xs pt-1 border-t">
                    <span className={getPriorityColor(task.priority)}>
                      {formatDate(task.due_date)}
                    </span>
                    <span className="text-muted-foreground truncate max-w-[120px]" title={task.assignee_name || task.assigned_to || "General"}>
                      {task.assignee_name || task.assigned_to || task.related_entity_type || "General"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Completed Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1 border-b">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Completed
            </h2>
            <Badge variant="secondary">{completedTasks.length}</Badge>
          </div>

          {completedTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No completed tasks
            </div>
          ) : (
            completedTasks.map((task: ManagerTask) => (
              <Card key={task.id} className="bg-muted/40 opacity-75 transition-all hover:opacity-100">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-base font-medium line-through text-muted-foreground line-clamp-2">
                    {task.title}
                  </CardTitle>
                  <TaskCardActions task={task} />
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-3">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between text-xs pt-1 border-t">
                    <span className="font-medium text-green-600 dark:text-green-400">Done</span>
                    <span className="text-muted-foreground truncate max-w-[120px]" title={task.assignee_name || task.assigned_to || "General"}>
                      {task.assignee_name || task.assigned_to || task.related_entity_type || "General"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
