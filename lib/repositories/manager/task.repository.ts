import { prisma } from "@/lib/prisma";

export interface ManagerTask {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "archived";
  due_date?: string;
  assigned_to?: string | null;
  assignee_name?: string | null;
  created_by?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export class TaskRepository {
  async getTasks(status?: ManagerTask["status"]): Promise<ManagerTask[]> {
    const tasks = await prisma.task.findMany({
      where: status ? { status, isDeleted: false } : { isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: {
        assignee: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    return tasks.map(mapPrismaTask);
  }

  async getTaskById(id: string): Promise<ManagerTask | null> {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });
    if (!task) return null;
    return mapPrismaTask(task);
  }

  async createTask(
    data: Omit<ManagerTask, "id" | "created_at" | "updated_at">
  ): Promise<ManagerTask> {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        dueDate: data.due_date ? new Date(data.due_date) : null,
        assigneeId: data.assigned_to,
        createdById: data.created_by,
      },
      include: {
        assignee: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });
    return mapPrismaTask(task);
  }

  async updateTask(
    id: string,
    updates: Partial<ManagerTask>
  ): Promise<ManagerTask | null> {
    const data: any = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.priority !== undefined) data.priority = updates.priority;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.due_date !== undefined) data.dueDate = updates.due_date ? new Date(updates.due_date) : null;
    if (updates.assigned_to !== undefined) data.assigneeId = updates.assigned_to;

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });
    return mapPrismaTask(task);
  }

  async deleteTask(id: string): Promise<void> {
    await prisma.task.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}

function mapPrismaTask(task: any): ManagerTask {
  let assigneeName = task.assignee
    ? `${task.assignee.firstName || ""} ${task.assignee.lastName || ""}`.trim() || task.assignee.email
    : "";

  if (!assigneeName && task.description) {
    const match = task.description.match(/\(Assignee:\s*([^)]+)\)/i);
    if (match) assigneeName = match[1].trim();
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description || undefined,
    priority: task.priority as ManagerTask["priority"],
    status: task.status as ManagerTask["status"],
    due_date: task.dueDate?.toISOString(),
    assigned_to: task.assigneeId,
    assignee_name: assigneeName || undefined,
    created_by: task.createdById,
    created_at: task.createdAt.toISOString(),
    updated_at: task.updatedAt.toISOString(),
  };
}
