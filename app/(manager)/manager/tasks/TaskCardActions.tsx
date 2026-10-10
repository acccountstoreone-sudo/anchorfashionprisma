"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreHorizontal,
  Play,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  updateTaskAction,
  deleteTaskAction,
} from "@/app/actions/manager/task.actions";
import { toast } from "sonner";
import type { ManagerTask } from "@/lib/repositories/manager/task.repository";

interface TaskCardActionsProps {
  task: ManagerTask;
}

export function TaskCardActions({ task }: TaskCardActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleStatusChange = async (newStatus: ManagerTask["status"]) => {
    try {
      setLoading(true);
      const res = await updateTaskAction(task.id, { status: newStatus });
      if (res.success) {
        toast.success(`Task moved to ${newStatus.replace("_", " ")}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update task");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const res = await deleteTaskAction(task.id);
      if (res.success) {
        toast.success("Task deleted successfully");
        setDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete task");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {task.status === "pending" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            disabled={loading}
            onClick={() => handleStatusChange("in_progress")}
            title="Start working on task"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Start
              </>
            )}
          </Button>
        )}

        {task.status === "in_progress" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            disabled={loading}
            onClick={() => handleStatusChange("completed")}
            title="Mark as completed"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Complete
              </>
            )}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span className="sr-only">Task actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {task.status !== "pending" && (
              <DropdownMenuItem onClick={() => handleStatusChange("pending")}>
                <RotateCcw className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                Move to To Do
              </DropdownMenuItem>
            )}

            {task.status !== "in_progress" && (
              <DropdownMenuItem
                onClick={() => handleStatusChange("in_progress")}
              >
                <Play className="mr-2 h-3.5 w-3.5 text-blue-500" />
                In Progress
              </DropdownMenuItem>
            )}

            {task.status !== "completed" && (
              <DropdownMenuItem
                onClick={() => handleStatusChange("completed")}
              >
                <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                Mark Completed
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{task.title}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={loading}
              onClick={handleDelete}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
