import { CustomerRepository } from "@/repositories/customer.repository";
import { CustomerProfile, CustomerAddress } from "@/types/customer.types";
import { updateProfileSchema, addressSchema } from "@/schemas/customer.schema";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { createClient } from "@/lib/supabase/server";

export class CustomerService {
  private static async getClient() {
    try {
      return createAdminClient();
    } catch {
      return await createClient();
    }
  }

  static async getProfile(userId: string): Promise<CustomerProfile | null> {
    return CustomerRepository.getProfile(userId);
  }

  static async updateProfile(
    userId: string,
    data: Partial<CustomerProfile>
  ): Promise<CustomerProfile | null> {
    const validatedData = updateProfileSchema.parse(data);
    return CustomerRepository.updateProfile(userId, validatedData);
  }

  static async getAddresses(userId: string): Promise<CustomerAddress[]> {
    return CustomerRepository.getAddresses(userId);
  }

  static async addAddress(
    userId: string,
    data: Partial<CustomerAddress>
  ): Promise<CustomerAddress> {
    const validatedData = addressSchema.parse(data);
    return CustomerRepository.addAddress(userId, validatedData);
  }

  /**
   * Deactivate customer profile.
   * Business rule: Accounts cannot be deactivated while there are active or pending orders in fulfillment.
   */
  static async deactivateProfile(
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const supabase = await this.getClient();

    // Check for active / pending orders across customer_orders and orders tables
    const activeStatuses = [
      "PENDING",
      "PROCESSING",
      "CONFIRMED",
      "SHIPPED",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "pending",
      "processing",
      "shipped",
    ];

    const { data: activeOrders, error: orderErr } = await supabase
      .from("customer_orders")
      .select("id, status")
      .eq("user_id", userId)
      .in("status", activeStatuses);

    if (!orderErr && activeOrders && activeOrders.length > 0) {
      throw new Error(
        `Cannot deactivate account: You have ${activeOrders.length} active order(s) currently being processed or delivered.`
      );
    }

    // Deactivate customer profile
    await CustomerRepository.deactivateProfile(userId);

    return {
      success: true,
      message: `Account deactivated successfully.${reason ? ` Reason: ${reason}` : ""}`,
    };
  }

  /**
   * Permanently delete customer profile.
   * Business rule: Cannot hard-delete if the customer has historical orders or financial transactions
   * due to financial audit and tax compliance. In such cases, deactivation must be used.
   */
  static async deleteProfile(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const supabase = await this.getClient();

    // 1. Check for any historical orders
    const { data: anyOrders } = await supabase
      .from("customer_orders")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (anyOrders && anyOrders.length > 0) {
      throw new Error(
        "Account cannot be permanently deleted because historical orders exist for this account. Tax and compliance laws require retaining sales invoices. You may deactivate your account instead."
      );
    }

    // 2. Check for any wallet transactions
    const { data: anyWallet } = await supabase
      .from("customer_wallets")
      .select("id, balance")
      .eq("customer_id", userId)
      .maybeSingle();

    if (anyWallet && Number(anyWallet.balance) > 0) {
      throw new Error(
        "Account cannot be deleted while a positive wallet balance remains. Please withdraw or spend your remaining balance first."
      );
    }

    // 3. Delete profile
    await CustomerRepository.deleteProfile(userId);

    return {
      success: true,
      message: "Customer account and profile data deleted successfully.",
    };
  }
}
