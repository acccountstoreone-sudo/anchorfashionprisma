// ============================================================================
// Returns Service — Customer Self-Service & Reverse Logistics
// Anchor Fashion — Prompt 11/20
// ============================================================================

import { ReturnRepository } from "@/repositories/return.repository";
import { ShipmentRepository } from "@/repositories/shipment.repository";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { EmailProvider } from "@/lib/notifications/EmailProvider";
import { WalletService } from "@/services/wallet.service";
import { BKashService } from "@/lib/services/payment/bkash.service";
import { SSLCommerzService } from "@/lib/services/payment/sslcommerz.service";
import {
  ReturnRequest,
  ReturnWithItems,
  CreateReturnInput,
  ReturnFilters,
  PaginatedResult,
  ReturnEligibilityResult,
  ReturnEligibilityItem,
  SubmitCustomerReturnInput,
} from "@/types/shipping.types";

export interface ReturnPolicySettings {
  return_window_days: number;
  require_photo_for_damaged: boolean;
  allow_exchanges: boolean;
  restock_shipping_fee_refundable: boolean;
  allowed_reasons: string[];
}

const DEFAULT_POLICY_SETTINGS: ReturnPolicySettings = {
  return_window_days: 7,
  require_photo_for_damaged: true,
  allow_exchanges: true,
  restock_shipping_fee_refundable: false,
  allowed_reasons: [
    "Wrong size",
    "Wrong item received",
    "Damaged item",
    "Defective item",
    "Product not as described",
    "Quality issue",
    "Changed my mind",
    "Other",
  ],
};

export class ReturnsService {
  private returnRepo: ReturnRepository;
  private shipmentRepo: ShipmentRepository;

  constructor() {
    this.returnRepo = new ReturnRepository();
    this.shipmentRepo = new ShipmentRepository();
  }

