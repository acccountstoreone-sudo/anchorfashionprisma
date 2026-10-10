import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  Warehouse,
  WarehouseZone,
  WarehouseBin,
  WarehouseRack,
} from "@/types/inventory.types";

function normalizeWarehouseType(type?: string): "WAREHOUSE" | "RETAIL_STORE" {
  if (!type) return "WAREHOUSE";
  const upper = String(type).trim().toUpperCase();
  if (
    upper === "RETAIL_STORE" ||
    upper === "STORE" ||
    upper === "RETAIL" ||
    upper === "OUTLET" ||
    upper === "SHOWROOM"
  ) {
    return "RETAIL_STORE";
  }
  return "WAREHOUSE";
}

function parseWarehouseMetadata(raw: any): Partial<Warehouse> {
  let meta: any = {};
  if (raw.address) {
    try {
      if (typeof raw.address === "object") {
        meta = raw.address;
      } else if (typeof raw.address === "string" && raw.address.trim().startsWith("{") && raw.address.trim().endsWith("}")) {
        meta = JSON.parse(raw.address);
      } else {
        meta = { address: raw.address };
      }
    } catch {
      meta = { address: raw.address };
    }
  }

  return {
    address: meta.raw_address || meta.address || (typeof raw.address === "string" && !raw.address.trim().startsWith("{") ? raw.address : ""),
    city: meta.city || "",
    state: meta.state || "",
    country: meta.country || "Bangladesh",
    postal_code: meta.postal_code || "",
    latitude: meta.latitude !== undefined && meta.latitude !== null ? Number(meta.latitude) : undefined,
    longitude: meta.longitude !== undefined && meta.longitude !== null ? Number(meta.longitude) : undefined,
    manager_name: meta.manager_name || "",
    contact_person: meta.contact_person || "",
    phone: meta.phone || "",
    email: meta.email || "",
    operational_type: meta.operational_type || (raw.type === "RETAIL_STORE" ? "STORE" : "MAIN_WAREHOUSE"),
    is_default: meta.is_default || false,
    allow_negative_stock: meta.allow_negative_stock || false,
    enable_stock_tracking: meta.enable_stock_tracking !== undefined ? meta.enable_stock_tracking : true,
    enable_batch_tracking: meta.enable_batch_tracking || false,
    enable_serial_tracking: meta.enable_serial_tracking || false,
    notes: meta.notes || "",
    description: meta.description || "",
  };
}

function serializeWarehouseAddress(data: Partial<Warehouse>): string {
  const meta = {
    raw_address: data.address || "",
    city: data.city || "",
    state: data.state || "",
    country: data.country || "Bangladesh",
    postal_code: data.postal_code || "",
    latitude: data.latitude,
    longitude: data.longitude,
    manager_name: data.manager_name || "",
    contact_person: data.contact_person || "",
    phone: data.phone || "",
    email: data.email || "",
    operational_type: data.operational_type || "MAIN_WAREHOUSE",
    is_default: data.is_default || false,
    allow_negative_stock: data.allow_negative_stock || false,
    enable_stock_tracking: data.enable_stock_tracking !== undefined ? data.enable_stock_tracking : true,
    enable_batch_tracking: data.enable_batch_tracking || false,
    enable_serial_tracking: data.enable_serial_tracking || false,
    notes: data.notes || "",
    description: data.description || "",
  };
  return JSON.stringify(meta);
}

