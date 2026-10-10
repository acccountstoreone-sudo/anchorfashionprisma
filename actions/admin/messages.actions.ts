"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface AdminMessage {
  id: string;
  profile_id: string | null;
  lead_id: string | null;
  type: string;
  direction: string;
  subject: string | null;
  content: string | null;
  status: string;
  sender_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

/**
 * Fetches real recent inbound messages from Neon PostgreSQL via Prisma.
 */
export async function getAdminHeaderMessagesAction(): Promise<{
  data: AdminMessage[];
  unreadCount: number;
  error?: string;
}> {
  try {
    const logs = await prisma.communicationLog.findMany({
      where: { direction: "INBOUND" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        profile: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const messages: AdminMessage[] = logs.map((log: any) => ({
      id: log.id,
      profile_id: log.profileId,
      lead_id: log.leadId,
      type: log.type,
      direction: log.direction,
      subject: log.subject,
      content: log.content,
      status: log.status,
      sender_id: log.senderId,
      metadata: (log.metadata as Record<string, any>) || {},
      created_at: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
      profile: log.profile
        ? {
            first_name: log.profile.firstName,
            last_name: log.profile.lastName,
          }
        : null,
    }));

    const unreadCount = messages.filter((m) => m.status !== "READ").length;

    return { data: messages, unreadCount };
  } catch (err: any) {
    console.error("Error fetching messages via Prisma:", err);
    return { data: [], unreadCount: 0, error: err.message };
  }
}

/**
 * Marks a single message as READ.
 */
export async function markMessageAsReadAction(id: string): Promise<{ error?: string }> {
  try {
    await prisma.communicationLog.update({
      where: { id },
      data: { status: "READ" },
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/crm/messages");
    revalidatePath("/admin/messages");
    return {};
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Creates a new communication message.
 */
export async function createMessageAction(payload: {
  profile_id?: string;
  lead_id?: string;
  type: string;
  direction?: string;
  subject?: string;
  content: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await prisma.communicationLog.create({
      data: {
        profileId: payload.profile_id || null,
        leadId: payload.lead_id || null,
        type: payload.type || "NOTE",
        direction: payload.direction || "OUTBOUND",
        subject: payload.subject || null,
        content: payload.content,
        status: "SENT",
      },
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/crm/messages");
    revalidatePath("/admin/messages");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Updates an existing communication message.
 */
export async function updateMessageAction(
  id: string,
  payload: {
    subject?: string;
    content: string;
    type?: string;
    direction?: string;
    status?: string;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await prisma.communicationLog.update({
      where: { id },
      data: {
        ...(payload.subject !== undefined && { subject: payload.subject }),
        content: payload.content,
        ...(payload.type && { type: payload.type }),
        ...(payload.direction && { direction: payload.direction }),
        ...(payload.status && { status: payload.status }),
      },
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/crm/messages");
    revalidatePath("/admin/messages");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a communication message by ID.
 */
export async function deleteMessageAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.communicationLog.delete({ where: { id } });

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/crm/messages");
    revalidatePath("/admin/messages");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Marks all recent unread inbound communications as READ.
 */
export async function markAllMessagesAsReadAction(): Promise<{ error?: string }> {
  try {
    await prisma.communicationLog.updateMany({
      where: { direction: "INBOUND", status: { not: "READ" } },
      data: { status: "READ" },
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/crm/messages");
    revalidatePath("/admin/messages");
    return {};
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Deletes all communication messages/logs.
 */
export async function deleteAllMessagesAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.communicationLog.deleteMany({});
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/crm/messages");
    revalidatePath("/admin/messages");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Cleans up fake messages (no-op now that fake seeding is disabled).
 */
export async function cleanupFakeMessages(): Promise<void> {
  // No-op
}

/**
 * No-op: Do not seed fake messages. Only real messages are preserved.
 */
export async function seedInitialMessagesIfEmptyAction(): Promise<void> {
  // Intentionally empty — strictly real data only
}
