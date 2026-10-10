import { createClient } from "@/lib/supabase/server";
import { LoyaltyAccount, LoyaltyTransaction } from "@/types/customer.types";

export class LoyaltyRepository {
  static async getAccount(userId: string): Promise<LoyaltyAccount | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("loyalty_accounts")
      .select("*")
      .eq("customer_id", userId)
      .single();

    if (error) {
      console.error("Error fetching loyalty account:", error);
      return null;
    }
    return data;
  }

  static async getTransactions(
    accountId: string
  ): Promise<LoyaltyTransaction[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("loyalty_transactions")
      .select("*")
      .eq("loyalty_account_id", accountId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching loyalty transactions:", error);
      return [];
    }
    return data;
  }
}
