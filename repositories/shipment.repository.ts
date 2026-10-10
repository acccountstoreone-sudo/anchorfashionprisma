// ============================================================================
// Shipment Repository
// ============================================================================

import { createAdminClient } from "@/lib/supabase/admin-client";
import { createClient } from "@/lib/supabase/server-client";
import {
  Shipment,
  ShipmentItem,
  ShipmentTrackingEvent,
  ShipmentLabel,
  ShipmentEvent,
  ShipmentWithDetails,
  ShipmentFilters,
  PaginatedResult,
  ShippingEventType,
} from "@/types/shipping.types";

export class ShipmentRepository {
  private getAdminClient() {
    return createAdminClient();
  }

  /**
   * Create a shipment with its items in sequence.
   */
  async createShipment(
    data: Omit<
      Partial<Shipment>,
      "id" | "shipment_number" | "created_at" | "updated_at"
    >,
    items: Omit<Partial<ShipmentItem>, "id" | "shipment_id" | "created_at">[]
  ): Promise<Shipment> {
    const supabase = this.getAdminClient();

    const { data: shipment, error } = await supabase
      .from("shipments")
      .insert(data as any)
      .select()
      .single();

    if (error) throw new Error(`Create shipment failed: ${error.message}`);

    if (items.length > 0) {
      const { error: itemError } = await supabase
        .from("shipment_items")
        .insert(
          items.map((item) => ({ ...item, shipment_id: shipment.id })) as any
        );

      if (itemError)
        console.error("Failed to insert shipment items:", itemError);
    }

    return shipment as Shipment;
  }

  /**
   * Update shipment fields.
   */
  async updateShipment(
    id: string,
    data: Partial<Shipment> & { [key: string]: any }
  ): Promise<Shipment> {
    const supabase = this.getAdminClient();

    const { data: updated, error } = await supabase
      .from("shipments")
      .update(data as any)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Update shipment failed: ${error.message}`);
    return updated as Shipment;
  }

  /**
   * Get shipment by ID.
   */
  async getShipmentById(id: string): Promise<Shipment | null> {
    const supabase = this.getAdminClient();

    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Get shipment failed: ${error.message}`);
    return data as Shipment | null;
  }

  /**
   * Get shipment by tracking number.
   */
  async getShipmentByTrackingNumber(
    trackingNumber: string
  ): Promise<Shipment | null> {
    const supabase = this.getAdminClient();

    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    if (error)
      throw new Error(`Get shipment by tracking failed: ${error.message}`);
    return data as Shipment | null;
  }

  /**
   * Get all shipments for an order.
   */
  async getShipmentsByOrderId(orderId: string): Promise<Shipment[]> {
    const supabase = this.getAdminClient();

    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error)
      throw new Error(`Get shipments by order failed: ${error.message}`);
    return (data ?? []) as Shipment[];
  }

  /**
   * Get full shipment details with related data (uses DB view / joins).
   */
  async getShipmentWithDetails(
    id: string
  ): Promise<ShipmentWithDetails | null> {
    const supabase = this.getAdminClient();

    const { data, error } = await supabase
      .from("shipments")
      .select(
        `
        *,
        items:shipment_items(*),
        tracking_events:shipment_tracking_events(* ORDER BY event_time DESC),
        labels:shipment_labels(* ORDER BY created_at DESC),
        events:shipment_events(* ORDER BY created_at DESC),
        courier:courier_providers(id, code, display_name, logo_url),
        zone:delivery_zones(id, name, code, estimated_days_min, estimated_days_max),
        order:orders(order_number)
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Get shipment details failed: ${error.message}`);
    if (!data) return null;

    return {
      ...(data as any),
      order_number: (data as any).order?.order_number ?? null,
    } as ShipmentWithDetails;
  }

  /**
   * List shipments with filters and pagination.
   */
  async listShipments(
    filters: ShipmentFilters
  ): Promise<PaginatedResult<Shipment>> {
    const supabase = this.getAdminClient();
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("v_shipments_summary")
      .select("*", { count: "exact" });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.courierCode)
      query = query.eq("courier_provider_code", filters.courierCode);
    if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
    if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
    if (filters.search) {
      query = query.or(
        `shipment_number.ilike.%${filters.search}%,tracking_number.ilike.%${filters.search}%,recipient_name.ilike.%${filters.search}%`
      );
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`List shipments failed: ${error.message}`);

    return {
      data: (data ?? []) as Shipment[],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  // ============================================================================
  // TRACKING EVENTS
  // ============================================================================

  async addTrackingEvent(
    shipmentId: string,
    event: Omit<ShipmentTrackingEvent, "id" | "shipment_id" | "created_at">
  ): Promise<void> {
    const supabase = this.getAdminClient();
    await supabase
      .from("shipment_tracking_events")
      .insert({ ...event, shipment_id: shipmentId } as any);
  }

  async upsertTrackingEvent(
    shipmentId: string,
    event: Omit<ShipmentTrackingEvent, "id" | "shipment_id" | "created_at">
  ): Promise<void> {
    const supabase = this.getAdminClient();
    // Upsert by (shipment_id, event_time, status) to prevent duplicates
    const { error } = await supabase
      .from("shipment_tracking_events")
      .upsert({ ...event, shipment_id: shipmentId } as any, {
        onConflict: "shipment_id,event_time,status",
        ignoreDuplicates: true,
      });
    if (error) console.error("Upsert tracking event:", error);
  }

  async getTrackingEvents(
    shipmentId: string
  ): Promise<ShipmentTrackingEvent[]> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("shipment_tracking_events")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("event_time", { ascending: false });

    if (error) throw new Error(`Get tracking events failed: ${error.message}`);
    return (data ?? []) as ShipmentTrackingEvent[];
  }

  // ============================================================================
  // LABELS
  // ============================================================================

  async saveLabel(
    shipmentId: string,
    label: Omit<
      ShipmentLabel,
      | "id"
      | "shipment_id"
      | "generated_at"
      | "printed_at"
      | "print_count"
      | "created_at"
    >
  ): Promise<ShipmentLabel> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("shipment_labels")
      .insert({ ...label, shipment_id: shipmentId } as any)
      .select()
      .single();

    if (error) throw new Error(`Save label failed: ${error.message}`);
    return data as ShipmentLabel;
  }

  async getLabels(shipmentId: string): Promise<ShipmentLabel[]> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("shipment_labels")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Get labels failed: ${error.message}`);
    return (data ?? []) as ShipmentLabel[];
  }

  async incrementLabelPrintCount(labelId: string): Promise<void> {
    const supabase = this.getAdminClient();
    await supabase
      .from("shipment_labels")
      .update({ printed_at: new Date().toISOString() } as any)
      .eq("id", labelId);

    // Increment via raw SQL for atomicity
    await supabase
      .rpc("increment_label_print_count", { label_id: labelId })
      .maybeSingle();
  }

  // ============================================================================
  // EVENTS
  // ============================================================================

  async addEvent(
    shipmentId: string,
    eventType: ShippingEventType,
    payload: Record<string, any> = {},
    triggeredBy?: string,
    source: "system" | "admin" | "webhook" | "customer" = "system"
  ): Promise<void> {
    const supabase = this.getAdminClient();
    await supabase.from("shipment_events").insert({
      shipment_id: shipmentId,
      event_type: eventType,
      payload,
      triggered_by: triggeredBy ?? null,
      source,
    } as any);
  }
}
