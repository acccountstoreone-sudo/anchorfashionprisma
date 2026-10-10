"use server";

import { ProcurementRepository } from "@/repositories/procurement.repository";
import { Supplier, PurchaseOrder, PurchaseOrderItem } from "@/types/inventory.types";
import { revalidatePath } from "next/cache";

const procurementRepo = new ProcurementRepository();

// --- Suppliers ---

export async function getSuppliersAction() {
  try {
    const data = await procurementRepo.getSuppliers();
    return { success: true, data };
  } catch (error: any) {
    console.error("getSuppliersAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function getWarehousesAction() {
  try {
    const data = await procurementRepo.getWarehouses();
    return { success: true, data };
  } catch (error: any) {
    console.error("getWarehousesAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function getSupplierByIdAction(id: string) {
  try {
    const data = await procurementRepo.getSupplierById(id);
    return { success: true, data };
  } catch (error: any) {
    console.error("getSupplierByIdAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function createSupplierAction(supplier: Omit<Supplier, "id" | "created_at" | "updated_at">) {
  try {
    const data = await procurementRepo.createSupplier(supplier);
    revalidatePath("/manager/inventory/suppliers");
    return { success: true, data };
  } catch (error: any) {
    console.error("createSupplierAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateSupplierAction(id: string, updates: Partial<Supplier>) {
  try {
    const data = await procurementRepo.updateSupplier(id, updates);
    revalidatePath("/manager/inventory/suppliers");
    revalidatePath(`/manager/inventory/suppliers/${id}`);
    return { success: true, data };
  } catch (error: any) {
    console.error("updateSupplierAction error:", error);
    return { success: false, error: error.message };
  }
}

// --- Purchase Orders ---

export async function getPurchaseOrdersAction() {
  try {
    const data = await procurementRepo.getPurchaseOrders();
    return { success: true, data };
  } catch (error: any) {
    console.error("getPurchaseOrdersAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function getPurchaseOrderByIdAction(id: string) {
  try {
    const data = await procurementRepo.getPurchaseOrderById(id);
    return { success: true, data };
  } catch (error: any) {
    console.error("getPurchaseOrderByIdAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function createPurchaseOrderAction(
  poData: Omit<PurchaseOrder, "id" | "created_at" | "updated_at">,
  items: Omit<PurchaseOrderItem, "id" | "po_id" | "created_at" | "updated_at">[]
) {
  try {
    const data = await procurementRepo.createPurchaseOrder(poData, items);
    revalidatePath("/manager/inventory/purchase-orders");
    return { success: true, data };
  } catch (error: any) {
    console.error("createPurchaseOrderAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function updatePurchaseOrderStatusAction(id: string, status: string) {
  try {
    await procurementRepo.updatePurchaseOrderStatus(id, status);
    revalidatePath("/manager/inventory/purchase-orders");
    revalidatePath(`/manager/inventory/purchase-orders/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error("updatePurchaseOrderStatusAction error:", error);
    return { success: false, error: error.message };
  }
}
