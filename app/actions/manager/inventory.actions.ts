"use server";

import { revalidatePath } from "next/cache";
import { InventoryRepository } from "@/repositories/inventory.repository";

const inventoryRepo = new InventoryRepository();

export async function fetchInventoryAction(limit?: number, search?: string) {
  try {
    const data = await inventoryRepo.getInventoryDashboard(limit, search);
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchInventoryAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function adjustStockAction(
  inventoryId: string,
  newAvailable: number,
  newReserved: number,
  reason: string
) {
  try {
    await inventoryRepo.adjustStock(
      inventoryId,
      newAvailable,
      newReserved,
      reason
    );
    revalidatePath("/manager/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Audits ---

export async function getAuditsAction() {
  try {
    const data = await inventoryRepo.getAudits();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAuditByIdAction(id: string) {
  try {
    const data = await inventoryRepo.getAuditById(id);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAuditAction(data: any) {
  try {
    const result = await inventoryRepo.createAudit(data);
    revalidatePath("/manager/inventory/audits");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAuditStatusAction(id: string, status: string) {
  try {
    await inventoryRepo.updateAuditStatus(id, status);
    revalidatePath("/manager/inventory/audits");
    revalidatePath(`/manager/inventory/audits/${id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAuditItemsAction(auditId: string) {
  try {
    const data = await inventoryRepo.getAuditItems(auditId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAuditItemsAction(items: any[], auditId: string) {
  try {
    await inventoryRepo.createAuditItems(items);
    revalidatePath(`/manager/inventory/audits/${auditId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAuditItemCountAction(itemId: string, countedQuantity: number, auditId: string) {
  try {
    await inventoryRepo.updateAuditItemCount(itemId, countedQuantity);
    revalidatePath(`/manager/inventory/audits/${auditId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Movements ---

export async function getMovementsAction(page = 1, limit = 50, warehouseId?: string, variantId?: string) {
  try {
    const data = await inventoryRepo.getMovements(page, limit, warehouseId, variantId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