  private generateReturnNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(Math.random() * 99999)
      .toString()
      .padStart(5, "0");
    return `RET-${date}-${rand}`;
  }

  /**
   * Resolve configurable return policy from settings table with safe fallbacks
   */
  async getPolicySettings(): Promise<ReturnPolicySettings> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "return_policy_settings")
        .maybeSingle();

      if (error || !data?.value) {
        return DEFAULT_POLICY_SETTINGS;
      }

      return {
        ...DEFAULT_POLICY_SETTINGS,
        ...(data.value as Partial<ReturnPolicySettings>),
      };
    } catch {
      return DEFAULT_POLICY_SETTINGS;
    }
  }

  /**
   * Server-authoritative eligibility check for an order
   */
  async checkReturnEligibility(
    orderId: string,
    customerId: string
  ): Promise<ReturnEligibilityResult> {
    const supabase = createAdminClient();
    const policy = await this.getPolicySettings();

    // 1. Authoritative order query
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items(*)
      `
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      throw new Error("Order not found");
    }

    const isCustomerOwned = order.customer_id === customerId;
    if (!isCustomerOwned) {
      return {
        orderId,
        orderNumber: order.order_number || "",
        orderStatus: order.status || "",
        deliveredAt: null,
        returnWindowDays: policy.return_window_days,
        isWindowOpen: false,
        windowExpiresAt: null,
        isDelivered: false,
        isCustomerOwned: false,
        isOrderEligible: false,
        ineligibilityReason: "You are not authorized to request returns for this order.",
        items: [],
        maxRefundableAmount: 0,
        paymentMethod: order.payment_method || "COD",
        hasActiveReturn: false,
      };
    }

    // 2. Delivery verification (case-insensitive)
    const normalizedStatus = (order.status || "").toLowerCase();
    const isDelivered = normalizedStatus === "delivered" || normalizedStatus === "completed";

    // 3. Return window verification
    const deliveredTime = order.delivered_at
      ? new Date(order.delivered_at).getTime()
      : new Date(order.updated_at).getTime();

    const windowDurationMs = policy.return_window_days * 24 * 60 * 60 * 1000;
    const windowExpiresAt = new Date(deliveredTime + windowDurationMs).toISOString();
    const isWindowOpen = Date.now() <= deliveredTime + windowDurationMs;

    // 4. Query active returns to find already returned/pending items
    const activeReturnItems = await this.returnRepo.getActiveReturnItemsForOrder(orderId);
    const returnedQtyByItemId = new Map<string, number>();
    for (const retItem of activeReturnItems) {
      if (retItem.order_item_id) {
        const current = returnedQtyByItemId.get(retItem.order_item_id) || 0;
        returnedQtyByItemId.set(retItem.order_item_id, current + (retItem.quantity || 0));
      }
    }

    // Check if entire order has an active return
    const orderReturns = await this.returnRepo.getReturnsByOrderId(orderId);
    const activeReturn = orderReturns.find((r) =>
      ["requested", "approved", "pickup_scheduled", "picked_up", "in_transit", "received"].includes(
        r.status
      )
    );

    // 5. Proportional discount calculation
    const orderSubtotal = Number(order.subtotal || 0);
    const orderDiscountTotal = Number(order.discount_total || 0);

    const items: ReturnEligibilityItem[] = (order.order_items || []).map((item: any) => {
      const lineTotal = Number(
        item.line_total ?? item.total_price ?? Number(item.quantity) * Number(item.unit_price)
      );
      const purchasedQuantity = Number(item.quantity);
      const returnedQuantity = returnedQtyByItemId.get(item.id) || 0;
      const eligibleQuantity = Math.max(0, purchasedQuantity - returnedQuantity);

      // Proportional discount allocation
      const itemDiscountRatio = orderSubtotal > 0 ? lineTotal / orderSubtotal : 0;
      const allocatedDiscount = Number((itemDiscountRatio * orderDiscountTotal).toFixed(2));
      const netLineTotal = Math.max(0, lineTotal - allocatedDiscount);
      const netRefundablePerUnit =
        purchasedQuantity > 0 ? Number((netLineTotal / purchasedQuantity).toFixed(2)) : 0;

      const isEligible = isDelivered && isWindowOpen && eligibleQuantity > 0;

      return {
        orderItemId: item.id,
        productId: item.product_id,
        variantId: item.variant_id || null,
        sku: item.sku || "",
        productName: item.product_name || "Fashion Product",
        variantName: item.variant_name || null,
        purchasedQuantity,
        returnedQuantity,
        eligibleQuantity,
        unitPrice: Number(item.unit_price),
        lineTotal,
        allocatedDiscount,
        netRefundablePerUnit,
        isEligible,
      };
    });

    const hasEligibleItems = items.some((it) => it.isEligible);
    const isOrderEligible = isDelivered && isWindowOpen && hasEligibleItems;

    let ineligibilityReason: string | undefined;
    if (!isDelivered) {
      ineligibilityReason = `Order is currently in '${order.status}' status. Returns can only be requested after delivery.`;
    } else if (!isWindowOpen) {
      ineligibilityReason = `The ${policy.return_window_days}-day return window for this order expired on ${new Date(
        windowExpiresAt
      ).toLocaleDateString()}.`;
    } else if (!hasEligibleItems) {
      ineligibilityReason = "All items in this order have already been returned or requested for return.";
    }

    // Authoritative max refundable amount (grand total minus already refunded)
    const grandTotal = Number(order.grand_total || order.total_amount || 0);
    const priorRefundsTotal = orderReturns.reduce((sum, r) => {
      if (r.status !== "rejected" && r.status !== "cancelled") {
        return sum + Number(r.refund_amount || 0);
      }
      return sum;
    }, 0);
    const maxRefundableAmount = Math.max(0, Number((grandTotal - priorRefundsTotal).toFixed(2)));

    return {
      orderId,
      orderNumber: order.order_number,
      orderStatus: order.status,
      deliveredAt: order.delivered_at || order.updated_at,
      returnWindowDays: policy.return_window_days,
      isWindowOpen,
      windowExpiresAt,
      isDelivered,
      isCustomerOwned: true,
      isOrderEligible,
      ineligibilityReason,
      items,
      maxRefundableAmount,
      paymentMethod: order.payment_method || "COD",
      hasActiveReturn: Boolean(activeReturn),
      activeReturnId: activeReturn?.id,
    };
  }

  /**
   * Submit customer return request with strict server-side validation
   */
  async submitCustomerReturn(
    input: SubmitCustomerReturnInput,
    customerId: string
  ): Promise<ReturnWithItems> {
    const policy = await this.getPolicySettings();

    // 1. Authoritative eligibility check
    const eligibility = await this.checkReturnEligibility(input.orderId, customerId);
    if (!eligibility.isCustomerOwned) {
      throw new Error("Unauthorized: You do not own this order.");
    }
    if (!eligibility.isDelivered) {
      throw new Error("Order must be delivered before requesting a return.");
    }
    if (!eligibility.isWindowOpen) {
      throw new Error(
        `The ${policy.return_window_days}-day return window has closed for this order.`
      );
    }
    if (!input.items || input.items.length === 0) {
      throw new Error("At least one item must be selected for return.");
    }

    // 2. Validate reason against policy
    const isAllowedReason = policy.allowed_reasons.some(
      (r) => r.toLowerCase() === input.reason.trim().toLowerCase()
    );
    if (!isAllowedReason) {
      throw new Error(`Invalid return reason. Allowed reasons: ${policy.allowed_reasons.join(", ")}`);
    }

    // 3. Photo proof validation for damaged/defective reasons
    const isDamageReason = ["damaged item", "defective item", "wrong item received"].includes(
      input.reason.toLowerCase()
    );
    if (policy.require_photo_for_damaged && isDamageReason) {
      if (!input.photoUrls || input.photoUrls.length === 0) {
        throw new Error(
          `Photo proof is required when requesting a return for '${input.reason}'. Please upload at least one image.`
        );
      }
    }

    // 4. Validate item quantities and calculate proportional refund
    let totalCalculatedRefund = 0;
    const returnItemsPayload: Array<{
      orderItemId: string;
      sku: string;
      productName: string;
      quantity: number;
      reason: string;
      condition: "good" | "damaged" | "defective" | "unknown";
      refundAmount: number;
    }> = [];

    for (const reqItem of input.items) {
      const eligibleItem = eligibility.items.find((it) => it.orderItemId === reqItem.orderItemId);
      if (!eligibleItem) {
        throw new Error(`Order item ${reqItem.orderItemId} was not found in this order.`);
      }

      const reqQty = Number(reqItem.quantity);
      if (reqQty <= 0 || !Number.isInteger(reqQty)) {
        throw new Error(`Invalid return quantity (${reqQty}) for item ${eligibleItem.productName}.`);
      }

      if (reqQty > eligibleItem.eligibleQuantity) {
        throw new Error(
          `Requested return quantity (${reqQty}) exceeds remaining eligible quantity (${eligibleItem.eligibleQuantity}) for ${eligibleItem.productName}.`
        );
      }

      // Proportional refund for this item
      const itemRefund = Number((eligibleItem.netRefundablePerUnit * reqQty).toFixed(2));
      totalCalculatedRefund += itemRefund;

      returnItemsPayload.push({
        orderItemId: eligibleItem.orderItemId,
        sku: eligibleItem.sku,
        productName: eligibleItem.productName,
        quantity: reqQty,
        reason: reqItem.reason || input.reason,
        condition: isDamageReason ? "damaged" : "unknown",
        refundAmount: itemRefund,
      });
    }

    // Cap total refund to remaining refundable order total
    const finalRefundAmount = Math.min(
      Number(totalCalculatedRefund.toFixed(2)),
      eligibility.maxRefundableAmount
    );

    // 5. Generate return number and insert record
    const returnNumber = this.generateReturnNumber();
    const returnData = {
      return_number: returnNumber,
      order_id: input.orderId,
      customer_id: customerId,
      status: "requested" as const,
      reason: input.reason,
      notes: input.customerNote || null,
      customer_note: input.customerNote || null,
      refund_status: "PENDING" as const,
      refund_amount: finalRefundAmount,
      refund_method: input.refundMethod || "ORIGINAL_PAYMENT",
      exchange_requested: Boolean(input.exchangeRequested),
      exchange_variant_id: input.exchangeVariantId || null,
      photo_urls: input.photoUrls || [],
    };

    const createdReturn = await this.returnRepo.createReturn(
      returnData as any,
      returnItemsPayload.map((it) => ({
        order_item_id: it.orderItemId,
        sku: it.sku,
        product_name: it.productName,
        quantity: it.quantity,
        reason: it.reason,
        condition: it.condition,
        restocked: false,
        refund_amount: it.refundAmount,
      })) as any
    );

    // 6. Write to order status history and events
    const supabase = createAdminClient();
    try {
      await supabase.from("order_status_history").insert({
        order_id: input.orderId,
        status: "RETURN_REQUESTED",
        notes: `Customer initiated return request ${returnNumber} (${input.reason}). Refund Amount: ৳${finalRefundAmount}.`,
      });
    } catch (histErr) {
      console.warn("Failed to insert order status history:", histErr);
    }

    // 7. Dispatch customer confirmation email via EmailProvider
    try {
      const { data: customerProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", customerId)
        .maybeSingle();

      const targetEmail = customerProfile?.email;
      if (targetEmail) {
        const itemRowsHtml = returnItemsPayload
          .map(
            (it) =>
              `<tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${it.productName}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">৳${it.refundAmount}</td>
              </tr>`
          )
          .join("");

        await EmailProvider.send({
          to: targetEmail,
          subject: `Return Request Received: #${returnNumber} — Anchor Fashion`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
              <h2 style="color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 10px;">Return Request Submitted</h2>
              <p>Hello ${customerProfile?.full_name || "Valued Customer"},</p>
              <p>We have received your return request <strong>#${returnNumber}</strong> for Order <strong>#${eligibility.orderNumber}</strong>.</p>
              
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Return Number:</strong> ${returnNumber}</p>
                <p style="margin: 0 0 8px 0;"><strong>Reason:</strong> ${input.reason}</p>
                <p style="margin: 0 0 8px 0;"><strong>Resolution:</strong> ${input.exchangeRequested ? "Exchange" : "Return & Refund"}</p>
                <p style="margin: 0 0 8px 0;"><strong>Estimated Refund:</strong> ৳${finalRefundAmount}</p>
              </div>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background-color: #f1f5f9; text-align: left;">
                    <th style="padding: 8px;">Item</th>
                    <th style="padding: 8px; text-align: center;">Qty</th>
                    <th style="padding: 8px; text-align: right;">Refund</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRowsHtml}
                </tbody>
              </table>

              <h4 style="margin-bottom: 8px;">Next Steps:</h4>
              <ol style="padding-left: 20px; line-height: 1.6;">
                <li>Our quality assurance team will review your request within 24-48 hours.</li>
                <li>Once approved, our courier partner will contact you to collect the items.</li>
                <li>Please keep the items in their original packaging with tags intact.</li>
              </ol>

              <p style="margin-top: 30px; font-size: 13px; color: #64748b;">Anchor Fashion · Customer Care · Support@anchorfashion.com</p>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.warn("Could not dispatch confirmation email:", mailErr);
    }

    return createdReturn;
  }

  /**
   * Get returns list for a specific customer
   */
  async getCustomerReturns(customerId: string): Promise<ReturnWithItems[]> {
    return this.returnRepo.getReturnsByCustomerId(customerId);
  }

  /**
   * Get customer return detail with ownership enforcement
   */
  async getCustomerReturnDetail(
    returnId: string,
    customerId: string
  ): Promise<ReturnWithItems | null> {
    const ret = await this.returnRepo.getReturnWithItems(returnId);
    if (!ret) return null;
    if (ret.customer_id !== customerId) {
      throw new Error("Unauthorized access to return record.");
    }
    return ret;
  }

  /**
   * Safe warehouse inventory restock:
   * Only items inspected with condition 'good' are added back to sellable stock.
   * Damaged/defective items are quarantined and NOT added to inventory_levels.
   */
  async processReturnRestock(
    returnId: string,
    itemConditions: Record<string, "good" | "damaged" | "defective"> = {},
    adminUserId?: string
  ): Promise<ReturnRequest> {
    const supabase = createAdminClient();
    const returnRecord = await this.returnRepo.getReturnById(returnId);
    if (!returnRecord) throw new Error(`Return ${returnId} not found`);

    const items = await this.returnRepo.getReturnItems(returnId);

    for (const item of items) {
      const condition = itemConditions[item.id] || item.condition;

      // Update condition on return item
      if (itemConditions[item.id] && itemConditions[item.id] !== item.condition) {
        await supabase
          .from("return_items")
          .update({ condition } as any)
          .eq("id", item.id);
      }

      // Restock only if condition is GOOD
      if (condition === "good") {
        // ATOMIC LOCK: Try to set restocked = true where restocked = false
        const { data: updatedItem, error: updateErr } = await supabase
          .from("return_items")
          .update({ restocked: true } as any)
          .eq("id", item.id)
          .eq("restocked", false)
          .select("id")
          .maybeSingle();
          
        if (updateErr) console.error("Atomic restock lock error:", updateErr);

        if (updatedItem && item.order_item_id) {
          const { data: orderItem } = await supabase
            .from("order_items")
            .select("variant_id, allocated_warehouse_id")
            .eq("id", item.order_item_id)
            .maybeSingle();

          if (orderItem?.variant_id) {
            // Find warehouse
            let warehouseId = orderItem.allocated_warehouse_id;
            if (!warehouseId) {
              const { data: defaultWh } = await supabase
                .from("warehouses")
                .select("id")
                .eq("is_active", true)
                .order("priority", { ascending: false })
                .limit(1)
                .maybeSingle();
              warehouseId = defaultWh?.id;
            }

            if (warehouseId) {
              // Increment inventory_levels
              const { data: currentInv } = await supabase
                .from("inventory_levels")
                .select("id, quantity_available")
                .eq("variant_id", orderItem.variant_id)
                .eq("warehouse_id", warehouseId)
                .maybeSingle();

              if (currentInv) {
                await supabase
                  .from("inventory_levels")
                  .update({
                    quantity_available: currentInv.quantity_available + item.quantity,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", currentInv.id);

                // Log stock movement
                try {
                  await supabase.from("stock_movements").insert({
                    variant_id: orderItem.variant_id,
                    warehouse_id: warehouseId,
                    quantity_change: item.quantity,
                    reason: `Restocked ${item.quantity} units from return ${returnRecord.return_number}`,
                    reason_code: "RETURN",
                    reference_id: returnRecord.id,
                  });
                } catch (e: any) {
                  console.warn("Could not insert stock_movements log:", e?.message);
                }
              }
            }
          }
        }
      }
    }

    return this.returnRepo.atomicUpdateStatus(returnId, ["received", "inventory_synced"], {
      status: "inventory_synced",
      inventory_synced_at: new Date().toISOString(),
      inspected_at: new Date().toISOString(),
    }, adminUserId);
  }

  /**
   * Process refund for an approved return.
   * Integrates safely with bKash, SSLCommerz, Wallet store credit, and COD.
   */
  async processReturnRefund(
    returnId: string,
    adminUserId?: string
  ): Promise<{ success: boolean; method: string; refundRef?: string; error?: string }> {
    const supabase = createAdminClient();
    const returnRecord = await this.returnRepo.getReturnWithItems(returnId);
    if (!returnRecord) throw new Error(`Return ${returnId} not found`);

    if (returnRecord.refund_status === "PROCESSED") {
      return { success: true, method: returnRecord.refund_method || "ORIGINAL_PAYMENT" };
    }

    // ATOMIC LOCK: Prevent concurrent refund processing
    try {
      await this.returnRepo.atomicUpdateRefundStatus(returnId, ["PENDING", null], {
        refund_status: "PROCESSING"
      }, adminUserId);
    } catch (lockError) {
      return { success: false, method: "UNKNOWN", error: "Refund is already being processed or was completed." };
    }

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", returnRecord.order_id)
      .maybeSingle();

    if (!order) {
      throw new Error(`Order ${returnRecord.order_id} not found.`);
    }

    const { data: paymentTransactions } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("order_id", returnRecord.order_id);

    (order as any).payment_transactions = paymentTransactions || [];

    const refundAmount = Number(returnRecord.refund_amount || 0);
    const refundMethod = returnRecord.refund_method || "ORIGINAL_PAYMENT";

    // 1. Customer Wallet Store Credit
    if (refundMethod === "WALLET") {
      if (!returnRecord.customer_id) {
        throw new Error("Customer ID required for wallet credit refund.");
      }

      await WalletService.topUp({
        userId: returnRecord.customer_id,
        amount: refundAmount,
        paymentMethod: "RETURN_STORE_CREDIT",
        paymentRef: returnRecord.return_number,
        description: `Store credit refund for return ${returnRecord.return_number}`,
      });

      await this.returnRepo.updateReturn(returnId, {
        refund_status: "PROCESSED",
        completed_at: new Date().toISOString(),
        status: "completed",
      });

      try {
        const { ReferralService } = await import("@/services/referral.service");
        await ReferralService.reverseReferralReward(returnRecord.order_id);
      } catch (err) {
        console.error("Failed to reverse referral reward:", err);
      }

      return { success: true, method: "WALLET", refundRef: returnRecord.return_number };
    }

    // 2. COD Orders (Cash on Delivery)
    if (order.payment_method === "COD") {
      // Cash was paid to delivery agent; gateway refund is impossible.
      // Customer chose non-wallet: record as PENDING manual transfer or mark completed if admin confirms.
      await this.returnRepo.updateReturn(returnId, {
        refund_status: "PENDING",
        internal_note: `COD Order: Manual bank/cash refund required of ৳${refundAmount}.`,
      });

      return {
        success: true,
        method: "COD_MANUAL_PENDING",
        refundRef: `COD-PENDING-${returnRecord.return_number}`,
      };
    }

    // 3. bKash Gateway Refund
    if (order.payment_method === "BKASH") {
      const bKashTx = order.payment_transactions?.find(
        (tx: any) => tx.gateway === "bkash" && tx.gateway_transaction_id
      );

      if (bKashTx?.gateway_transaction_id) {
        try {
          const res = await BKashService.refundPayment({
            paymentID: bKashTx.gateway_payment_id || bKashTx.gateway_transaction_id,
            trxID: bKashTx.gateway_transaction_id,
            amount: refundAmount,
            reason: `Return ${returnRecord.return_number}`,
          });

          if (res.refundTrxID) {
            await this.returnRepo.updateReturn(returnId, {
              refund_status: "PROCESSED",
              completed_at: new Date().toISOString(),
              status: "completed",
              internal_note: `bKash refund completed. TrxID: ${res.refundTrxID}`,
            });

            try {
              const { ReferralService } = await import("@/services/referral.service");
              await ReferralService.reverseReferralReward(returnRecord.order_id);
            } catch (err) {
              console.error("Failed to reverse referral reward:", err);
            }

            return { success: true, method: "BKASH", refundRef: res.refundTrxID };
          }
        } catch (bkErr: any) {
          console.warn("bKash refund API call failed/unconfigured, marking PENDING:", bkErr.message);
        }
      }

      // If provider refund threw or was in sandbox without credentials
      await this.returnRepo.updateReturn(returnId, {
        refund_status: "PENDING",
        internal_note: `bKash refund pending admin manual dispatch of ৳${refundAmount}.`,
      });
      return { success: true, method: "BKASH_PENDING" };
    }

    // 4. SSLCommerz Gateway Refund
    if (order.payment_method === "SSLCOMMERZ") {
      const sslTx = order.payment_transactions?.find(
        (tx: any) => tx.gateway === "sslcommerz" && tx.gateway_transaction_id
      );

      if (sslTx?.gateway_transaction_id) {
        try {
          const res = await SSLCommerzService.initiateRefund({
            bankTranId: sslTx.gateway_transaction_id,
            refundAmount,
            refundRemarks: `Return ${returnRecord.return_number}`,
            refeId: returnRecord.return_number,
          });

          if (res.status === "success" || res.refund_ref_id) {
            await this.returnRepo.updateReturn(returnId, {
              refund_status: "PROCESSED",
              completed_at: new Date().toISOString(),
              status: "completed",
              internal_note: `SSLCommerz refund initiated. Ref: ${res.refund_ref_id || res.trans_id}`,
            });

            try {
              const { ReferralService } = await import("@/services/referral.service");
              await ReferralService.reverseReferralReward(returnRecord.order_id);
            } catch (err) {
              console.error("Failed to reverse referral reward:", err);
            }

            return { success: true, method: "SSLCOMMERZ", refundRef: res.refund_ref_id };
          }
        } catch (sslErr: any) {
          console.warn("SSLCommerz refund call failed/unconfigured, marking PENDING:", sslErr.message);
        }
      }

      await this.returnRepo.updateReturn(returnId, {
        refund_status: "PENDING",
        internal_note: `SSLCommerz refund pending manual settlement of ৳${refundAmount}.`,
      });
      return { success: true, method: "SSLCOMMERZ_PENDING" };
    }

    // Default fallback
    await this.returnRepo.updateReturn(returnId, {
      refund_status: "PENDING",
      internal_note: `Refund of ৳${refundAmount} pending admin processing.`,
    });
    return { success: true, method: "MANUAL_PENDING" };
  }

  // ============================================================================
  // Existing Workflow Actions
  // ============================================================================

  /**
   * Create a new return request (standard/admin API).
   */
  async createReturnRequest(
    input: CreateReturnInput,
    customerId?: string,
    createdBy?: string
  ): Promise<ReturnWithItems> {
    const returnNumber = this.generateReturnNumber();

    const returnRecord = await this.returnRepo.createReturn(
      {
        return_number: returnNumber,
        order_id: input.orderId,
        customer_id: customerId ?? null,
        shipment_id: input.shipmentId ?? null,
        status: "requested",
        reason: input.reason,
        notes: input.customerNote || null,
        customer_note: input.customerNote || null,
        refund_method: input.refundMethod || "ORIGINAL_PAYMENT",
        exchange_requested: Boolean(input.exchangeRequested),
        exchange_variant_id: input.exchangeVariantId || null,
        photo_urls: input.photoUrls || [],
      } as any,
      input.items.map((item) => ({
        order_item_id: item.orderItemId ?? null,
        sku: item.sku,
        product_name: item.productName,
        quantity: item.quantity,
        reason: item.reason ?? null,
        condition: item.condition ?? "unknown",
        restocked: false,
        refund_amount: item.refundAmount || 0,
      })) as any
    );

    return returnRecord;
  }

  /**
   * Approve a return request.
   */
  async approveReturn(
    returnId: string,
    updatedBy?: string
  ): Promise<ReturnRequest> {
    return this.returnRepo.atomicUpdateStatus(returnId, ["requested"], {
      status: "approved",
      approved_at: new Date().toISOString(),
    }, updatedBy);
  }

  /**
   * Reject a return request.
   */
  async rejectReturn(
    returnId: string,
    reason?: string,
    updatedBy?: string
  ): Promise<ReturnRequest> {
    return this.returnRepo.atomicUpdateStatus(returnId, ["requested"], {
      status: "rejected",
      rejection_reason: reason ?? null,
      rejected_at: new Date().toISOString(),
      notes: reason ?? null,
    }, updatedBy);
  }

  /**
   * Schedule return pickup by assigning a courier.
   */
  async scheduleReturnPickup(
    returnId: string,
    courierCode?: string
  ): Promise<ReturnRequest> {
    return this.returnRepo.atomicUpdateStatus(returnId, ["approved"], {
      status: "pickup_scheduled",
    });
  }

  /**
   * Mark return as picked up.
   */
  async markReturnPickedUp(returnId: string): Promise<ReturnRequest> {
    return this.returnRepo.atomicUpdateStatus(returnId, ["approved", "pickup_scheduled"], {
      status: "picked_up",
      picked_up_at: new Date().toISOString(),
    });
  }

  /**
   * Mark return as received at warehouse.
   */
  async markReturnReceived(returnId: string, updatedBy?: string): Promise<ReturnRequest> {
    return this.returnRepo.atomicUpdateStatus(returnId, ["approved", "pickup_scheduled", "picked_up", "in_transit"], {
      status: "received",
      received_at: new Date().toISOString(),
    }, updatedBy);
  }

  /**
   * Sync returned inventory — marks items as restocked in return_items.
   */
  async syncReturnInventory(returnId: string): Promise<ReturnRequest> {
    return this.processReturnRestock(returnId);
  }

  /**
   * Complete the return process.
   */
  async completeReturn(returnId: string, updatedBy?: string): Promise<ReturnRequest> {
    return this.returnRepo.atomicUpdateStatus(returnId, ["inventory_synced", "received", "approved"], {
      status: "completed",
      completed_at: new Date().toISOString(),
    }, updatedBy);
  }

  /**
   * Authoritatively resolve return and mark refund processed.
   * Supports customer wallet credit or confirmed manual settlement (cash/bank/transfer).
   */
  async resolveReturnWithRefund(
    returnId: string,
    options?: {
      refundMethod?: "WALLET" | "MANUAL_BANK" | "MANUAL_CASH" | "GATEWAY_CONFIRMED";
      note?: string;
    },
    updatedBy?: string
  ): Promise<{ returnId: string; refundStatus: string; status: string }> {
    const returnRecord = await this.returnRepo.getReturnWithItems(returnId);
    if (!returnRecord) throw new Error(`Return ${returnId} not found`);

    const refundAmount = Number(returnRecord.refund_amount || 0);
    const chosenMethod = options?.refundMethod || returnRecord.refund_method || "GATEWAY_CONFIRMED";

    // 1. If wallet refund selected, credit wallet
    if (chosenMethod === "WALLET" && returnRecord.customer_id && refundAmount > 0) {
      try {
        await WalletService.topUp({
          userId: returnRecord.customer_id,
          amount: refundAmount,
          paymentMethod: "RETURN_STORE_CREDIT",
          paymentRef: returnRecord.return_number,
          description: `Store credit refund for return ${returnRecord.return_number}`,
        });
      } catch (err: any) {
        console.warn("[resolveReturnWithRefund] Wallet topup warning:", err.message);
      }
    }

    // 2. Mark return as completed and refund processed
    const updated = await this.returnRepo.updateReturn(returnRecord.id, {
      status: "completed",
      refund_status: "PROCESSED",
      completed_at: new Date().toISOString(),
      internal_note: options?.note || `Refund settled (${chosenMethod}) by admin. Amount: ৳${refundAmount}.`,
    });

    // 3. Try to reverse referral reward if applicable
    if (returnRecord.order_id) {
      try {
        const { ReferralService } = await import("@/services/referral.service");
        await ReferralService.reverseReferralReward(returnRecord.order_id);
      } catch (err) {
        console.warn("[resolveReturnWithRefund] Referral reward reversal skipped:", err);
      }
    }

    return {
      returnId: returnRecord.id,
      refundStatus: "PROCESSED",
      status: "completed",
    };
  }

  /**
   * Cancel a return request.
   */
  async cancelReturn(
    returnId: string,
    reason?: string
  ): Promise<ReturnRequest> {
    return this.returnRepo.atomicUpdateStatus(returnId, ["requested"], {
      status: "cancelled",
      notes: reason ?? null,
    });
  }

  /**
   * Get a return with all items.
   */
  async getReturnWithItems(returnId: string): Promise<ReturnWithItems | null> {
    return this.returnRepo.getReturnWithItems(returnId);
  }

  /**
   * List returns with filters and pagination.
   */
  async listReturns(
    filters: ReturnFilters
  ): Promise<PaginatedResult<ReturnRequest>> {
    return this.returnRepo.listReturns(filters);
  }
}
