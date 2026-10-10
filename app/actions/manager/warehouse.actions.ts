"use server";

import { WarehouseRepository } from "@/repositories/warehouse.repository";
import { revalidatePath } from "next/cache";

const warehouseRepo = new WarehouseRepository();

export async function getWarehousesAction() {
  try {
    const result = await warehouseRepo.getAllWarehouses();
    const list = Array.isArray(result) ? result : result.data;
    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getWarehouseByIdAction(id: string) {
  try {
    const data = await warehouseRepo.getWarehouseById(id);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createWarehouseAction(data: any) {
  try {
    const result = await warehouseRepo.createWarehouse(data);
    revalidatePath("/admin/shipping/warehouses");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateWarehouseAction(id: string, data: any) {
  try {
    const result = await warehouseRepo.updateWarehouse(id, data);
    revalidatePath("/admin/shipping/warehouses");
    revalidatePath(`/admin/shipping/warehouses/${id}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getZonesByWarehouseAction(warehouseId: string) {
  try {
    const data = await warehouseRepo.getZonesByWarehouse(warehouseId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createZoneAction(data: any) {
  try {
    const result = await warehouseRepo.createZone(data);
    revalidatePath(`/admin/shipping/warehouses/${data.warehouse_id}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateZoneAction(id: string, data: any) {
  try {
    const result = await warehouseRepo.updateZone(id, data);
    if (result) {
      revalidatePath(`/admin/shipping/warehouses/${result.warehouse_id}`);
    }
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteZoneAction(id: string, warehouseId: string) {
  try {
    await warehouseRepo.deleteZone(id);
    revalidatePath(`/admin/shipping/warehouses/${warehouseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBinsByZoneAction(zoneId: string) {
  try {
    const data = await warehouseRepo.getBinsByZone(zoneId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createBinAction(data: any, warehouseId: string) {
  try {
    const result = await warehouseRepo.createBin(data);
    revalidatePath(`/admin/shipping/warehouses/${warehouseId}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBinAction(id: string, data: any, warehouseId: string) {
  try {
    const result = await warehouseRepo.updateBin(id, data);
    revalidatePath(`/admin/shipping/warehouses/${warehouseId}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBinAction(id: string, warehouseId: string) {
  try {
    await warehouseRepo.deleteBin(id);
    revalidatePath(`/admin/shipping/warehouses/${warehouseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