export interface WarehouseQueryFilters {
  search?: string;
  status?: "all" | "active" | "inactive" | "archived";
  type?: string;
  location?: string;
  sortBy?: "name" | "code" | "type" | "status" | "created_at" | "total_stock";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export class WarehouseRepository {
  private getAdminClient() {
    return createAdminClient();
  }

  /**
   * Fetch all warehouses with optional filters, search, sorting and pagination
   */
  async getAllWarehouses(filters?: WarehouseQueryFilters): Promise<{
    data: Warehouse[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const supabase = this.getAdminClient();

    let query = supabase.from("warehouses").select("*", { count: "exact" });

    // Status filter
    if (filters?.status === "active") {
      query = query.eq("is_active", true);
    } else if (filters?.status === "inactive") {
      query = query.eq("is_active", false);
    } else if (filters?.status === "archived") {
      query = query.eq("status", "ARCHIVED");
    }

    // Type filter
    if (filters?.type && filters.type !== "all") {
      if (filters.type === "WAREHOUSE" || filters.type === "RETAIL_STORE") {
        query = query.eq("type", filters.type);
      }
    }

    // Search query (code, name, address)
    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      query = query.or(`name.ilike.%${s}%,warehouse_code.ilike.%${s}%,address.ilike.%${s}%`);
    }

    // Sorting
    const sortBy = filters?.sortBy || "name";
    const sortOrder = filters?.sortOrder === "desc" ? false : true;
    if (sortBy === "code") {
      query = query.order("warehouse_code", { ascending: sortOrder });
    } else if (sortBy === "created_at") {
      query = query.order("created_at", { ascending: sortOrder });
    } else if (sortBy === "status") {
      query = query.order("is_active", { ascending: sortOrder });
    } else {
      query = query.order("name", { ascending: sortOrder });
    }

    // Pagination
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, filters?.limit || 50);
    const start = (page - 1) * limit;
    query = query.range(start, start + limit - 1);

    const { data: rawData, count, error } = await query;
    if (error) throw new Error(`Failed to get warehouses: ${error.message}`);

    const warehousesList = (rawData || []).map((w: any) => {
      const meta = parseWarehouseMetadata(w);
      return {
        ...w,
        ...meta,
        code: w.warehouse_code || w.code || "",
        warehouse_code: w.warehouse_code || w.code || "",
      } as Warehouse;
    });

    // Enrich with live aggregated inventory stats in parallel
    const enriched = await Promise.all(
      warehousesList.map(async (wh) => {
        try {
          const stats = await this.getWarehouseStats(wh.id);
          return {
            ...wh,
            ...stats,
          };
        } catch {
          return wh;
        }
      })
    );

    // Apply location text filter in-memory if requested
    let finalData = enriched;
    if (filters?.location?.trim()) {
      const loc = filters.location.toLowerCase();
      finalData = enriched.filter(
        (w) =>
          (w.city && w.city.toLowerCase().includes(loc)) ||
          (w.state && w.state.toLowerCase().includes(loc)) ||
          (w.address && w.address.toLowerCase().includes(loc))
      );
    }

    // In-memory operational type filter if user selected extended type
    if (filters?.type && filters.type !== "all" && filters.type !== "WAREHOUSE" && filters.type !== "RETAIL_STORE") {
      finalData = finalData.filter((w) => w.operational_type === filters.type);
    }

    const total = count || finalData.length;
    return {
      data: finalData,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single warehouse by ID with complete parsed metadata and computed stats
   */
  async getWarehouseById(id: string): Promise<Warehouse | null> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Failed to get warehouse: ${error.message}`);
    if (!data) return null;

    const meta = parseWarehouseMetadata(data);
    const stats = await this.getWarehouseStats(id);

    return {
      ...data,
      ...meta,
      ...stats,
      code: (data as any).warehouse_code || (data as any).code || "",
      warehouse_code: (data as any).warehouse_code || (data as any).code || "",
    } as Warehouse;
  }

  /**
   * Create a new warehouse
   */
  async createWarehouse(
    warehouseData: Partial<Warehouse> & { code?: string; warehouse_code?: string }
  ): Promise<Warehouse> {
    const supabase = this.getAdminClient();
    const code = (
      warehouseData.warehouse_code ||
      warehouseData.code ||
      warehouseData.name?.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() ||
      "WH"
    )
      .trim()
      .toUpperCase();

    // Check if warehouse_code already exists
    const { data: existing } = await supabase
      .from("warehouses")
      .select("id")
      .ilike("warehouse_code", code)
      .maybeSingle();

    if (existing) {
      throw new Error(`A warehouse with code "${code}" already exists. Please provide a unique code.`);
    }

    const serializedAddress = serializeWarehouseAddress(warehouseData);

    const isActive = warehouseData.is_active !== undefined ? warehouseData.is_active : true;
    const payload: any = {
      warehouse_code: code,
      name: warehouseData.name?.trim(),
      type: normalizeWarehouseType(warehouseData.type || warehouseData.operational_type),
      is_active: isActive,
      address: serializedAddress,
      capacity_sqft: warehouseData.capacity_sqft || null,
      status: isActive ? "active" : "inactive",
    };

    const { data, error } = await supabase
      .from("warehouses")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Failed to create warehouse: ${error.message}`);

    const meta = parseWarehouseMetadata(data);
    return {
      ...data,
      ...meta,
      code: data.warehouse_code || code,
    } as Warehouse;
  }

