import { createAdminClient } from "@/lib/supabase/admin-client";

export interface FlashSaleRecord {
  id: string;
  name: string;
  product_id: string;
  flash_price: number;
  stock_allocated: number;
  stock_sold: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export class FlashSaleService {
  private static getAdminClient() {
    return createAdminClient();
  }

  /**
   * Fetches all currently active flash sales globally.
   * "Active" means is_active=true AND now() between start_time and end_time.
   */
  static async getActiveFlashSales(): Promise<FlashSaleRecord[]> {
    try {
      const supabase = this.getAdminClient();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("flash_sales")
        .select("*")
        .eq("is_active", true)
        .lte("start_time", now)
        .gt("end_time", now);

      if (error) {
        console.error("Error fetching active flash sales:", error);
        return [];
      }
      return (data || []) as FlashSaleRecord[];
    } catch (err) {
      console.error("getActiveFlashSales caught error:", err);
      return [];
    }
  }

  /**
   * Fetches an active flash sale for a specific product.
   * Note: The database table 'flash_sales' tracks site-wide campaign events (title, discount_percentage)
   * and does not have a 'product_id' column. We return null safely to prevent SQL column 42703 errors.
   */
  static async getFlashSaleForProduct(productId: string): Promise<FlashSaleRecord | null> {
    try {
      // Per-product flash sales are handled via Product.salePrice or Campaign discounts.
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Atomically consumes flash sale stock by delegating to PostgreSQL RPC.
   * Must be called during order placement.
   */
  static async consumeFlashSaleStock(
    flashSaleId: string,
    quantity: number
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getAdminClient();
    
    const { error } = await supabase.rpc("consume_flash_sale_stock", {
      p_flash_sale_id: flashSaleId,
      p_quantity: quantity,
    });

    if (error) {
      console.error("Failed to consume flash sale stock:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Atomically releases flash sale stock by delegating to PostgreSQL RPC.
   * Used for rollbacks if order placement fails after consumption.
   */
  static async releaseFlashSaleStock(
    flashSaleId: string,
    quantity: number
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getAdminClient();
    
    const { error } = await supabase.rpc("release_flash_sale_stock", {
      p_flash_sale_id: flashSaleId,
      p_quantity: quantity,
    });

    if (error) {
      console.error("Failed to release flash sale stock:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Retrieves all flash sales (for admin).
   */
  static async getAllFlashSales(): Promise<FlashSaleRecord[]> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("flash_sales")
      .select("*")
      .order("start_time", { ascending: false });

    if (error) {
      console.error("Error fetching all flash sales:", error);
      return [];
    }
    return data as FlashSaleRecord[];
  }
}
