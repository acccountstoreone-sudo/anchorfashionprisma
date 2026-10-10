"use server";

import { revalidatePath } from "next/cache";
import { WarehouseService } from "@/services/warehouse.service";
import { InventoryRepository } from "@/repositories/inventory.repository";
import {
  Warehouse,
  WarehouseZone,
  WarehouseBin,
  WarehouseRack,
  StockInPayload,
  StockOutPayload,
  StockAdjustmentPayload,
  StockTransferPayload,
} from "@/types/inventory.types";
import { WarehouseQueryFilters } from "@/repositories/warehouse.repository";

// ─────────────────────────────────────────────────────────────────────────────
// WAREHOUSE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllWarehouses(filters?: WarehouseQueryFilters): Promise<{
  data?: Warehouse[];
  total?: number;
  page?: number;
  totalPages?: number;
  error?: string;
}> {
  try {
    const service = new WarehouseService();
    const result = await service.getAllWarehouses(filters);
    return {
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getWarehouseById(
  id: string
): Promise<{ data?: Warehouse | null; error?: string }> {
  try {
    const service = new WarehouseService();
    const data = await service.getWarehouseById(id);
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createWarehouse(
  input: Partial<Warehouse> & { code?: string }
): Promise<{ data?: Warehouse; error?: string }> {
  try {
    const service = new WarehouseService();
    const data = await service.createWarehouse(input);
    revalidatePath("/admin/inventory/warehouses");
    revalidatePath("/admin/inventory");
    return { data };
  } catch (error: any) {
    return { error: error.message || "Failed to create warehouse" };
  }
}

export async function updateWarehouse(
  id: string,
  input: Partial<Warehouse>
): Promise<{ data?: Warehouse; error?: string }> {
  try {
    const service = new WarehouseService();
    const data = await service.updateWarehouse(id, input);
    revalidatePath("/admin/inventory/warehouses");
    revalidatePath(`/admin/inventory/warehouses/${id}`);
    return { data };
  } catch (error: any) {
    return { error: error.message || "Failed to update warehouse" };
  }
}

export async function deleteWarehouse(
  id: string
): Promise<{ success: boolean; message?: string; action?: string; error?: string }> {
  try {
    const service = new WarehouseService();
    const res = await service.deleteWarehouse(id);
    revalidatePath("/admin/inventory/warehouses");
    return { success: true, message: res.message, action: res.action };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleWarehouseStatus(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; data?: Warehouse; error?: string }> {
  try {
    const service = new WarehouseService();
    const data = await service.setWarehouseStatus(id, isActive);
    revalidatePath("/admin/inventory/warehouses");
    revalidatePath(`/admin/inventory/warehouses/${id}`);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getWarehouseStatsAction(warehouseId: string) {
  try {
    const service = new WarehouseService();
    const data = await service.getWarehouseStats(warehouseId);
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getOverallWarehouseStatsAction() {
  try {
    const service = new WarehouseService();
    const data = await service.getOverallStats();
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getWarehouseInventoryAction(warehouseId: string, filters?: any) {
  try {
    const service = new WarehouseService();
    const data = await service.getWarehouseInventory(warehouseId, filters);
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getWarehouseZones(
  warehouseId: string
): Promise<{ data?: WarehouseZone[]; error?: string }> {
  try {
    const service = new WarehouseService();
    const data = await service.getZones(warehouseId);
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createWarehouseZoneAction(data: {
  warehouse_id: string;
  name: string;
  type?: string;
  description?: string;
}): Promise<{ data?: WarehouseZone; error?: string }> {
  try {
    const service = new WarehouseService();
    const zone = await service.createZone({
      warehouse_id: data.warehouse_id,
      name: data.name,
      type: data.type || "STORAGE",
      status: "ACTIVE",
      description: data.description,
    });
    revalidatePath(`/admin/inventory/warehouses/${data.warehouse_id}`);
    return { data: zone };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateWarehouseZoneAction(
  id: string,
  warehouseId: string,
  data: Partial<WarehouseZone>
): Promise<{ data?: WarehouseZone; error?: string }> {
  try {
    const service = new WarehouseService();
    const zone = await service.updateZone(id, data);
    revalidatePath(`/admin/inventory/warehouses/${warehouseId}`);
    return { data: zone };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteWarehouseZoneAction(
  id: string,
  warehouseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const service = new WarehouseService();
    await service.deleteZone(id);
    revalidatePath(`/admin/inventory/warehouses/${warehouseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RACK ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getRacksAction(
  zoneId: string
): Promise<{ data?: WarehouseRack[]; error?: string }> {
  try {
    const service = new WarehouseService();
    const data = await service.getRacksByZone(zoneId);
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createRackAction(
  zoneId: string,
  warehouseId: string,
  rackData: {
    name: string;
    code: string;
    shelves_count?: number;
    capacity?: number;
    description?: string;
  }
): Promise<{ data?: WarehouseRack; error?: string }> {
  try {
    const service = new WarehouseService();
    const rack = await service.createRack(zoneId, rackData);
    revalidatePath(`/admin/inventory/warehouses/${warehouseId}`);
    return { data: rack };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteRackAction(
  zoneId: string,
  rackCode: string,
  warehouseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const service = new WarehouseService();
    await service.deleteRack(zoneId, rackCode);
    revalidatePath(`/admin/inventory/warehouses/${warehouseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHELF / BIN ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getZoneBins(
  zoneId: string
): Promise<{ data?: WarehouseBin[]; error?: string }> {
  try {
    const service = new WarehouseService();
    const data = await service.getBins(zoneId);
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createWarehouseBinAction(
  data: {
    zone_id: string;
    code: string;
    capacity_volume?: number;
    capacity_weight?: number;
    barcode?: string;
    warehouseId?: string;
  },
  warehouseId?: string
): Promise<{ data?: WarehouseBin; error?: string }> {
  try {
    const service = new WarehouseService();
    const bin = await service.createBin(data);
    const targetWhId = warehouseId || data.warehouseId;
    if (targetWhId) {
      revalidatePath(`/admin/inventory/warehouses/${targetWhId}`);
    }
    return { data: bin };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateWarehouseBinAction(
  id: string,
  data: Partial<WarehouseBin>,
  warehouseId?: string
): Promise<{ data?: WarehouseBin; error?: string }> {
  try {
    const service = new WarehouseService();
    const bin = await service.updateBin(id, data);
    if (warehouseId) {
      revalidatePath(`/admin/inventory/warehouses/${warehouseId}`);
    }
    return { data: bin };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteWarehouseBinAction(
  id: string,
  warehouseId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const service = new WarehouseService();
    await service.deleteBin(id);
    if (warehouseId) {
      revalidatePath(`/admin/inventory/warehouses/${warehouseId}`);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK OPERATIONS ACTIONS (IN, OUT, ADJUST, TRANSFER, MOVEMENTS)
// ─────────────────────────────────────────────────────────────────────────────

export async function stockInAction(payload: StockInPayload): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const repo = new InventoryRepository();
    const result = await repo.stockIn(payload);
    revalidatePath("/admin/inventory/warehouses");
    revalidatePath(`/admin/inventory/warehouses/${payload.warehouse_id}`);
    revalidatePath(`/admin/inventory/warehouses/${payload.warehouse_id}/inventory`);
    revalidatePath("/admin/inventory/stock");
    revalidatePath("/admin/inventory/movement");
    revalidatePath("/admin/inventory/stock-movements");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function stockOutAction(payload: StockOutPayload): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const repo = new InventoryRepository();
    const result = await repo.stockOut(payload);
    revalidatePath("/admin/inventory/warehouses");
    revalidatePath(`/admin/inventory/warehouses/${payload.warehouse_id}`);
    revalidatePath(`/admin/inventory/warehouses/${payload.warehouse_id}/inventory`);
    revalidatePath("/admin/inventory/stock");
    revalidatePath("/admin/inventory/movement");
    revalidatePath("/admin/inventory/stock-movements");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function stockAdjustmentAction(payload: StockAdjustmentPayload): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const repo = new InventoryRepository();
    const result = await repo.stockAdjustment(payload);
    revalidatePath("/admin/inventory/warehouses");
    revalidatePath(`/admin/inventory/warehouses/${payload.warehouse_id}`);
    revalidatePath(`/admin/inventory/warehouses/${payload.warehouse_id}/inventory`);
    revalidatePath("/admin/inventory/stock");
    revalidatePath("/admin/inventory/movement");
    revalidatePath("/admin/inventory/stock-movements");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function stockTransferAction(payload: StockTransferPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const repo = new InventoryRepository();
    await repo.transferStock(
      payload.variant_id,
      payload.from_warehouse_id,
      payload.to_warehouse_id,
      payload.quantity,
      payload.reason || "WAREHOUSE_TRANSFER",
      payload.notes
    );
    revalidatePath("/admin/inventory/warehouses");
    revalidatePath(`/admin/inventory/warehouses/${payload.from_warehouse_id}`);
    revalidatePath(`/admin/inventory/warehouses/${payload.to_warehouse_id}`);
    revalidatePath("/admin/inventory/transfers");
    revalidatePath("/admin/inventory/movement");
    revalidatePath("/admin/inventory/stock-movements");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDetailedMovementsAction(options?: {
  page?: number;
  limit?: number;
  warehouseId?: string;
  variantId?: string;
  type?: string;
  search?: string;
}) {
  try {
    const repo = new InventoryRepository();
    const result = await repo.getDetailedMovements(options);
    return { data: result };
  } catch (error: any) {
    return { error: error.message };
  }
}
