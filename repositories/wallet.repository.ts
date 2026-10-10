import { createClient } from "@/lib/supabase/server";
import { CustomerWallet, WalletTransaction } from "@/types/customer.types";

export class WalletRepository {
  static async getWallet(userId: string): Promise<CustomerWallet | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_wallets")
      .select("*")
      .eq("customer_id", userId)
      .single();

    if (error) {
      console.error("Error fetching wallet:", error);
      return null;
    }
    return data;
  }

  static async getTransactions(walletId: string): Promise<WalletTransaction[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching wallet transactions:", error);
      return [];
    }
    return data;
  }
}
