export type OperationalWarehouseType =
  | "MAIN_WAREHOUSE"
  | "DISTRIBUTION_CENTER"
  | "STORE"
  | "FACTORY"
  | "TRANSIT_WAREHOUSE"
  | "OTHER";

export interface WarehouseLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
}

export interface WarehouseContact {
  manager_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
}

export interface WarehouseSettings {
  is_default?: boolean;
  allow_negative_stock?: boolean;
  enable_stock_tracking?: boolean;
  enable_batch_tracking?: boolean;
  enable_serial_tracking?: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  code?: string;
  warehouse_code?: string;
  type: string;
  operational_type?: OperationalWarehouseType | string;
  is_active: boolean;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  manager_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  is_default?: boolean;
  allow_negative_stock?: boolean;
  enable_stock_tracking?: boolean;
  enable_batch_tracking?: boolean;
  enable_serial_tracking?: boolean;
  notes?: string;
  description?: string;
  capacity_sqft?: number;
  status?: string;
  // Computed stats
  total_products?: number;
  total_stock?: number;
  available_stock?: number;
  reserved_stock?: number;
  damaged_stock?: number;
  low_stock_items?: number;
  out_of_stock_items?: number;
  total_stock_value?: number;
  zones_count?: number;
  bins_count?: number;
  created_at: string;
  updated_at: string;
}

export type ZoneType =
  | "STORAGE"
  | "RECEIVING"
  | "PICKING"
  | "PACKING"
  | "SHIPPING"
  | "RETURNS"
  | "DAMAGED"
  | "COLD_STORAGE"
  | "OTHER"
  | "QUARANTINE";

export interface WarehouseZone {
  id: string;
  warehouse_id: string;
  name: string;
  code?: string;
  type: ZoneType | string;
  status?: "ACTIVE" | "INACTIVE" | string;
  is_active?: boolean;
  description?: string;
  racks_count?: number;
  bins_count?: number;
  created_at: string;
  updated_at: string;
}

export interface WarehouseRack {
  id: string;
  zone_id: string;
  name: string;
  code: string;
  shelves_count: number;
  capacity?: number;
  status: "ACTIVE" | "INACTIVE" | string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WarehouseBin {
  id: string;
  zone_id: string;
  rack_id?: string;
  rack_code?: string;
  shelf_code?: string;
  name?: string;
  code: string;
  barcode?: string;
  capacity_volume?: number;
  capacity_weight?: number;
  maximum_capacity?: number;
  current_quantity?: number;
  status?: "ACTIVE" | "INACTIVE" | string;
  created_at: string;
  updated_at: string;
}

export interface StockInPayload {
  variant_id: string;
  warehouse_id: string;
  zone_id?: string;
  rack_id?: string;
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
}

export interface StockOutPayload {
  variant_id: string;
  warehouse_id: string;
  zone_id?: string;
  rack_id?: string;
  bin_id?: string;
  quantity: number;
  reason:
    | "CUSTOMER_ORDER"
    | "SALES"
    | "DAMAGED"
    | "LOST"
    | "INTERNAL_USAGE"
    | "MANUAL_ADJUSTMENT"
    | "OTHER"
    | string;
  notes?: string;
  reference_id?: string;
}

export interface StockTransferPayload {
  variant_id: string;
  from_warehouse_id: string;
  from_zone_id?: string;
  from_rack_id?: string;
  from_bin_id?: string;
  to_warehouse_id: string;
  to_zone_id?: string;
  to_rack_id?: string;
  to_bin_id?: string;
  quantity: number;
  reason?: string;
  notes?: string;
}

export interface StockAdjustmentPayload {
  variant_id: string;
  warehouse_id: string;
  bin_id?: string;
  physical_count: number;
  reason: string;
  notes?: string;
}

export interface InventoryLevel {
  id: string;
  variant_id: string;
  warehouse_id: string;
  bin_id?: string;
  quantity_available: number;
  quantity_reserved: number;
  quantity_incoming: number;
  quantity_damaged: number;
  quantity_returned: number;
  reorder_point: number;
  safety_stock: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  variant_id: string;
  warehouse_id: string;
  movement_type:
    | "RECEIVE"
    | "TRANSFER"
    | "ADJUST"
    | "RESERVE"
    | "RELEASE"
    | "SHIP"
    | "RETURN"
    | "DAMAGE";
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  from_bin_id?: string;
  to_bin_id?: string;
  to_warehouse_id?: string;
  reason_code?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  lead_time_days: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  destination_warehouse_id: string;
  status: "DRAFT" | "SENT" | "PARTIAL_RECEIPT" | "FULFILLED" | "CANCELLED";
  ordered_by?: string;
  expected_delivery_date?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  variant_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryAudit {
  id: string;
  warehouse_id: string;
  zone_id?: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  assigned_to?: string;
  scheduled_date?: string;
  completed_date?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryAuditItem {
  id: string;
  audit_id: string;
  variant_id: string;
  bin_id?: string;
  expected_quantity: number;
  counted_quantity?: number;
  variance?: number;
  status: "PENDING" | "COUNTED" | "DISCREPANCY" | "RESOLVED";
  created_at: string;
  updated_at: string;
}