  /**
   * Update an existing warehouse
   */
  async updateWarehouse(
    id: string,
    warehouseData: Partial<Warehouse> & { code?: string; warehouse_code?: string }
  ): Promise<Warehouse> {
    const supabase = this.getAdminClient();
    const payload: any = {};

    if (warehouseData.name !== undefined) {
      payload.name = warehouseData.name.trim();
    }
    if (warehouseData.code !== undefined || warehouseData.warehouse_code !== undefined) {
      const code = (warehouseData.warehouse_code || warehouseData.code || "").trim().toUpperCase();
      // Check code uniqueness
      const { data: existing } = await supabase
        .from("warehouses")
        .select("id")
        .ilike("warehouse_code", code)
        .neq("id", id)
        .maybeSingle();
      if (existing) {
        throw new Error(`A warehouse with code "${code}" already exists.`);
      }
      payload.warehouse_code = code;
    }
    if (warehouseData.type !== undefined || warehouseData.operational_type !== undefined) {
      payload.type = normalizeWarehouseType(warehouseData.type || warehouseData.operational_type);
    }
    if (warehouseData.is_active !== undefined) {
      payload.is_active = warehouseData.is_active;
      payload.status = warehouseData.is_active ? "active" : "inactive";
    }
    if (warehouseData.capacity_sqft !== undefined) {
      payload.capacity_sqft = warehouseData.capacity_sqft;
    }

    // Merge existing address/metadata with new values
    const { data: current } = await supabase
      .from("warehouses")
      .select("address")
      .eq("id", id)
      .single();
    const currentMeta = parseWarehouseMetadata(current || {});
    const updatedMeta = {
      ...currentMeta,
      ...warehouseData,
    };
    payload.address = serializeWarehouseAddress(updatedMeta);
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("warehouses")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update warehouse: ${error.message}`);

    const meta = parseWarehouseMetadata(data);
    return {
      ...data,
      ...meta,
      code: data.warehouse_code,
    } as Warehouse;
  }

  /**
   * Delete or archive warehouse
   */
  async deleteWarehouse(id: string): Promise<{ action: "deleted" | "archived"; message: string }> {
    const supabase = this.getAdminClient();

    // Check if warehouse has stock
    const { data: stockLevels } = await supabase
      .from("inventory_levels")
      .select("quantity_available, quantity_reserved, quantity_damaged")
      .eq("warehouse_id", id);

    const totalStock = (stockLevels || []).reduce(
      (sum, row) => sum + (row.quantity_available || 0) + (row.quantity_reserved || 0) + (row.quantity_damaged || 0),
      0
    );

    if (totalStock > 0) {
      // Soft-delete / Archive
      await supabase
        .from("warehouses")
        .update({ is_active: false, status: "inactive", updated_at: new Date().toISOString() })
        .eq("id", id);
      return {
        action: "archived",
        message: `Warehouse has ${totalStock} units of active stock. It has been safely archived and deactivated instead of permanently deleted.`,
      };
    }

    // Safe to delete if no inventory remains
    const { error } = await supabase.from("warehouses").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete warehouse: ${error.message}`);
    return {
      action: "deleted",
      message: "Warehouse deleted successfully.",
    };
  }

  /**
   * Activate or Deactivate warehouse
   */
  async setWarehouseStatus(id: string, isActive: boolean): Promise<Warehouse> {
    return this.updateWarehouse(id, { is_active: isActive });
  }

  /**
   * Aggregated statistics for a specific warehouse
   */
  async getWarehouseStats(warehouseId: string): Promise<{
    total_products: number;
    total_stock: number;
    available_stock: number;
    reserved_stock: number;
    damaged_stock: number;
    low_stock_items: number;
    out_of_stock_items: number;
    total_stock_value: number;
    zones_count: number;
    bins_count: number;
  }> {
    const supabase = this.getAdminClient();

    // Fetch inventory levels with product cost
    const { data: levels } = await supabase
      .from("inventory_levels")
      .select("variant_id, quantity_available, quantity_reserved, quantity_damaged, reorder_point, safety_stock, variant:variants(product:products(base_price, cost_price))")
      .eq("warehouse_id", warehouseId);

    const distinctVariants = new Set<string>();
    let totalStock = 0;
    let availableStock = 0;
    let reservedStock = 0;
    let damagedStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockValue = 0;

    (levels || []).forEach((row: any) => {
      distinctVariants.add(row.variant_id);
      const avail = row.quantity_available || 0;
      const res = row.quantity_reserved || 0;
      const dam = row.quantity_damaged || 0;
      const totalItemStock = avail + res + dam;
      const cost = Number(row.variant?.product?.cost_price || row.variant?.product?.base_price || 0);

      totalStock += totalItemStock;
      availableStock += avail;
      reservedStock += res;
      damagedStock += dam;
      totalStockValue += avail * cost;

      const threshold = Number(row.reorder_point) || Number(row.safety_stock) || 5;
      if (avail <= 0) {
        outOfStockCount++;
      } else if (avail <= threshold) {
        lowStockCount++;
      }
    });

    // Count zones
    const { count: zonesCount } = await supabase
      .from("warehouse_zones")
      .select("id", { count: "exact", head: true })
      .eq("warehouse_id", warehouseId);

    // Count bins across zones
    const { data: zones } = await supabase
      .from("warehouse_zones")
      .select("id")
      .eq("warehouse_id", warehouseId);

    let binsCount = 0;
    if (zones && zones.length > 0) {
      const zoneIds = zones.map((z) => z.id);
      const { count: bCount } = await supabase
        .from("warehouse_bins")
        .select("id", { count: "exact", head: true })
        .in("zone_id", zoneIds);
      binsCount = bCount || 0;
    }

    return {
      total_products: distinctVariants.size,
      total_stock: totalStock,
      available_stock: availableStock,
      reserved_stock: reservedStock,
      damaged_stock: damagedStock,
      low_stock_items: lowStockCount,
      out_of_stock_items: outOfStockCount,
      total_stock_value: Math.round(totalStockValue * 100) / 100,
      zones_count: zonesCount || 0,
      bins_count: binsCount,
    };
  }

  /**
   * Overall enterprise warehouse dashboard metrics
   */
  async getOverallWarehouseStats(): Promise<{
    total_warehouses: number;
    active_warehouses: number;
    total_products: number;
    total_stock: number;
    total_valuation: number;
    low_stock_alerts: number;
  }> {
    const supabase = this.getAdminClient();

    const { data: whList } = await supabase.from("warehouses").select("id, is_active");
    const totalWarehouses = (whList || []).length;
    const activeWarehouses = (whList || []).filter((w) => w.is_active).length;

    const { data: levels } = await supabase
      .from("inventory_levels")
      .select("variant_id, quantity_available, quantity_reserved, quantity_damaged, reorder_point, variant:variants(product:products(base_price, cost_price))");

    const variantSet = new Set<string>();
    let totalStock = 0;
    let totalValuation = 0;
    let lowStockAlerts = 0;

    (levels || []).forEach((row: any) => {
      variantSet.add(row.variant_id);
      const avail = row.quantity_available || 0;
      totalStock += avail + (row.quantity_reserved || 0) + (row.quantity_damaged || 0);
      const cost = Number(row.variant?.product?.cost_price || row.variant?.product?.base_price || 0);
      totalValuation += avail * cost;
      const reorder = Number(row.reorder_point) || 5;
      if (avail <= reorder) {
        lowStockAlerts++;
      }
    });

    return {
      total_warehouses: totalWarehouses,
      active_warehouses: activeWarehouses,
      total_products: variantSet.size,
      total_stock: totalStock,
      total_valuation: Math.round(totalValuation * 100) / 100,
      low_stock_alerts: lowStockAlerts,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ZONE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  async getZonesByWarehouse(warehouseId: string): Promise<WarehouseZone[]> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("warehouse_zones")
      .select("*")
      .eq("warehouse_id", warehouseId)
      .order("name");
    if (error) throw new Error(`Failed to get warehouse zones: ${error.message}`);

    const zones = data || [];
    // Enrich with bins and racks count
    const enrichedZones = await Promise.all(
      zones.map(async (z: any) => {
        const { data: bins } = await supabase
          .from("warehouse_bins")
          .select("id, code")
          .eq("zone_id", z.id);

        const binsList = bins || [];
        // Calculate distinct racks from bin codes (e.g., RACK-A01-S01 -> RACK-A01)
        const rackCodes = new Set<string>();
        binsList.forEach((b) => {
          const parts = b.code.split("-");
          if (parts.length >= 2) {
            rackCodes.add(`${parts[0]}-${parts[1]}`);
          } else {
            rackCodes.add(parts[0]);
          }
        });

        return {
          ...z,
          bins_count: binsList.length,
          racks_count: rackCodes.size || (binsList.length > 0 ? 1 : 0),
          is_active: z.status === "ACTIVE",
        } as WarehouseZone;
      })
    );

    return enrichedZones;
  }

  async getZoneById(id: string): Promise<WarehouseZone | null> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("warehouse_zones")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Failed to get zone: ${error.message}`);
    return data ? { ...data, is_active: data.status === "ACTIVE" } : null;
  }

  async createZone(zoneData: Partial<WarehouseZone>): Promise<WarehouseZone> {
    const supabase = this.getAdminClient();

    // Map UI type to database allowed type (STORAGE, PICKING, RETURNS, COLD_STORAGE, QUARANTINE)
    const upperType = String(zoneData.type || "STORAGE").toUpperCase().trim();
    let dbType = "STORAGE";
    if (["STORAGE", "PICKING", "RETURNS", "COLD_STORAGE", "QUARANTINE"].includes(upperType)) {
      dbType = upperType;
    } else if (upperType.includes("PICK")) {
      dbType = "PICKING";
    } else if (upperType.includes("RETURN")) {
      dbType = "RETURNS";
    } else if (upperType.includes("COLD")) {
      dbType = "COLD_STORAGE";
    } else if (upperType.includes("DAMAGE") || upperType.includes("QUARANTINE")) {
      dbType = "QUARANTINE";
    }

    const payload: any = {
      warehouse_id: zoneData.warehouse_id,
      name: zoneData.name?.trim(),
      type: dbType,
      status: zoneData.status || (zoneData.is_active !== false ? "ACTIVE" : "INACTIVE"),
      description: zoneData.description?.trim() || null,
    };

    const { data, error } = await supabase
      .from("warehouse_zones")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Failed to create zone: ${error.message}`);
    return { ...data, is_active: data.status === "ACTIVE" } as WarehouseZone;
  }

  async updateZone(id: string, zoneData: Partial<WarehouseZone>): Promise<WarehouseZone> {
    const supabase = this.getAdminClient();
    const payload: any = { updated_at: new Date().toISOString() };

    if (zoneData.name !== undefined) payload.name = zoneData.name.trim();
    if (zoneData.description !== undefined) payload.description = zoneData.description;
    if (zoneData.is_active !== undefined) payload.status = zoneData.is_active ? "ACTIVE" : "INACTIVE";
    if (zoneData.status !== undefined) payload.status = zoneData.status;

    if (zoneData.type !== undefined) {
      const upperType = String(zoneData.type).toUpperCase().trim();
      if (["STORAGE", "PICKING", "RETURNS", "COLD_STORAGE", "QUARANTINE"].includes(upperType)) {
        payload.type = upperType;
      }
    }

    const { data, error } = await supabase
      .from("warehouse_zones")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update zone: ${error.message}`);
    return { ...data, is_active: data.status === "ACTIVE" } as WarehouseZone;
  }

  async deleteZone(id: string): Promise<void> {
    const supabase = this.getAdminClient();
    // Check if any bins exist
    const { data: bins } = await supabase.from("warehouse_bins").select("id").eq("zone_id", id).limit(1);
    if (bins && bins.length > 0) {
      throw new Error("Cannot delete zone containing shelves/bins. Please remove or reassign bins first.");
    }
    const { error } = await supabase.from("warehouse_zones").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete zone: ${error.message}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RACK MANAGEMENT (Zone -> Racks)
  // ─────────────────────────────────────────────────────────────────────────────

  async getRacksByZone(zoneId: string): Promise<WarehouseRack[]> {
    const supabase = this.getAdminClient();
    const { data: bins } = await supabase
      .from("warehouse_bins")
      .select("*")
      .eq("zone_id", zoneId)
      .order("code");

    // Group bins by rack prefix (e.g. "RACK-A01-S01" -> "RACK-A01")
    const rackMap = new Map<string, { bins: any[]; totalCapacity: number }>();
    (bins || []).forEach((b) => {
      const parts = b.code.split("-");
      const rackCode = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : parts[0];
      if (!rackMap.has(rackCode)) {
        rackMap.set(rackCode, { bins: [], totalCapacity: 0 });
      }
      const entry = rackMap.get(rackCode)!;
      entry.bins.push(b);
      entry.totalCapacity += Number(b.capacity_volume) || 0;
    });

    const racks: WarehouseRack[] = [];
    rackMap.forEach((entry, code) => {
      racks.push({
        id: `${zoneId}-${code}`,
        zone_id: zoneId,
        name: `Rack ${code.replace(/^RACK-/i, "")}`,
        code,
        shelves_count: entry.bins.length,
        capacity: entry.totalCapacity,
        status: entry.bins.every((b) => b.status === "ACTIVE") ? "ACTIVE" : "INACTIVE",
        description: `${entry.bins.length} shelf location(s)`,
      });
    });

    return racks;
  }

  async createRack(
    zoneId: string,
    rackData: { name: string; code: string; shelves_count?: number; capacity?: number; status?: string; description?: string }
  ): Promise<WarehouseRack> {
    const supabase = this.getAdminClient();
    const cleanRackCode = (rackData.code || rackData.name.replace(/[^A-Za-z0-9]/g, ""))
      .toUpperCase()
      .trim();

    const formattedRackCode = cleanRackCode.startsWith("RACK-") ? cleanRackCode : `RACK-${cleanRackCode}`;
    const shelvesCount = Math.max(1, Number(rackData.shelves_count) || 4);
    const capacityPerShelf = rackData.capacity ? Math.round(rackData.capacity / shelvesCount) : 50;

    // Create shelves/bins under this rack
    const binsToCreate = [];
    for (let i = 1; i <= shelvesCount; i++) {
      const shelfCode = `S${String(i).padStart(2, "0")}`;
      binsToCreate.push({
        zone_id: zoneId,
        code: `${formattedRackCode}-${shelfCode}`,
        barcode: `${formattedRackCode}-${shelfCode}`,
        capacity_volume: capacityPerShelf,
        status: rackData.status || "ACTIVE",
      });
    }

    const { error } = await supabase.from("warehouse_bins").insert(binsToCreate);
    if (error) throw new Error(`Failed to create rack shelves: ${error.message}`);

    return {
      id: `${zoneId}-${formattedRackCode}`,
      zone_id: zoneId,
      name: rackData.name || `Rack ${cleanRackCode}`,
      code: formattedRackCode,
      shelves_count: shelvesCount,
      capacity: rackData.capacity || shelvesCount * capacityPerShelf,
      status: rackData.status || "ACTIVE",
      description: rackData.description || `Created with ${shelvesCount} shelves`,
    };
  }

  async deleteRack(zoneId: string, rackCode: string): Promise<void> {
    const supabase = this.getAdminClient();
    // Check if any bins in this rack have stock
    const { data: bins } = await supabase
      .from("warehouse_bins")
      .select("id")
      .eq("zone_id", zoneId)
      .ilike("code", `${rackCode}%`);

    if (bins && bins.length > 0) {
      const binIds = bins.map((b) => b.id);
      const { data: stock } = await supabase
        .from("inventory_levels")
        .select("id, quantity_available")
        .in("bin_id", binIds);

      const hasStock = (stock || []).some((s) => s.quantity_available > 0);
      if (hasStock) {
        throw new Error("Cannot delete rack: products are currently stored in these shelves.");
      }

      await supabase.from("warehouse_bins").delete().in("id", binIds);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SHELF / BIN MANAGEMENT (Rack -> Shelf/Bin)
  // ─────────────────────────────────────────────────────────────────────────────

  async getBinsByZone(zoneId: string): Promise<WarehouseBin[]> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("warehouse_bins")
      .select("*")
      .eq("zone_id", zoneId)
      .order("code");

    if (error) throw new Error(`Failed to get warehouse bins: ${error.message}`);
    return (data || []) as WarehouseBin[];
  }

  async createBin(binData: Partial<WarehouseBin>): Promise<WarehouseBin> {
    const supabase = this.getAdminClient();
    const code = (binData.code || binData.name || "BIN").trim().toUpperCase();

    // Check code uniqueness within zone
    const { data: existing } = await supabase
      .from("warehouse_bins")
      .select("id")
      .eq("zone_id", binData.zone_id)
      .ilike("code", code)
      .maybeSingle();

    if (existing) {
      throw new Error(`A shelf/bin with code "${code}" already exists in this zone.`);
    }

    const payload: any = {
      zone_id: binData.zone_id,
      code,
      barcode: binData.barcode || code,
      capacity_volume: binData.capacity_volume || binData.maximum_capacity || null,
      status: binData.status || "ACTIVE",
    };

    const { data, error } = await supabase
      .from("warehouse_bins")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Failed to create shelf/bin: ${error.message}`);
    return data as WarehouseBin;
  }

  async updateBin(id: string, binData: Partial<WarehouseBin>): Promise<WarehouseBin> {
    const supabase = this.getAdminClient();
    const payload: any = { updated_at: new Date().toISOString() };

    if (binData.code !== undefined) payload.code = binData.code.trim().toUpperCase();
    if (binData.barcode !== undefined) payload.barcode = binData.barcode;
    if (binData.capacity_volume !== undefined || binData.maximum_capacity !== undefined) {
      payload.capacity_volume = binData.capacity_volume || binData.maximum_capacity;
    }
    if (binData.status !== undefined) payload.status = binData.status;

    const { data, error } = await supabase
      .from("warehouse_bins")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update bin: ${error.message}`);
    return data as WarehouseBin;
  }

  async deleteBin(id: string): Promise<void> {
    const supabase = this.getAdminClient();
    // Check if stock exists in bin
    const { data: stock } = await supabase
      .from("inventory_levels")
      .select("quantity_available")
      .eq("bin_id", id)
      .limit(1);

    if (stock && stock.length > 0 && (stock[0].quantity_available || 0) > 0) {
      throw new Error("Cannot delete bin: stock is currently assigned to this bin.");
    }

    const { error } = await supabase.from("warehouse_bins").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete bin: ${error.message}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WAREHOUSE INVENTORY
  // ─────────────────────────────────────────────────────────────────────────────

  async getWarehouseInventory(
    warehouseId: string,
    filters?: { search?: string; category?: string; status?: string; zone_id?: string; page?: number; limit?: number }
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const supabase = this.getAdminClient();

    let query = supabase
      .from("inventory_levels")
      .select(
        `*,
        variant:variants(
          id,
          sku,
          barcode,
          price_override,
          product:products(
            id,
            name,
            base_price,
            cost_price,
            category:categories(name)
          )
        ),
        bin:warehouse_bins(
          id,
          code,
          zone:warehouse_zones(id, name)
        )`,
        { count: "exact" }
      )
      .eq("warehouse_id", warehouseId);

    if (filters?.zone_id) {
      // Filter by zone if bin joined
    }

    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, filters?.limit || 50);
    const start = (page - 1) * limit;
    query = query.range(start, start + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new Error(`Failed to get warehouse inventory: ${error.message}`);

    const items = (data || []).map((row: any) => {
      const avail = row.quantity_available || 0;
      const res = row.quantity_reserved || 0;
      const dam = row.quantity_damaged || 0;
      const total = avail + res + dam;
      const cost = Number(row.variant?.product?.cost_price || row.variant?.product?.base_price || 0);
      const reorder = Number(row.reorder_point) || 5;

      let stockStatus = "IN_STOCK";
      if (avail <= 0) {
        stockStatus = "OUT_OF_STOCK";
      } else if (avail <= reorder) {
        stockStatus = "LOW_STOCK";
      } else if (avail > 500) {
        stockStatus = "OVERSTOCK";
      }

      // Extract Rack and Shelf from bin code
      const binCode = row.bin?.code || "—";
      const parts = binCode.split("-");
      const rackCode = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : parts[0] || "—";
      const shelfCode = parts.length >= 3 ? parts.slice(2).join("-") : parts[1] || "—";

      return {
        id: row.id,
        variant_id: row.variant_id,
        sku: row.variant?.sku || "—",
        product_name: row.variant?.product?.name || "Unknown Product",
        category_name: row.variant?.product?.category?.name || "General",
        zone_name: row.bin?.zone?.name || "General Area",
        rack_code: rackCode,
        shelf_code: shelfCode,
        bin_code: binCode,
        bin_id: row.bin_id,
        quantity_available: avail,
        quantity_reserved: res,
        quantity_damaged: dam,
        total_quantity: total,
        unit_cost: cost,
        stock_value: Math.round(avail * cost * 100) / 100,
        stock_status: stockStatus,
        reorder_point: reorder,
      };
    });

    let filteredItems = items;
    if (filters?.search?.trim()) {
      const s = filters.search.toLowerCase();
      filteredItems = filteredItems.filter(
        (i) =>
          i.sku.toLowerCase().includes(s) ||
          i.product_name.toLowerCase().includes(s) ||
          i.bin_code.toLowerCase().includes(s)
      );
    }

    if (filters?.status && filters.status !== "all") {
      filteredItems = filteredItems.filter((i) => i.stock_status.toLowerCase() === filters.status?.toLowerCase());
    }

    const total = count || filteredItems.length;
    return {
      data: filteredItems,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getDefaultWarehouse(): Promise<Warehouse | null> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Failed to get default warehouse: ${error.message}`);
    if (!data) return null;

    const meta = parseWarehouseMetadata(data);
    return {
      ...data,
      ...meta,
      code: (data as any).warehouse_code || (data as any).code || "",
    } as Warehouse;
  }
}
