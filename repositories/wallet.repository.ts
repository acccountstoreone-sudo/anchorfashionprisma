import prisma from "@/lib/prisma";
import { CustomerWallet, WalletTransaction } from "@/types/customer.types";

export class WalletRepository {
  static async getWallet(userId: string): Promise<CustomerWallet | null> {
    try {
      const data = await prisma.$queryRawUnsafe<CustomerWallet[]>(
        `SELECT * FROM "customer_wallets" WHERE "customer_id" = $1 LIMIT 1`,
        userId
      );
      return data[0] || null;
    } catch (error: any) {
      if (error.code === '42P01') {
        console.warn("customer_wallets table not found");
        return null;
      }
      console.error("Error fetching wallet:", error);
      return null;
    }
  }

  static async getTransactions(walletId: string): Promise<WalletTransaction[]> {
    try {
      const data = await prisma.$queryRawUnsafe<WalletTransaction[]>(
        `SELECT * FROM "wallet_transactions" WHERE "wallet_id" = $1 ORDER BY "created_at" DESC`,
        walletId
      );
      return data;
    } catch (error: any) {
      if (error.code === '42P01') {
        console.warn("wallet_transactions table not found");
        return [];
      }
      console.error("Error fetching wallet transactions:", error);
      return [];
    }
  }
}
