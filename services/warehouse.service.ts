import { WarehouseRepository, WarehouseQueryFilters } from "@/repositories/warehouse.repository";
import {
  Warehouse,
  WarehouseZone,
  WarehouseBin,
  WarehouseRack,
} from "@/types/inventory.types";
import { createAdminClient } from "@/lib/supabase/admin-client";

export class WarehouseService {
  private repository: WarehouseRepository;

  constructor() {
    this.repository = new WarehouseRepository();
  }

  private async recordAudit(
    tableName: string,
    recordId: string,
    action: "CREATE" | "UPDATE" | "DELETE",
    oldData?: any,
    newData?: any,
    userId?: string
  ) {
    try {
      const supabase = createAdminClient();
      await supabase.from("audit_logs").insert({
        table_name: tableName,
        record_id: recordId,
        action,
        old_data: oldData ? JSON.stringify(oldData) : null,
        new_data: newData ? JSON.stringify(newData) : null,
        changed_by: userId || null,
        changed_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Could not write to audit_logs:", e);
    }
  }

  async getAllWarehouses(filters?: WarehouseQueryFilters) {
    return await this.repository.getAllWarehouses(filters);
  }

  async getWarehouseById(id: string): Promise<Warehouse | null> {
    return await this.repository.getWarehouseById(id);
  }

  async createWarehouse(data: Partial<Warehouse>, userId?: string): Promise<Warehouse> {
    if (!data.name?.trim()) {
      throw new Error("Warehouse name is required.");
    }

    const warehouse = await this.repository.createWarehouse(data);
    await this.recordAudit("warehouses", warehouse.id, "CREATE", null, warehouse, userId);
    return warehouse;
  }

  async updateWarehouse(
    id: string,
    data: Partial<Warehouse>,
    userId?: string
  ): Promise<Warehouse> {
    const existing = await this.repository.getWarehouseById(id);
    if (!existing) {
      throw new Error(`Warehouse ${id} not found.`);
    }

    const updated = await this.repository.updateWarehouse(id, data);
    await this.recordAudit("warehouses", id, "UPDATE", existing, updated, userId);
    return updated;
  }

  async deleteWarehouse(id: string, userId?: string) {
    const existing = await this.repository.getWarehouseById(id);
    const result = await this.repository.deleteWarehouse(id);
    await this.recordAudit("warehouses", id, "DELETE", existing, null, userId);
    return result;
  }

  async setWarehouseStatus(id: string, isActive: boolean, userId?: string): Promise<Warehouse> {
    const existing = await this.repository.getWarehouseById(id);
    const updated = await this.repository.setWarehouseStatus(id, isActive);
    await this.recordAudit("warehouses", id, "UPDATE", existing, updated, userId);
    return updated;
  }

  async getWarehouseStats(warehouseId: string) {
    return await this.repository.getWarehouseStats(warehouseId);
  }

  async getOverallStats() {
    return await this.repository.getOverallWarehouseStats();
  }

  // --- Zones ---

  async getZones(warehouseId: string): Promise<WarehouseZone[]> {
    return await this.repository.getZonesByWarehouse(warehouseId);
  }

  async getZoneById(id: string): Promise<WarehouseZone | null> {
    return await this.repository.getZoneById(id);
  }

  async createZone(data: Partial<WarehouseZone>, userId?: string): Promise<WarehouseZone> {
    if (!data.warehouse_id) throw new Error("Warehouse ID is required for zone.");
    if (!data.name?.trim()) throw new Error("Zone name is required.");

    // Validate warehouse is active
    const warehouse = await this.repository.getWarehouseById(data.warehouse_id);
    if (!warehouse) throw new Error("Target warehouse does not exist.");
    if (!warehouse.is_active) throw new Error("Cannot add zone to an inactive warehouse.");

    const zone = await this.repository.createZone(data);
    await this.recordAudit("warehouse_zones", zone.id, "CREATE", null, zone, userId);
    return zone;
  }

  async updateZone(id: string, data: Partial<WarehouseZone>, userId?: string): Promise<WarehouseZone> {
    const existing = await this.repository.getZoneById(id);
    const updated = await this.repository.updateZone(id, data);
    await this.recordAudit("warehouse_zones", id, "UPDATE", existing, updated, userId);
    return updated;
  }

  async deleteZone(id: string, userId?: string): Promise<void> {
    const existing = await this.repository.getZoneById(id);
    await this.repository.deleteZone(id);
    await this.recordAudit("warehouse_zones", id, "DELETE", existing, null, userId);
  }

  // --- Racks ---

  async getRacksByZone(zoneId: string): Promise<WarehouseRack[]> {
    return await this.repository.getRacksByZone(zoneId);
  }

  async createRack(
    zoneId: string,
    rackData: { name: string; code: string; shelves_count?: number; capacity?: number; status?: string; description?: string },
    userId?: string
  ): Promise<WarehouseRack> {
    if (!zoneId) throw new Error("Zone ID is required.");
    if (!rackData.name?.trim() && !rackData.code?.trim()) throw new Error("Rack name or code is required.");

    const rack = await this.repository.createRack(zoneId, rackData);
    await this.recordAudit("warehouse_racks", rack.id, "CREATE", null, rack, userId);
    return rack;
  }

  async deleteRack(zoneId: string, rackCode: string, userId?: string): Promise<void> {
    await this.repository.deleteRack(zoneId, rackCode);
    await this.recordAudit("warehouse_racks", `${zoneId}-${rackCode}`, "DELETE", null, null, userId);
  }

  // --- Bins / Shelves ---

  async getBins(zoneId: string): Promise<WarehouseBin[]> {
    return await this.repository.getBinsByZone(zoneId);
  }

  async createBin(data: Partial<WarehouseBin>, userId?: string): Promise<WarehouseBin> {
    if (!data.zone_id) throw new Error("Zone ID is required for shelf/bin.");
    if (!data.code?.trim()) throw new Error("Shelf/Bin code is required.");

    const bin = await this.repository.createBin(data);
    await this.recordAudit("warehouse_bins", bin.id, "CREATE", null, bin, userId);
    return bin;
  }

  async updateBin(id: string, data: Partial<WarehouseBin>, userId?: string): Promise<WarehouseBin> {
    const updated = await this.repository.updateBin(id, data);
    await this.recordAudit("warehouse_bins", id, "UPDATE", null, updated, userId);
    return updated;
  }

  async deleteBin(id: string, userId?: string): Promise<void> {
    await this.repository.deleteBin(id);
    await this.recordAudit("warehouse_bins", id, "DELETE", null, null, userId);
  }

  // --- Inventory Lookup ---

  async getWarehouseInventory(warehouseId: string, filters?: any) {
    return await this.repository.getWarehouseInventory(warehouseId, filters);
  }

  async getDefaultWarehouse(): Promise<Warehouse | null> {
    return await this.repository.getDefaultWarehouse();
  }
}
