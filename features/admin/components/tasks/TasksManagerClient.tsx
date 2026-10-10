"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ManagerTask } from "@/lib/repositories/manager/task.repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/features/admin/components/shared/ConfirmDialog";
import { AddTaskDialog } from "@/app/(manager)/manager/tasks/AddTaskDialog";
import {
  updateTaskAction,
  deleteTaskAction,
} from "@/app/actions/manager/task.actions";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TasksManagerClientProps {
  initialTasks?: ManagerTask[];
}

export function TasksManagerClient({ initialTasks = [] }: TasksManagerClientProps) {
  const router = useRouter();
  const safeInitialTasks = Array.isArray(initialTasks) ? initialTasks : [];
  const [tasks, setTasks] = useState<ManagerTask[]>(safeInitialTasks);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (Array.isArray(initialTasks)) {
      setTasks(initialTasks);
    }
  }, [initialTasks]);

  // Dialog states
  const [viewingTask, setViewingTask] = useState<ManagerTask | null>(null);
  const [editingTask, setEditingTask] = useState<ManagerTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<ManagerTask | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [editStatus, setEditStatus] = useState<"pending" | "in_progress" | "completed" | "archived">("pending");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignee, setEditAssignee] = useState("");

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [tasks, searchQuery, priorityFilter, statusFilter]);

  const pendingTasks = filteredTasks.filter((t) => t.status === "pending");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">High</Badge>;
      case "medium":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
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

  const handleOpenEdit = (task: ManagerTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditDueDate(task.due_date ? task.due_date.substring(0, 10) : "");
    setEditAssignee(task.assignee_name || task.assigned_to || "");
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !editTitle.trim()) {
      toast.error("Task title is required");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await updateTaskAction(editingTask.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        priority: editPriority,
        status: editStatus,
        due_date: editDueDate ? new Date(editDueDate).toISOString() : undefined,
        assigned_to: editAssignee.trim() || undefined,
      });

      if (res.success && res.data) {
        setTasks((prev) =>
          prev.map((t) => (t.id === editingTask.id ? { ...t, ...res.data } : t))
        );
        toast.success("Task updated successfully");
        setEditingTask(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update task");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update task");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: ManagerTask["status"]) => {
    try {
      const res = await updateTaskAction(taskId, { status: newStatus });
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
        toast.success(`Task moved to ${newStatus.replace("_", " ")}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update task status");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update task status");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    try {
      const res = await deleteTaskAction(deletingTask.id);
      if (res.success) {
        setTasks((prev) => prev.filter((t) => t.id !== deletingTask.id));
        toast.success("Task deleted successfully");
        setDeletingTask(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete task");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderTaskCard = (task: ManagerTask) => (
    <Card
      key={task.id}
      className={cn(
        "transition-all hover:border-primary/50 shadow-sm relative group bg-card text-card-foreground",
        task.status === "completed" && "opacity-75"
      )}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            className={cn(
              "text-base font-medium leading-snug cursor-pointer hover:text-primary transition-colors",
              task.status === "completed" && "line-through text-muted-foreground"
            )}
            onClick={() => setViewingTask(task)}
          >
            {task.title}
          </CardTitle>
          <div className="flex items-center gap-1">
            {getPriorityBadge(task.priority)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewingTask(task)}>
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenEdit(task)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Edit Task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {task.status !== "pending" && (
                  <DropdownMenuItem onClick={() => handleQuickStatusChange(task.id, "pending")}>
                    Move to Pending
                  </DropdownMenuItem>
                )}
                {task.status !== "in_progress" && (
                  <DropdownMenuItem onClick={() => handleQuickStatusChange(task.id, "in_progress")}>
                    Move to In Progress
                  </DropdownMenuItem>
                )}
                {task.status !== "completed" && (
                  <DropdownMenuItem onClick={() => handleQuickStatusChange(task.id, "completed")}>
                    Mark as Completed
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeletingTask(task)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {task.description}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(task.due_date)}
          </span>
          {(task.assignee_name || task.assigned_to) && (
            <span className="truncate max-w-[120px] font-medium text-foreground">
              {task.assignee_name || task.assigned_to}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Assigned Tasks</h1>
          <p className="mt-1 text-muted-foreground">
            Manage, delegate, and track team assignments and operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddTaskDialog
            onTaskCreated={(newTask) => {
              setTasks((prev) => [newTask, ...prev]);
            }}
          />
        </div>
      </div>

      {/* Controls: Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            items={[
              { value: "all", label: "All Priorities" },
              { value: "urgent", label: "Urgent" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
            value={priorityFilter}
            onValueChange={(val) => setPriorityFilter(val || "all")}
          >
            <SelectTrigger className="w-full sm:w-36 h-9">
              <SelectValue placeholder="Priority">
                {priorityFilter === "all"
                  ? "All Priorities"
                  : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All Priorities">All Priorities</SelectItem>
              <SelectItem value="urgent" label="Urgent">Urgent</SelectItem>
              <SelectItem value="high" label="High">High</SelectItem>
              <SelectItem value="medium" label="Medium">Medium</SelectItem>
              <SelectItem value="low" label="Low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select
            items={[
              { value: "all", label: "All Statuses" },
              { value: "pending", label: "Pending" },
              { value: "in_progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
            ]}
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val || "all")}
          >
            <SelectTrigger className="w-full sm:w-36 h-9">
              <SelectValue placeholder="Status">
                {statusFilter === "all"
                  ? "All Statuses"
                  : statusFilter === "in_progress"
                  ? "In Progress"
                  : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All Statuses">All Statuses</SelectItem>
              <SelectItem value="pending" label="Pending">Pending</SelectItem>
              <SelectItem value="in_progress" label="In Progress">In Progress</SelectItem>
              <SelectItem value="completed" label="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Pending */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2 text-foreground">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending
            </h2>
            <Badge variant="secondary">{pendingTasks.length}</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {pendingTasks.length === 0 ? (
              <Card className="border-dashed bg-transparent p-6 text-center text-muted-foreground text-sm">
                No pending tasks
              </Card>
            ) : (
              pendingTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* In Progress */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2 text-foreground">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              In Progress
            </h2>
            <Badge variant="secondary">{inProgressTasks.length}</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {inProgressTasks.length === 0 ? (
              <Card className="border-dashed bg-transparent p-6 text-center text-muted-foreground text-sm">
                No tasks in progress
              </Card>
            ) : (
              inProgressTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* Completed */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Completed
            </h2>
            <Badge variant="secondary">{completedTasks.length}</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {completedTasks.length === 0 ? (
              <Card className="border-dashed bg-transparent p-6 text-center text-muted-foreground text-sm">
                No completed tasks
              </Card>
            ) : (
              completedTasks.map(renderTaskCard)
            )}
          </div>
        </div>
      </div>

      {/* View Task Dialog */}
      <Dialog open={!!viewingTask} onOpenChange={(open) => !open && setViewingTask(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="text-xl font-bold">{viewingTask?.title}</DialogTitle>
              {viewingTask && getPriorityBadge(viewingTask.priority)}
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground uppercase">Description</Label>
              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                {viewingTask?.description || "No description provided."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Status</Label>
                <div className="mt-1 font-medium capitalize text-sm">
                  {viewingTask?.status.replace("_", " ")}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Due Date</Label>
                <div className="mt-1 text-sm">
                  {formatDate(viewingTask?.due_date)}
                </div>
              </div>
            </div>
            {(viewingTask?.assignee_name || viewingTask?.assigned_to) && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Assignee</Label>
                <div className="mt-1 text-sm font-medium">
                  {viewingTask.assignee_name || viewingTask.assigned_to}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                const toDel = viewingTask;
                setViewingTask(null);
                setDeletingTask(toDel);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const toEdit = viewingTask;
                setViewingTask(null);
                if (toEdit) handleOpenEdit(toEdit);
              }}
            >
              <Edit2 className="mr-2 h-4 w-4" /> Edit Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Task Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter task title..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Detailed instructions..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  items={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                    { value: "urgent", label: "Urgent" },
                  ]}
                  value={editPriority}
                  onValueChange={(val: any) => setEditPriority(val)}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {editPriority ? editPriority.charAt(0).toUpperCase() + editPriority.slice(1) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" label="Low">Low</SelectItem>
                    <SelectItem value="medium" label="Medium">Medium</SelectItem>
                    <SelectItem value="high" label="High">High</SelectItem>
                    <SelectItem value="urgent" label="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  items={[
                    { value: "pending", label: "Pending" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "completed", label: "Completed" },
                    { value: "archived", label: "Archived" },
                  ]}
                  value={editStatus}
                  onValueChange={(val: any) => setEditStatus(val)}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {editStatus === "in_progress"
                        ? "In Progress"
                        : editStatus
                        ? editStatus.charAt(0).toUpperCase() + editStatus.slice(1)
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending" label="Pending">Pending</SelectItem>
                    <SelectItem value="in_progress" label="In Progress">In Progress</SelectItem>
                    <SelectItem value="completed" label="Completed">Completed</SelectItem>
                    <SelectItem value="archived" label="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-due">Due Date</Label>
                <Input
                  id="edit-due"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-assignee">Assignee</Label>
                <Input
                  id="edit-assignee"
                  placeholder="Assignee name or email"
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingTask}
        title={`Delete "${deletingTask?.title}"?`}
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete Task"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingTask(null)}
      />
    </div>
  );
}
