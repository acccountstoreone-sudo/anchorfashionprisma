import prisma from "@/lib/prisma";
import { CustomerWallet, WalletTransaction } from "@/types/customer.types";

export class WalletRepository {
  static async getWallet(userId: string): Promise<CustomerWallet | null> {
    try {
      const data = await prisma.customer_wallets.findFirst({
        where: { customer_id: userId },
      });
      if (!data) return null;
      return {
        ...data,
        id: String(data.id),
        balance: Number(data.balance),
        created_at: data.created_at?.toISOString() ?? new Date().toISOString(),
        updated_at: data.updated_at?.toISOString() ?? new Date().toISOString(),
      } as CustomerWallet;
    } catch (error: any) {
      console.error("Error fetching wallet:", error);
      return null;
    }
  }

  static async getTransactions(walletId: string): Promise<WalletTransaction[]> {
    try {
      const data = await prisma.loyalty_transactions.findMany({
        where: { loyalty_account_id: walletId },
        orderBy: { created_at: "desc" },
      });
      return data.map((t) => ({
        id: String(t.id),
        wallet_id: t.loyalty_account_id,
        type: t.type as "CREDIT" | "DEBIT",
        amount: Number(t.points),
        balance_after: 0,
        reference_type: t.reference_type ?? "",
        reference_id: t.reference_id ?? null,
        description: t.description ?? null,
        created_at: t.created_at?.toISOString() ?? new Date().toISOString(),
      })) as WalletTransaction[];
    } catch (error: any) {
      console.error("Error fetching wallet transactions:", error);
      return [];
    }
  }
}
