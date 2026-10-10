import { createAdminClient } from "@/lib/supabase/admin-client";
import { OrderRepository } from "@/lib/repositories/oms/order.repository";
import { InventoryService, ReservationItem, InventoryError } from "@/services/inventory.service";
import { CodRiskService } from "@/lib/services/fraud/cod-risk.service";
import { OrderStatus, Order, OrderItem } from "@/types/oms";

export interface PosOrderPayload {
  customerId?: string | null;
  branchId: string;
  items: {
    productId: string;
    variantId?: string | null;
    quantity: number;
    price: number; // Ignored for authority, but used for client passing
  }[];
  manualDiscount: number;
  paymentMethod: string;
  paymentStatus: string;
  shippingFee: number;
  notes?: string;
}

export class PosService {
  private inventoryService = new InventoryService();
  private orderRepo = new OrderRepository();

  /**
   * Generates a new order number
   */
  private generateOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `AF-POS-${date}-${random}`;
  }

  /**
   * Search for customers by phone, email, or name
   */
  async searchCustomers(query: string) {
    const supabase = createAdminClient();
    const q = query.trim();
    if (!q) return [];

    const { data, error } = await supabase
      .from("customer_profiles")
      .select("id, first_name, last_name, email, phone")
      .or(`phone.ilike.%${q}%,email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(10);

    if (error) {
      console.error("[PosService.searchCustomers] Error:", error);
      return [];
    }
    return data || [];
  }

  /**
   * Create a new customer profile
   */
  async createCustomer(data: { firstName: string; lastName: string; phone: string; email?: string }) {
    const supabase = createAdminClient();
    
    // Normalize phone (basic)
    const phone = data.phone.trim().replace(/\D/g, "");

    // Check if exists
    const { data: existing } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      throw new Error("A customer with this phone number already exists.");
    }

    const email = data.email?.trim() || `${phone}@placeholder.anchorfashion.com`;
    const tempPassword = `Pos${Math.random().toString(36).slice(-8)}!`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      phone: `+88${phone.startsWith("0") ? phone.substring(1) : phone}`,
      password: tempPassword,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
      }
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        throw new Error("User already registered in authentication system. Please search again.");
      }
      throw new Error(`Failed to create customer: ${authError.message}`);
    }

    const userId = authData.user.id;

    await supabase.from("customer_profiles").upsert({
      id: userId,
      first_name: data.firstName,
      last_name: data.lastName,
      phone,
      email: data.email?.trim() || null
    });

    return { id: userId, first_name: data.firstName, last_name: data.lastName, phone, email };
  }

  /**
   * Search for products and variants
   */
  async searchProducts(query: string) {
    const supabase = createAdminClient();
    const q = query.trim();
    if (!q) return [];

    const { data, error } = await supabase
      .from("variants")
      .select(`
        id, sku, price, sale_price, stock_quantity, attributes,
        product:product_id (id, title, slug, price, sale_price, main_image_url)
      `)
      .or(`sku.ilike.%${q}%`)
      .limit(10);

    if (!data || data.length === 0) {
      const { data: pData } = await supabase
        .from("products")
        .select(`
          id, title, slug, price, sale_price, main_image_url,
          variants (id, sku, price, sale_price, stock_quantity, attributes)
        `)
        .ilike("title", `%${q}%`)
        .limit(5);

      if (pData) {
        let results: any[] = [];
        for (const p of pData) {
          if (p.variants && p.variants.length > 0) {
            for (const v of p.variants) {
              results.push({
                ...v,
                product: { id: p.id, title: p.title, slug: p.slug, price: p.price, sale_price: p.sale_price, main_image_url: p.main_image_url }
              });
            }
          }
        }
        return results;
      }
    }

    return data || [];
  }

  /**
   * Process manual order creation
   */
  async placePosOrder(managerId: string, managerRole: string, payload: PosOrderPayload): Promise<any> {
    const supabase = createAdminClient();

    // 1. Validate branch access
    const { data: employee } = await supabase
      .from("employee_profiles")
      .select("branch_id")
      .eq("id", managerId)
      .maybeSingle();

    if (!employee || (employee.branch_id !== payload.branchId && managerRole !== 'admin')) {
      throw new Error("Unauthorized: You do not have permission to create orders for this branch.");
    }

    // 2. Fetch authoritative prices & stock
    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];
    const reservationItems: ReservationItem[] = [];

    // Find the default warehouse for this branch
    let warehouseId = "00000000-0000-0000-0000-000000000001";
    const { data: wh } = await supabase
      .from("warehouses")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (wh) warehouseId = wh.id;

    for (const item of payload.items) {
      if (item.variantId) {
        const { data: variant } = await supabase
          .from("variants")
          .select("price, sale_price, sku, product:product_id(title)")
          .eq("id", item.variantId)
          .single();
        
        if (!variant) throw new Error(`Variant ${item.variantId} not found`);

        const price = variant.sale_price || variant.price;
        const lineTotal = price * item.quantity;
        subtotal += lineTotal;

        orderItems.push({
          product_id: item.productId,
          variant_id: item.variantId,
          sku: variant.sku,
          product_name: (variant.product as any)?.title || "Unknown Product",
          variant_name: `SKU: ${variant.sku}`,
          unit_price: price,
          quantity: item.quantity,
          discount: 0,
          tax: price * 0.15, // standard tax
          line_total: lineTotal,
          inventory_reserved: false, // will be updated by trigger/RPC
          allocated_warehouse_id: warehouseId,
        });

        reservationItems.push({
          variant_id: item.variantId,
          warehouse_id: warehouseId,
          quantity: item.quantity
        });
      } else {
        const { data: product } = await supabase
          .from("products")
          .select("price, sale_price, title")
          .eq("id", item.productId)
          .single();
        
        if (!product) throw new Error(`Product ${item.productId} not found`);
        const price = product.sale_price || product.price;
        const lineTotal = price * item.quantity;
        subtotal += lineTotal;

        orderItems.push({
          product_id: item.productId,
          variant_id: null,
          sku: "N/A",
          product_name: product.title,
          variant_name: null,
          unit_price: price,
          quantity: item.quantity,
          discount: 0,
          tax: price * 0.15,
          line_total: lineTotal,
          inventory_reserved: false,
          allocated_warehouse_id: warehouseId,
        });

        reservationItems.push({
          variant_id: item.productId,
          warehouse_id: warehouseId,
          quantity: item.quantity
        });
      }
    }

    // 3. Discount validation
    const manualDiscount = Math.max(0, payload.manualDiscount || 0);
    if (manualDiscount > subtotal) {
      throw new Error("Discount cannot exceed subtotal.");
    }

    const shippingFee = Math.max(0, payload.shippingFee || 0);
    const taxTotal = subtotal * 0.15;
    const grandTotal = subtotal + taxTotal + shippingFee - manualDiscount;

    // 4. COD Fraud Shield Evaluation
    let verificationStatus = "EXEMPT";
    let riskLevel = "LOW";
    let riskScore = 0;
    let riskReasons: string[] = [];

    if (payload.paymentMethod === "COD") {
      const riskEvaluation = await CodRiskService.evaluateRisk({
        customerId: payload.customerId || null,
        email: "",
        phone: "",
        totalAmount: grandTotal,
        shippingAddress: null as any
      }).catch(() => ({ riskLevel: "LOW", riskScore: 0, reasons: [] }));
      
      riskLevel = riskEvaluation.riskLevel;
      riskScore = riskEvaluation.riskScore;
      riskReasons = riskEvaluation.reasons || [];
      verificationStatus = "POS_OVERRIDE"; // Manager created orders bypass OTP inherently
    }

    // 5. Create Order
    const orderNumber = this.generateOrderNumber();

    let initialStatus: OrderStatus = "draft";
    if (payload.paymentStatus === "PAID") {
      initialStatus = "confirmed";
    } else if (payload.paymentMethod === "COD") {
      initialStatus = "confirmed";
    } else {
      initialStatus = "pending_payment";
    }

    const orderData: Partial<Order> = {
      order_number: orderNumber,
      customer_id: payload.customerId || null,
      status: initialStatus,
      subtotal,
      tax_total: taxTotal,
      shipping_total: shippingFee,
      discount_total: manualDiscount,
      grand_total: grandTotal,
      currency: "BDT",
      // Custom Fields from Migration
      order_source: "MANAGER_POS" as any,
      branch_id: payload.branchId as any,
      notes: payload.notes,
    };

    const newOrder = await this.orderRepo.createOrder(orderData as any);

    // Create items
    const itemsToInsert = orderItems.map(item => ({
      ...item,
      order_id: newOrder.id,
    }));
    await supabase.from("order_items").insert(itemsToInsert);

    // 6. Atomic Inventory Reservation
    try {
      if (reservationItems.length > 0) {
        await this.inventoryService.reserveOrderInventory(newOrder.id, reservationItems);
      }
    } catch (err) {
      await this.orderRepo.updateOrderStatus(newOrder.id, "cancelled", managerId);
      if (err instanceof InventoryError) {
        throw err;
      }
      throw new Error(`Failed to reserve inventory: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    // 7. Audit Log / Payment Logging
    if (payload.paymentStatus === "PAID") {
      await supabase.from("payment_transactions").insert({
        order_id: newOrder.id,
        amount: grandTotal,
        gateway: payload.paymentMethod,
        status: "completed",
        transaction_id: `POS-${Date.now()}`
      });
    }

    if (manualDiscount > 0) {
      await supabase.from("order_status_history").insert({
        order_id: newOrder.id,
        status: initialStatus,
        notes: `Manager applied manual discount of ৳${manualDiscount}`,
        changed_by: managerId
      });
    }

    return newOrder;
  }
}
