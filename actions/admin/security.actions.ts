"use server";

import prisma from "@/lib/prisma";
import { verifyAdmin } from "@/lib/security/roles";

export async function getAuditLogsAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAdmin();
  try {
    const logs = await prisma.auditLog.findMany({
      select: {
        id: true,
        action: true,
        entity: true,
        userId: true,
        ipAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    
    // Map to the expected format
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      table_name: log.entity,
      user_id: log.userId,
      ip_address: log.ipAddress,
      created_at: log.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return [];
  }
}
