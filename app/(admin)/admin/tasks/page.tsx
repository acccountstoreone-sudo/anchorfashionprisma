import { Metadata } from "next";
import { fetchTasksAction } from "@/app/actions/manager/task.actions";
import { TasksManagerClient } from "@/features/admin/components/tasks/TasksManagerClient";

export const metadata: Metadata = {
  title: "Tasks & Assignments | Admin",
  description: "Manage and monitor workplace assignments and team duties.",
};

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  let safeTasks: any[] = [];
  try {
    const res = await fetchTasksAction();
    safeTasks = Array.isArray(res?.data) ? res.data : [];
  } catch (err) {
    console.error("AdminTasksPage fetchTasksAction failed:", err);
    safeTasks = [];
  }

  return <TasksManagerClient initialTasks={safeTasks} />;
}
