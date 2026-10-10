import { createAdminClient } from "@/lib/supabase/admin-client";
import { InventoryLevel, InventoryMovement } from "@/types/inventory.types";

export class InventoryRepository {
  private getAdminClient() {
    return createAdminClient();
  }

  /**
   * Get stock level for a variant across all warehouses or a specific one.
   */
  async getStockLevel(
    variantId: string,
    warehouseId?: string
  ): Promise<InventoryLevel[]> {
    const supabase = this.getAdminClient();
    let query = supabase
      .from("inventory_levels")
      .select("*")
      .eq("variant_id", variantId);

    if (warehouseId) {
      query = query.eq("warehouse_id", warehouseId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to get stock level: ${error.message}`);
    return data as InventoryLevel[];
  }

  /**
   * Adjust stock via an RPC function or a standard update (since we need atomic operations).
   */
  async reserveStock(
    variantId: string,
    warehouseId: string,
    quantity: number
  ): Promise<void> {
    const supabase = this.getAdminClient();
    
    if (quantity <= 0) {
      throw new Error(`Quantity must be greater than zero`);
    }

    const { error } = await supabase.rpc("atomic_reserve_stock", {
      p_variant_id: variantId,
      p_warehouse_id: warehouseId,
      p_quantity: quantity,
    });

    if (error) {
      throw new Error(`Failed to reserve stock: ${error.message}`);
    }
  }

  async releaseStock(
    variantId: string,
    warehouseId: string,
    quantity: number
  ): Promise<void> {
    const supabase = this.getAdminClient();

    if (quantity <= 0) {
      throw new Error(`Quantity must be greater than zero`);
    }

    const { error } = await supabase.rpc("atomic_release_stock", {
      p_variant_id: variantId,
      p_warehouse_id: warehouseId,
      p_quantity: quantity,
    });

    if (error) {
      throw new Error(`Failed to release stock: ${error.message}`);
    }
  }

  async reduceStock(
    variantId: string,
    warehouseId: string,
    quantity: number,
    fromReserved = true
  ): Promise<void> {
    const supabase = this.getAdminClient();

    if (quantity <= 0) {
      throw new Error(`Quantity must be greater than zero`);
    }

    const { error } = await supabase.rpc("atomic_reduce_stock", {
      p_variant_id: variantId,
      p_warehouse_id: warehouseId,
      p_quantity: quantity,
      p_from_reserved: fromReserved,
    });

    if (error) {
      throw new Error(`Failed to reduce stock: ${error.message}`);
    }
  }

  /**
   * Record an inventory movement (audit log).
   */
  async recordMovement(
    movement: any
  ): Promise<void> {
    const supabase = this.getAdminClient();
    const rawReason =
      movement.reason ||
      movement.notes ||
      movement.reason_code ||
      movement.movement_type ||
      "Stock Adjustment";
    const rawReasonCode = movement.reason_code || movement.movement_type || null;

    const payload = {
      variant_id: movement.variant_id,
      warehouse_id: movement.warehouse_id,
      quantity_change:
        movement.quantity_change !== undefined
          ? movement.quantity_change
          : movement.quantity !== undefined
          ? movement.quantity
          : 0,
      reason: String(rawReason).slice(0, 50),
      reason_code: rawReasonCode ? String(rawReasonCode).slice(0, 50) : null,
      reference_id: movement.reference_id || null,
      to_warehouse_id: movement.to_warehouse_id || null,
      from_bin_id: movement.from_bin_id || null,
      to_bin_id: movement.to_bin_id || null,
      user_id: movement.user_id || null,
    };

    try {
      const { error } = await supabase
        .from("stock_movements")
        .insert(payload);
      if (error) {
        console.warn(`Failed to record stock movement: ${error.message}`);
      }
    } catch (e: any) {
      console.warn("Could not insert stock_movements log:", e?.message);
    }
  }

  /**
   * Get all inventory levels (paginated)
   */
  async getAllInventoryLevels(
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: InventoryLevel[]; total: number }> {
    const supabase = this.getAdminClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("inventory_levels")
      .select("*", { count: "exact" })
      .range(from, to);

    if (error)
      throw new Error(`Failed to fetch inventory levels: ${error.message}`);

    return {
      data: (data ?? []) as InventoryLevel[],
      total: count ?? 0,
    };
  }

  /**
   * Get inventory dashboard data (with SKU, Product Name, and Warehouse Name)
   */
  async getInventoryDashboard(limit = 20, search?: string) {
    const supabase = this.getAdminClient();

    let query = supabase
      .from("inventory_levels")
      .select(`
        id,
        quantity_available,
        quantity_reserved,
        reorder_point,
        variant:variants(sku, product:products(name)),
        warehouse:warehouses(name)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit);

    // Note: Filtering heavily nested relations in postgREST might be limited without an RPC,
    // but we can try basic filtering or skip filtering at db level if it errors.
    // Assuming we want a basic list for the dashboard.
    
    // In a real enterprise app, an RPC or dedicated View should be used to allow efficient searching
    // across joined tables. Since this is an MVP fix, we'll fetch without deep search or let PostgREST
    // do its best.
    
    const { data, error, count } = await query;
    if (error) {
      console.error("Error fetching inventory dashboard:", error);
      throw error;
    }

    // Process data to match flat dashboard needs
    const processed = (data || []).map((item: any) => ({
      id: item.id,
      sku: item.variant?.sku || "Unknown SKU",
      name: item.variant?.product?.name || "Unknown Product",
      warehouse: item.warehouse?.name || "Unknown Warehouse",
      available: item.quantity_available,
      reserved: item.quantity_reserved,
      status: item.quantity_available <= 0 ? "Out of Stock" : item.quantity_available <= (item.reorder_point || 0) ? "Low Stock" : "In Stock"
    }));

    // If search is provided, filter in memory for MVP since nested PostgREST OR filtering is complex
    let filtered = processed;
    if (search) {
      const s = search.toLowerCase();
      filtered = processed.filter(p => p.sku.toLowerCase().includes(s) || p.name.toLowerCase().includes(s));
    }

    const totalInStock = processed.reduce((acc, curr) => acc + curr.available, 0);
    const lowStockCount = processed.filter(p => p.status === "Low Stock").length;
    const outOfStockCount = processed.filter(p => p.status === "Out of Stock").length;

    return {
      items: filtered,
      stats: {
        totalItems: totalInStock,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      }
    };
  }

  /**
   * Adjust stock manually
   */
  async adjustStock(
    inventoryId: string,
    newAvailable: number,
    newReserved: number,
    reason: string
  ): Promise<void> {
    const supabase = this.getAdminClient();

    const { data: inv, error: fetchError } = await supabase
      .from("inventory_levels")
      .select("*")
      .eq("id", inventoryId)
      .single();

    if (fetchError || !inv) throw new Error("Inventory not found");

    const { error } = await supabase
      .from("inventory_levels")
      .update({
        quantity_available: newAvailable,
        quantity_reserved: newReserved,
      })
      .eq("id", inventoryId);

    if (error) throw new Error(`Failed to adjust stock: ${error.message}`);

    // Record movement
    await this.recordMovement({
      variant_id: inv.variant_id,
      warehouse_id: inv.warehouse_id,
      movement_type: "ADJUST",
      quantity: newAvailable - inv.quantity_available, // Net change
      reason_code: reason,
      notes: `Adjusted from ${inv.quantity_available} to ${newAvailable}`,
    });
  }

  /**
   * Get stock movements (paginated)
   */
  async getMovements(
    page: number = 1,
    limit: number = 20,
    warehouseId?: string,
    variantId?: string
  ): Promise<{ data: InventoryMovement[]; total: number }> {
    const supabase = this.getAdminClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("stock_movements")
      .select("*", { count: "exact" });
    if (warehouseId) query = query.eq("warehouse_id", warehouseId);
    if (variantId) query = query.eq("variant_id", variantId);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(`Failed to fetch movements: ${error.message}`);

    return {
      data: (data ?? []) as InventoryMovement[],
      total: count ?? 0,
    };
  }

  /**
   * Transfer stock between warehouses
   */
  async transferStock(
    variantId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number,
    reason: string,
    notes?: string
  ): Promise<void> {
    const supabase = this.getAdminClient();

    if (quantity <= 0) {
      throw new Error(`Quantity must be greater than zero`);
    }

    if (fromWarehouseId === toWarehouseId) {
      throw new Error(`Source and destination warehouse must be different`);
    }

    // 1. Check source warehouse inventory
    const { data: sourceLevels, error: srcErr } = await supabase
      .from("inventory_levels")
      .select("*")
      .eq("variant_id", variantId)
      .eq("warehouse_id", fromWarehouseId)
      .limit(1);

    if (srcErr) throw new Error(`Failed to check source inventory: ${srcErr.message}`);
    const sourceInv = sourceLevels && sourceLevels.length > 0 ? sourceLevels[0] : null;
    const sourceAvail = sourceInv ? Number(sourceInv.quantity_available) || 0 : 0;

    if (!sourceInv || sourceAvail < quantity) {
      throw new Error(
        `Insufficient stock in source warehouse. Available: ${sourceAvail}, Requested: ${quantity}`
      );
    }

    // 2. Decrement source inventory
    const { error: decErr } = await supabase
      .from("inventory_levels")
      .update({
        quantity_available: sourceAvail - quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceInv.id);

    if (decErr) throw new Error(`Failed to deduct stock from source warehouse: ${decErr.message}`);

    // 3. Increment or insert destination inventory
    const { data: destLevels, error: dstErr } = await supabase
      .from("inventory_levels")
      .select("*")
      .eq("variant_id", variantId)
      .eq("warehouse_id", toWarehouseId)
      .limit(1);

    if (dstErr) throw new Error(`Failed to check destination inventory: ${dstErr.message}`);

    if (destLevels && destLevels.length > 0) {
      const destInv = destLevels[0];
      const destAvail = Number(destInv.quantity_available) || 0;
      const { error: incErr } = await supabase
        .from("inventory_levels")
        .update({
          quantity_available: destAvail + quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", destInv.id);

      if (incErr) throw new Error(`Failed to add stock to destination warehouse: ${incErr.message}`);
    } else {
      const { error: insErr } = await supabase
        .from("inventory_levels")
        .insert({
          variant_id: variantId,
          warehouse_id: toWarehouseId,
          quantity_available: quantity,
          quantity_reserved: 0,
          quantity_incoming: 0,
          quantity_damaged: 0,
          quantity_returned: 0,
          reorder_point: 5,
          safety_stock: 2,
        });

      if (insErr) throw new Error(`Failed to initialize inventory in destination warehouse: ${insErr.message}`);
    }

    // 4. Record movement out
    await this.recordMovement({
      variant_id: variantId,
      warehouse_id: fromWarehouseId,
      movement_type: "TRANSFER",
      quantity_change: -quantity,
      to_warehouse_id: toWarehouseId,
      reason: reason ? String(reason).slice(0, 50) : "Inter-Warehouse Transfer",
      reason_code: "TRANSFER_OUT",
      notes: notes || `Transferred to warehouse ${toWarehouseId}`,
    });

    // 5. Record movement in
    await this.recordMovement({
      variant_id: variantId,
      warehouse_id: toWarehouseId,
      movement_type: "TRANSFER",
      quantity_change: quantity,
      reason: reason ? String(reason).slice(0, 50) : "Inter-Warehouse Transfer",
      reason_code: "TRANSFER_IN",
      notes: notes || `Received from warehouse ${fromWarehouseId}`,
    });
  }

  // --- Audits ---

  async getAudits(): Promise<any[]> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("inventory_audits")
      .select("*, warehouse:warehouses(name)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to get audits: ${error.message}`);
    return data;
  }

  async getAuditById(id: string): Promise<any> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("inventory_audits")
      .select("*, warehouse:warehouses(name)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to get audit: ${error.message}`);
    }
    return data;
  }

  async createAudit(auditData: any): Promise<any> {
    const supabase = this.getAdminClient();
    const payload: any = {
      warehouse_id: auditData.warehouse_id,
      status: auditData.status === "PLANNED" ? "SCHEDULED" : (auditData.status || "SCHEDULED"),
      blind_count: auditData.blind_count ?? true,
    };
    if (auditData.zone_id && auditData.zone_id !== "all") {
      payload.zone_id = auditData.zone_id;
    }
    if (auditData.assigned_to) {
      payload.assigned_to = auditData.assigned_to;
    }
    if (auditData.created_by) {
      payload.created_by = auditData.created_by;
    }

    const { data, error } = await supabase
      .from("inventory_audits")
      .insert([payload])
      .select()
      .single();

    if (error) throw new Error(`Failed to create audit: ${error.message}`);
    return data;
  }

  async updateAuditStatus(id: string, status: string): Promise<void> {
    const supabase = this.getAdminClient();
    const dbStatus = status === "PLANNED" ? "SCHEDULED" : status;
    const updates: any = {
      status: dbStatus,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("inventory_audits")
      .update(updates)
      .eq("id", id);

    if (error) throw new Error(`Failed to update audit status: ${error.message}`);
  }

  async getAuditItems(auditId: string): Promise<any[]> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("inventory_audit_items")
      .select("*, variant:variants(sku, product:products(name))")
      .eq("audit_id", auditId);

    if (error) throw new Error(`Failed to get audit items: ${error.message}`);
    return data;
  }

  async createAuditItems(items: any[]): Promise<void> {
    if (items.length === 0) return;
    const supabase = this.getAdminClient();
    const { error } = await supabase
      .from("inventory_audit_items")
      .insert(items);

    if (error) throw new Error(`Failed to create audit items: ${error.message}`);
  }

  async updateAuditItemCount(itemId: string, countedQuantity: number): Promise<void> {
    const supabase = this.getAdminClient();

    // First fetch the item to get expected quantity
    const { data: item, error: fetchError } = await supabase
      .from("inventory_audit_items")
      .select("expected_quantity")
      .eq("id", itemId)
      .single();

    if (fetchError) throw new Error(`Failed to get audit item: ${fetchError.message}`);

    const expected = item.expected_quantity;
    const variance = countedQuantity - expected;
    const status = variance === 0 ? "COUNTED" : "DISCREPANCY";

    const { error } = await supabase
      .from("inventory_audit_items")
      .update({
        counted_quantity: countedQuantity,
        variance,
        status
      })
      .eq("id", itemId);

    if (error) throw new Error(`Failed to update audit item count: ${error.message}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ENTERPRISE STOCK WORKFLOWS (STOCK IN, STOCK OUT, ADJUSTMENT, DETAILED AUDIT)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Enterprise Stock In workflow
   */
  async stockIn(payload: {
    variant_id: string;
    warehouse_id: string;
    bin_id?: string;
    quantity: number;
    unit_cost?: number;
    supplier_id?: string;
    purchase_order_id?: string;
    batch_number?: string;
    serial_number?: string;
    manufacturing_date?: string;
    expiry_date?: string;
    notes?: string;
    userId?: string;
  }): Promise<InventoryLevel> {
    const supabase = this.getAdminClient();
    const qty = Number(payload.quantity);
    if (!qty || qty <= 0) {
      throw new Error("Received quantity must be greater than zero.");
    }

    // Check if warehouse is active
    const { data: wh, error: whErr } = await supabase
      .from("warehouses")
      .select("id, is_active, name")
      .eq("id", payload.warehouse_id)
      .single();
    if (whErr || !wh) throw new Error("Destination warehouse not found.");
    if (!wh.is_active) throw new Error(`Warehouse "${wh.name}" is inactive and cannot receive stock.`);

    // Check existing inventory level
    let query = supabase
      .from("inventory_levels")
      .select("*")
      .eq("variant_id", payload.variant_id)
      .eq("warehouse_id", payload.warehouse_id);

    if (payload.bin_id) {
      query = query.eq("bin_id", payload.bin_id);
    } else {
      query = query.is("bin_id", null);
    }

    const { data: existingLevels, error: fetchErr } = await query.limit(1);
    if (fetchErr) throw new Error(`Database error looking up inventory: ${fetchErr.message}`);

    let updatedLevel: InventoryLevel;

    if (existingLevels && existingLevels.length > 0) {
      const current = existingLevels[0];
      const newAvail = (current.quantity_available || 0) + qty;
      const { data: updated, error: updateErr } = await supabase
        .from("inventory_levels")
        .update({
          quantity_available: newAvail,
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.id)
        .select()
        .single();
      if (updateErr) throw new Error(`Failed to increment inventory: ${updateErr.message}`);
      updatedLevel = updated as InventoryLevel;
    } else {
      const { data: created, error: insertErr } = await supabase
        .from("inventory_levels")
        .insert({
          variant_id: payload.variant_id,
          warehouse_id: payload.warehouse_id,
          bin_id: payload.bin_id || null,
          quantity_available: qty,
          quantity_reserved: 0,
          quantity_incoming: 0,
          quantity_damaged: 0,
          quantity_returned: 0,
          reorder_point: 5,
          safety_stock: 2,
        })
        .select()
        .single();
      if (insertErr) throw new Error(`Failed to create inventory record: ${insertErr.message}`);
      updatedLevel = created as InventoryLevel;
    }

    // Record immutable movement
    const movementNotes = [
      payload.notes,
      payload.batch_number ? `Batch: ${payload.batch_number}` : null,
      payload.serial_number ? `Serial: ${payload.serial_number}` : null,
      payload.purchase_order_id ? `PO: ${payload.purchase_order_id}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    await this.recordMovement({
      variant_id: payload.variant_id,
      warehouse_id: payload.warehouse_id,
      movement_type: "RECEIVE",
      quantity: qty,
      to_bin_id: payload.bin_id || null,
      reference_id: payload.purchase_order_id || null,
      reason_code: "PURCHASE_RECEIPT",
      notes: movementNotes || `Stock In of ${qty} units`,
      user_id: payload.userId || null,
    });

    return updatedLevel;
  }

  /**
   * Enterprise Stock Out workflow
   */
  async stockOut(payload: {
    variant_id: string;
    warehouse_id: string;
    bin_id?: string;
    quantity: number;
    reason: string;
    notes?: string;
    reference_id?: string;
    userId?: string;
  }): Promise<InventoryLevel> {
    const supabase = this.getAdminClient();
    const qty = Number(payload.quantity);
    if (!qty || qty <= 0) {
      throw new Error("Stock Out quantity must be greater than zero.");
    }

    // Check warehouse and its negative stock policy
    const { data: wh, error: whErr } = await supabase
      .from("warehouses")
      .select("id, is_active, name, address")
      .eq("id", payload.warehouse_id)
      .single();
    if (whErr || !wh) throw new Error("Warehouse not found.");
    if (!wh.is_active) throw new Error(`Warehouse "${wh.name}" is deactivated.`);

    let allowNegative = false;
    try {
      if (wh.address && typeof wh.address === "string" && wh.address.startsWith("{")) {
        const parsed = JSON.parse(wh.address);
        allowNegative = !!parsed.allow_negative_stock;
      }
    } catch {
      allowNegative = false;
    }

    // Find inventory level
    let query = supabase
      .from("inventory_levels")
      .select("*")
      .eq("variant_id", payload.variant_id)
      .eq("warehouse_id", payload.warehouse_id);

    if (payload.bin_id) {
      query = query.eq("bin_id", payload.bin_id);
    } else {
      query = query.is("bin_id", null);
    }

    const { data: levels, error: fetchErr } = await query.limit(1);
    if (fetchErr) throw new Error(`Inventory lookup error: ${fetchErr.message}`);

    const current = levels && levels.length > 0 ? levels[0] : null;
    const currentAvail = current ? Number(current.quantity_available) || 0 : 0;

    if (!allowNegative && currentAvail < qty) {
      throw new Error(
        `Insufficient stock in warehouse "${wh.name}". Available: ${currentAvail}, Requested: ${qty}. Negative stock is not enabled for this warehouse.`
      );
    }

    let updatedLevel: InventoryLevel;
    const newAvail = currentAvail - qty;

    if (current) {
      const { data: updated, error: updateErr } = await supabase
        .from("inventory_levels")
        .update({
          quantity_available: newAvail,
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.id)
        .select()
        .single();
      if (updateErr) throw new Error(`Failed to decrement inventory: ${updateErr.message}`);
      updatedLevel = updated as InventoryLevel;
    } else {
      const { data: created, error: insertErr } = await supabase
        .from("inventory_levels")
        .insert({
          variant_id: payload.variant_id,
          warehouse_id: payload.warehouse_id,
          bin_id: payload.bin_id || null,
          quantity_available: newAvail,
          quantity_reserved: 0,
          quantity_incoming: 0,
          quantity_damaged: payload.reason === "DAMAGED" ? qty : 0,
          quantity_returned: 0,
        })
        .select()
        .single();
      if (insertErr) throw new Error(`Failed to create inventory level: ${insertErr.message}`);
      updatedLevel = created as InventoryLevel;
    }

    // Record immutable movement
    await this.recordMovement({
      variant_id: payload.variant_id,
      warehouse_id: payload.warehouse_id,
      movement_type: "SHIP",
      quantity: -qty,
      from_bin_id: payload.bin_id || null,
      reference_id: payload.reference_id || null,
      reason_code: payload.reason || "STOCK_OUT",
      notes: payload.notes || `Stock Out: ${payload.reason || "Removal"}`,
      user_id: payload.userId || null,
    });

    return updatedLevel;
  }

  /**
   * Enterprise Stock Adjustment with mandatory reason and variance calculation
   */
  async stockAdjustment(payload: {
    variant_id: string;
    warehouse_id: string;
    bin_id?: string;
    physical_count: number;
    reason: string;
    notes?: string;
    userId?: string;
  }): Promise<{ updated: InventoryLevel; variance: number }> {
    const supabase = this.getAdminClient();
    if (!payload.reason?.trim()) {
      throw new Error("Reason is required for all manual stock adjustments.");
    }
    const physical = Math.max(0, Number(payload.physical_count));

    let query = supabase
      .from("inventory_levels")
      .select("*")
      .eq("variant_id", payload.variant_id)
      .eq("warehouse_id", payload.warehouse_id);

    if (payload.bin_id) {
      query = query.eq("bin_id", payload.bin_id);
    } else {
      query = query.is("bin_id", null);
    }

    const { data: levels, error: fetchErr } = await query.limit(1);
    if (fetchErr) throw new Error(`Database error: ${fetchErr.message}`);

    const current = levels && levels.length > 0 ? levels[0] : null;
    const systemQty = current ? Number(current.quantity_available) || 0 : 0;
    const variance = physical - systemQty;

    let updatedLevel: InventoryLevel;

    if (current) {
      const { data: updated, error: updateErr } = await supabase
        .from("inventory_levels")
        .update({
          quantity_available: physical,
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.id)
        .select()
        .single();
      if (updateErr) throw new Error(`Failed to update adjusted inventory: ${updateErr.message}`);
      updatedLevel = updated as InventoryLevel;
    } else {
      const { data: created, error: insertErr } = await supabase
        .from("inventory_levels")
        .insert({
          variant_id: payload.variant_id,
          warehouse_id: payload.warehouse_id,
          bin_id: payload.bin_id || null,
          quantity_available: physical,
          quantity_reserved: 0,
          quantity_incoming: 0,
          quantity_damaged: 0,
          quantity_returned: 0,
        })
        .select()
        .single();
      if (insertErr) throw new Error(`Failed to create inventory record: ${insertErr.message}`);
      updatedLevel = created as InventoryLevel;
    }

    // Record movement audit
    await this.recordMovement({
      variant_id: payload.variant_id,
      warehouse_id: payload.warehouse_id,
      movement_type: "ADJUST",
      quantity: variance,
      from_bin_id: payload.bin_id || null,
      reason_code: payload.reason,
      notes: `Physical Count Adjustment: System was ${systemQty}, counted ${physical} (Variance: ${variance > 0 ? "+" : ""}${variance}). Notes: ${payload.notes || ""}`,
      user_id: payload.userId || null,
    });

    return { updated: updatedLevel, variance };
  }

  /**
   * Get rich stock movement history with joined details
   */
  async getDetailedMovements(options?: {
    page?: number;
    limit?: number;
    warehouseId?: string;
    variantId?: string;
    type?: string;
    search?: string;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const supabase = this.getAdminClient();
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, options?.limit || 50);
    const start = (page - 1) * limit;

    let query = supabase
      .from("stock_movements")
      .select(
        `*,
        variant:variants(
          id,
          sku,
          product:products(id, name)
        ),
        warehouse:warehouses!warehouse_id(id, name, warehouse_code),
        to_warehouse:warehouses!to_warehouse_id(id, name, warehouse_code),
        from_bin:warehouse_bins!from_bin_id(id, code, zone:warehouse_zones(name)),
        to_bin:warehouse_bins!to_bin_id(id, code, zone:warehouse_zones(name))`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(start, start + limit - 1);

    if (options?.warehouseId) {
      query = query.or(`warehouse_id.eq.${options.warehouseId},to_warehouse_id.eq.${options.warehouseId}`);
    }
    if (options?.variantId) {
      query = query.eq("variant_id", options.variantId);
    }
    if (options?.type && options.type !== "all") {
      query = query.ilike("reason", `%${options.type}%`);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(`Failed to fetch stock movements: ${error.message}`);

    const movements = (data || []).map((m: any) => {
      let friendlyType = "Movement";
      const r = (m.reason || m.reason_code || "").toUpperCase();
      const change = Number(m.quantity_change) || 0;

      if (r.includes("RECEIVE") || r.includes("PURCHASE") || change > 0 && !r.includes("TRANSFER")) {
        friendlyType = "Stock In";
      } else if (r.includes("SHIP") || r.includes("SALES") || r.includes("ORDER")) {
        friendlyType = "Stock Out";
      } else if (r.includes("TRANSFER")) {
        friendlyType = "Transfer";
      } else if (r.includes("ADJUST") || r.includes("PHYSICAL")) {
        friendlyType = "Adjustment";
      } else if (r.includes("DAMAGE")) {
        friendlyType = "Damage";
      } else if (r.includes("RETURN")) {
        friendlyType = "Return";
      }

      return {
        id: m.id,
        created_at: m.created_at,
        product_name: m.variant?.product?.name || "Product",
        sku: m.variant?.sku || "—",
        warehouse_name: m.warehouse?.name || "Warehouse",
        warehouse_code: m.warehouse?.warehouse_code || "",
        to_warehouse_name: m.to_warehouse?.name,
        zone_name: m.to_bin?.zone?.name || m.from_bin?.zone?.name || "—",
        bin_code: m.to_bin?.code || m.from_bin?.code || "—",
        movement_type: friendlyType,
        raw_type: m.reason || m.reason_code || "ADJUST",
        quantity: change,
        reference_id: m.reference_id || "—",
        user_id: m.user_id || "System",
        notes: m.notes || m.reason || "",
      };
    });

    const total = count || movements.length;
    return {
      data: movements,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

