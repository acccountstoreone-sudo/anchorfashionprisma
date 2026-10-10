"use server";

import {
  TaskRepository,
  ManagerTask,
} from "@/lib/repositories/manager/task.repository";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

const taskRepo = new TaskRepository();

async function resolveAssigneePayload(
  assigned_to?: string | null,
  description?: string
): Promise<{ assigned_to: string | null; description?: string }> {
  const currentDesc = description || "";
  if (!assigned_to || !assigned_to.trim()) {
    return { assigned_to: null, description: currentDesc || undefined };
  }

  const trimmed = assigned_to.trim();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      trimmed
    );

  const supabase = createAdminClient();

  if (isUuid) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", trimmed)
      .maybeSingle();

    if (profile) {
      return { assigned_to: profile.id, description: currentDesc || undefined };
    }
  }

  // Check if matches a profile by first_name or last_name
  const { data: matchedProfiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .or(`first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%`)
    .limit(1);

  if (matchedProfiles && matchedProfiles.length > 0) {
    return {
      assigned_to: matchedProfiles[0].id,
      description: currentDesc || undefined,
    };
  }

  // If arbitrary text or unlinked assignee, store null in Postgres foreign key
  // and preserve assignee name in description note
  const cleanDesc = currentDesc.replace(/\(Assignee:\s*[^)]+\)/gi, "").trim();
  const resolvedDesc = cleanDesc
    ? `${cleanDesc}\n(Assignee: ${trimmed})`
    : `(Assignee: ${trimmed})`;

  return {
    assigned_to: null,
    description: resolvedDesc,
  };
}

export async function fetchTasksAction(status?: ManagerTask["status"]) {
  try {
    const data = await taskRepo.getTasks(status);
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchTasksAction error:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchStaffMembersAction() {
  try {
    const supabase = createAdminClient();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, roles(name)")
      .order("first_name", { ascending: true });

    if (error) throw error;

    const staff = (profiles || []).map((p: any) => ({
      id: p.id,
      name:
        `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Team Member",
      role: p.roles?.name || "STAFF",
    }));

    return { success: true, data: staff };
  } catch (error: any) {
    console.error("fetchStaffMembersAction error:", error);
    return { success: false, data: [] };
  }
}

export async function createTaskAction(data: {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "archived";
  due_date?: string;
  assigned_to?: string;
}) {
  try {
    const { assigned_to, description } = await resolveAssigneePayload(
      data.assigned_to,
      data.description
    );

    const task = await taskRepo.createTask({
      title: data.title,
      description,
      priority: data.priority,
      status: data.status,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : undefined,
      assigned_to,
    });

    // Send Task Assignment Email
    if (assigned_to) {
      try {
        const supabase = createAdminClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, first_name, last_name")
          .eq("id", assigned_to)
          .maybeSingle();

        let assigneeEmail = profile?.email;
        if (!assigneeEmail) {
          const { data: authUser } = await supabase.auth.admin.getUserById(assigned_to);
          assigneeEmail = authUser?.user?.email;
        }

        if (assigneeEmail) {
          const { EmailProvider } = await import("@/lib/notifications/EmailProvider");
          const { EmailTemplates } = await import("@/lib/notifications/EmailTemplates");
          const assigneeName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Team Member";
          const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/admin/tasks` : "https://anchor.com.bd/admin/tasks";
          const formattedDate = data.due_date ? new Date(data.due_date).toLocaleDateString() : "No due date";
          
          await EmailProvider.send({
            to: assigneeEmail,
            subject: `New Task Assigned: ${data.title}`,
            html: EmailTemplates.taskAssigned(data.title, "Admin", formattedDate, dashboardUrl),
          });
        }
      } catch (emailErr) {
        console.warn("[createTaskAction] Failed to send task email:", emailErr);
      }
    }

    try {
      revalidatePath("/admin/tasks");
      revalidatePath("/manager/tasks");
    } catch (e) {
      console.warn("revalidatePath warning:", e);
    }
    return { success: true, data: task };
  } catch (error: any) {
    console.error("createTaskAction error:", error);
    return { success: false, error: error.message || "Failed to create task" };
  }
}

export async function updateTaskAction(
  id: string,
  data: Partial<ManagerTask>
) {
  try {
    let updatePayload: Partial<ManagerTask> = { ...data };

    if (data.assigned_to !== undefined || data.description !== undefined) {
      const { assigned_to, description } = await resolveAssigneePayload(
        data.assigned_to,
        data.description
      );
      updatePayload.assigned_to = assigned_to;
      if (description !== undefined) {
        updatePayload.description = description;
      }
    }

    if (data.due_date) {
      updatePayload.due_date = new Date(data.due_date).toISOString();
    }

    const task = await taskRepo.updateTask(id, updatePayload);
    try {
      revalidatePath("/admin/tasks");
      revalidatePath("/manager/tasks");
    } catch (e) {
      console.warn("revalidatePath warning:", e);
    }
    return { success: true, data: task };
  } catch (error: any) {
    console.error("updateTaskAction error:", error);
    return { success: false, error: error.message || "Failed to update task" };
  }
}

export async function deleteTaskAction(id: string) {
  try {
    await taskRepo.deleteTask(id);
    try {
      revalidatePath("/admin/tasks");
      revalidatePath("/manager/tasks");
    } catch (e) {
      console.warn("revalidatePath warning:", e);
    }
    return { success: true };
  } catch (error: any) {
    console.error("deleteTaskAction error:", error);
    return { success: false, error: error.message || "Failed to delete task" };
  }
}
