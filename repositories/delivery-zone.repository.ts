// ============================================================================
// Delivery Zone Repository
// ============================================================================

import { createAdminClient } from "@/lib/supabase/admin-client";
import { DeliveryZone, ShippingRate } from "@/types/shipping.types";

export class DeliveryZoneRepository {
  private getClient() {
    return createAdminClient();
  }

  /**
   * Get zone by code.
   */
  async getZoneByCode(code: string): Promise<DeliveryZone | null> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw new Error(`Get zone by code failed: ${error.message}`);
    return data as DeliveryZone | null;
  }

  /**
   * Get zone by ID.
   */
  async getZoneById(id: string): Promise<DeliveryZone | null> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Get zone by ID failed: ${error.message}`);
    return data as DeliveryZone | null;
  }

  /**
   * Find zone by district or city match.
   */
  async getZoneByAddress(
    district: string,
    city?: string
  ): Promise<DeliveryZone | null> {
    const supabase = this.getClient();

    // Try to match district in the districts array
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("is_active", true)
      .contains("districts", [district]);

    if (error) throw new Error(`Zone lookup failed: ${error.message}`);

    if (data && data.length > 0) return data[0] as DeliveryZone;

    // Fallback: try city match in any array element
    if (city) {
      const { data: cityMatch } = await supabase
        .from("delivery_zones")
        .select("*")
        .eq("is_active", true)
        .contains("districts", [city]);

      if (cityMatch && cityMatch.length > 0)
        return cityMatch[0] as DeliveryZone;
    }

    // Fallback to REMOTE zone
    return this.getZoneByCode("REMOTE");
  }

  /**
   * Get all active zones.
   */
  async getAllActiveZones(): Promise<DeliveryZone[]> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw new Error(`Get active zones failed: ${error.message}`);
    return (data ?? []) as DeliveryZone[];
  }

  /**
   * Get all zones (including inactive).
   */
  async getAllZones(): Promise<DeliveryZone[]> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .order("name");

    if (error) throw new Error(`Get all zones failed: ${error.message}`);
    return (data ?? []) as DeliveryZone[];
  }

  /**
   * Create a new delivery zone.
   */
  async createZone(
    data: Omit<DeliveryZone, "id" | "created_at" | "updated_at">
  ): Promise<DeliveryZone> {
    const supabase = this.getClient();

    const { data: zone, error } = await supabase
      .from("delivery_zones")
      .insert(data as any)
      .select()
      .single();

    if (error) throw new Error(`Create zone failed: ${error.message}`);
    return zone as DeliveryZone;
  }

  /**
   * Update a delivery zone.
   */
  async updateZone(
    id: string,
    data: Partial<DeliveryZone>
  ): Promise<DeliveryZone> {
    const supabase = this.getClient();

    const { data: zone, error } = await supabase
      .from("delivery_zones")
      .update(data as any)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Update zone failed: ${error.message}`);
    return zone as DeliveryZone;
  }

  // ============================================================================
  // SHIPPING RATES
  // ============================================================================

  /**
   * Get shipping rates for a zone.
   */
  async getShippingRates(zoneId: string): Promise<ShippingRate[]> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from("shipping_rates")
      .select("*")
      .eq("zone_id", zoneId)
      .eq("is_active", true);

    if (error) throw new Error(`Get rates failed: ${error.message}`);
    return (data ?? []) as ShippingRate[];
  }

  /**
   * Upsert a shipping rate.
   */
  async upsertRate(
    data: Omit<ShippingRate, "id" | "created_at" | "updated_at">
  ): Promise<ShippingRate> {
    const supabase = this.getClient();

    const { data: rate, error } = await supabase
      .from("shipping_rates")
      .upsert(data as any, { onConflict: "zone_id,name,is_cod_rate" })
      .select()
      .single();

    if (error) throw new Error(`Upsert rate failed: ${error.message}`);
    return rate as ShippingRate;
  }

  /**
   * Calculate charge via Postgres stored procedure.
   */
  async calculateCharge(
    zoneId: string,
    weightKg: number,
    orderValue: number,
    isCOD: boolean
  ): Promise<number> {
    const supabase = this.getClient();

    const { data, error } = await supabase.rpc("calculate_shipping_charge", {
      p_zone_id: zoneId,
      p_weight_kg: weightKg,
      p_order_value: orderValue,
      p_is_cod: isCOD,
    });

    if (error) {
      console.error("calculateCharge RPC failed:", error);
      return 0;
    }

    return Number(data ?? 0);
  }
}
