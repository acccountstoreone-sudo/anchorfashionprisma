import { createAdminClient } from "@/lib/supabase/admin-client";
import { 
  CourierProviderRecord, 
  DeliveryZone, 
  Shipment, 
  ShipmentStatus 
} from "@/types/shipping.types";

export class ShippingRepository {
  private getAdminClient() {
    return createAdminClient();
  }

  // --- Courier Providers ---

  async getCouriers(): Promise<CourierProviderRecord[]> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("courier_providers")
      .select("*")
      .order("priority", { ascending: true });
      
    // If the table doesn't exist yet, return mock data for MVP
    if (error) {
      if (error.code === "42P01") {
        console.warn("courier_providers table not found, using mock data");
        return [
          { id: "1", code: "pathao", name: "Pathao", display_name: "Pathao Delivery", logo_url: null, is_active: true, is_cod_supported: true, is_sandbox: true, priority: 1, max_weight_kg: 10, credentials: {}, settings: {}, webhook_secret: null, supported_zones: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: "2", code: "steadfast", name: "Steadfast", display_name: "Steadfast Courier", logo_url: null, is_active: true, is_cod_supported: true, is_sandbox: true, priority: 2, max_weight_kg: 20, credentials: {}, settings: {}, webhook_secret: null, supported_zones: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ] as CourierProviderRecord[];
      }
      throw new Error(`Failed to get couriers: ${error.message}`);
    }
    return data as CourierProviderRecord[];
  }

  async updateCourierStatus(id: string, is_active: boolean): Promise<void> {
    const supabase = this.getAdminClient();
    const { error } = await supabase
      .from("courier_providers")
      .update({ is_active })
      .eq("id", id);
      
    if (error && error.code !== "42P01") throw new Error(`Failed to update courier: ${error.message}`);
  }

  // --- Delivery Zones ---

  async getZones(): Promise<DeliveryZone[]> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .order("name");

    if (error) {
      if (error.code === "42P01") {
        return [
          { id: "1", name: "Inside Dhaka", code: "IND", description: null, districts: ["Dhaka"], is_cod_available: true, is_active: true, estimated_days_min: 1, estimated_days_max: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: "2", name: "Outside Dhaka", code: "OUTD", description: null, districts: [], is_cod_available: true, is_active: true, estimated_days_min: 3, estimated_days_max: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ] as DeliveryZone[];
      }
      throw new Error(`Failed to get zones: ${error.message}`);
    }
    return data as DeliveryZone[];
  }

  // --- Shipments ---

  async createShipment(shipmentData: Partial<Shipment>): Promise<Shipment> {
    const supabase = this.getAdminClient();
    // Try to insert, if table missing, mock it
    const { data, error } = await supabase
      .from("shipments")
      .insert([shipmentData])
      .select()
      .single();

    if (error) {
      if (error.code === "42P01") {
        console.warn("shipments table missing, returning mock");
        return {
          id: `ship_${Date.now()}`,
          shipment_number: `SHP-${Date.now()}`,
          ...shipmentData,
          status: "created",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Shipment;
      }
      throw new Error(`Failed to create shipment: ${error.message}`);
    }
    return data as Shipment;
  }

  async updateShipmentStatus(id: string, status: ShipmentStatus, trackingNumber?: string): Promise<void> {
    const supabase = this.getAdminClient();
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (trackingNumber) updates.tracking_number = trackingNumber;

    const { error } = await supabase
      .from("shipments")
      .update(updates)
      .eq("id", id);

    if (error && error.code !== "42P01") {
      throw new Error(`Failed to update shipment status: ${error.message}`);
    }
  }
}
