import { createClient, createAdminClient } from "@/lib/supabase/server";
import { CustomerWallet, WalletTransaction } from "@/types/customer.types";

export class WalletService {
  private static async getClient() {
    try {
      return await createAdminClient();
    } catch {
      return await createClient();
    }
  }

  /**
   * Fetch customer wallet, creating one if it doesn't exist yet
   */
  static async getWallet(userId: string): Promise<CustomerWallet> {
    const supabase = await this.getClient();
    let { data: wallet, error } = await supabase
      .from("customer_wallets")
      .select("*")
      .eq("customer_id", userId)
      .maybeSingle();

    if (!wallet) {
      const { data: created, error: createError } = await supabase
        .from("customer_wallets")
        .insert({
          customer_id: userId,
          balance: 0,
          currency: "BDT",
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to initialize wallet: ${createError.message}`);
      }
      wallet = created;
    }

    return wallet;
  }

  static async getTransactions(walletId: string): Promise<WalletTransaction[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching wallet transactions:", error);
      return [];
    }
    return data || [];
  }

  /**
   * Top up wallet with server-side validation and duplicate credit protection
   */
  static async topUp(params: {
    userId: string;
    amount: number;
    paymentMethod: string;
    paymentRef: string;
    description?: string;
  }): Promise<{ wallet: CustomerWallet; transaction: WalletTransaction }> {
    if (params.amount <= 0) {
      throw new Error("Top up amount must be greater than zero");
    }

    const supabase = await this.getClient();

    // 1. Prevent duplicate credit by checking paymentRef
    const isUuid = Boolean(
      params.paymentRef &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.paymentRef)
    );
    const refId = isUuid ? params.paymentRef : null;

    if (params.paymentRef) {
      let query = supabase.from("wallet_transactions").select("id");
      if (isUuid) {
        query = query.or(`reference_id.eq.${params.paymentRef},description.ilike.%${params.paymentRef}%`);
      } else {
        query = query.ilike("description", `%${params.paymentRef}%`);
      }
      const { data: existingTx } = await query.maybeSingle();

      if (existingTx) {
        throw new Error("Duplicate payment reference: This payment has already been credited.");
      }
    }

    // 2. Get current wallet
    const wallet = await this.getWallet(params.userId);
    const newBalance = Number((Number(wallet.balance) + Number(params.amount)).toFixed(2));

    // 3. Atomically update wallet balance
    const { data: updatedWallet, error: updateError } = await supabase
      .from("customer_wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (updateError || !updatedWallet) {
      throw new Error(`Failed to update wallet balance: ${updateError?.message}`);
    }

    // 4. Record credit transaction
    const desc =
      params.description ||
      `Wallet top-up via ${params.paymentMethod} (Ref: ${params.paymentRef})`;

    const { data: transaction, error: txError } = await supabase
      .from("wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        type: "CREDIT",
        amount: params.amount,
        balance_after: newBalance,
        reference_type: "TOP_UP",
        reference_id: refId,
        description: desc,
      })
      .select()
      .single();

    if (txError || !transaction) {
      throw new Error(`Failed to record transaction log: ${txError?.message}`);
    }

    return { wallet: updatedWallet, transaction };
  }

  /**
   * Withdraw funds from wallet
   */
  static async withdraw(params: {
    userId: string;
    amount: number;
    destinationMethod: string;
    destinationAccount: string;
    description?: string;
  }): Promise<{ wallet: CustomerWallet; transaction: WalletTransaction }> {
    if (params.amount <= 0) {
      throw new Error("Withdrawal amount must be greater than zero");
    }

    const supabase = await this.getClient();
    const wallet = await this.getWallet(params.userId);

    if (Number(wallet.balance) < params.amount) {
      throw new Error("Insufficient wallet balance for this withdrawal");
    }

    const newBalance = Number((Number(wallet.balance) - Number(params.amount)).toFixed(2));

    // Update balance
    const { data: updatedWallet, error: updateError } = await supabase
      .from("customer_wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (updateError || !updatedWallet) {
      throw new Error(`Failed to update wallet balance: ${updateError?.message}`);
    }

    // Log debit
    const desc =
      params.description ||
      `Withdrawal to ${params.destinationMethod} (${params.destinationAccount})`;

    const { data: transaction, error: txError } = await supabase
      .from("wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        type: "DEBIT",
        amount: params.amount,
        balance_after: newBalance,
        reference_type: "WITHDRAWAL",
        reference_id: null,
        description: desc,
      })
      .select()
      .single();

    if (txError || !transaction) {
      throw new Error(`Failed to record withdrawal transaction: ${txError?.message}`);
    }

    return { wallet: updatedWallet, transaction };
  }

  /**
   * Transfer funds to another customer
   */
  static async transfer(params: {
    fromUserId: string;
    toIdentifier: string; // email, phone, or customerId
    amount: number;
    note?: string;
  }): Promise<{ senderWallet: CustomerWallet; recipientWallet: CustomerWallet }> {
    if (params.amount <= 0) {
      throw new Error("Transfer amount must be greater than zero");
    }

    const supabase = await this.getClient();

    // 1. Find recipient profile
    let recipientProfileId: string | null = null;
    let recipientName: string = "Anchor Fashion Member";

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.toIdentifier);

    // Try customer_profiles first
    let cpQuery = supabase.from("customer_profiles").select("id, first_name, last_name, phone, email");
    if (isUuid) {
      cpQuery = cpQuery.eq("id", params.toIdentifier);
    } else if (params.toIdentifier.includes("@")) {
      cpQuery = cpQuery.eq("email", params.toIdentifier);
    } else {
      cpQuery = cpQuery.eq("phone", params.toIdentifier);
    }
    const { data: cProfile } = await cpQuery.maybeSingle();

    if (cProfile) {
      recipientProfileId = cProfile.id;
      recipientName = [cProfile.first_name, cProfile.last_name].filter(Boolean).join(" ") || "Member";
    } else {
      // Fallback to profiles
      let pQuery = supabase.from("profiles").select("id, first_name, last_name, phone");
      if (isUuid) {
        pQuery = pQuery.eq("id", params.toIdentifier);
      } else {
        pQuery = pQuery.eq("phone", params.toIdentifier);
      }
      const { data: profile } = await pQuery.maybeSingle();
      if (profile) {
        recipientProfileId = profile.id;
        recipientName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Member";
      }
    }

    if (!recipientProfileId) {
      throw new Error("Recipient customer not found. Verify phone number, email, or user ID.");
    }

    if (recipientProfileId === params.fromUserId) {
      throw new Error("Cannot transfer funds to your own wallet.");
    }

    // 2. Validate sender balance
    const senderWallet = await this.getWallet(params.fromUserId);
    if (Number(senderWallet.balance) < params.amount) {
      throw new Error("Insufficient wallet balance for transfer");
    }

    const recipientWallet = await this.getWallet(recipientProfileId);

    // 3. Atomically debit sender
    const senderNewBalance = Number((Number(senderWallet.balance) - Number(params.amount)).toFixed(2));
    const { data: updatedSender, error: sErr } = await supabase
      .from("customer_wallets")
      .update({ balance: senderNewBalance, updated_at: new Date().toISOString() })
      .eq("id", senderWallet.id)
      .select()
      .single();

    if (sErr) throw new Error(`Sender debit failed: ${sErr.message}`);

    // 4. Atomically credit recipient
    const recipientNewBalance = Number((Number(recipientWallet.balance) + Number(params.amount)).toFixed(2));
    const { data: updatedRecipient, error: rErr } = await supabase
      .from("customer_wallets")
      .update({ balance: recipientNewBalance, updated_at: new Date().toISOString() })
      .eq("id", recipientWallet.id)
      .select()
      .single();

    if (rErr) throw new Error(`Recipient credit failed: ${rErr.message}`);

    const transferRef = `TX-${Date.now()}`;

    // 5. Log debit on sender
    await supabase.from("wallet_transactions").insert({
      wallet_id: senderWallet.id,
      type: "DEBIT",
      amount: params.amount,
      balance_after: senderNewBalance,
      reference_type: "TRANSFER",
      reference_id: null,
      description: `Transferred to ${recipientName} [${transferRef}]${params.note ? ` (${params.note})` : ""}`,
    });

    // 6. Log credit on recipient
    await supabase.from("wallet_transactions").insert({
      wallet_id: recipientWallet.id,
      type: "CREDIT",
      amount: params.amount,
      balance_after: recipientNewBalance,
      reference_type: "TRANSFER",
      reference_id: null,
      description: `Received from Member [${transferRef}]${params.note ? ` (${params.note})` : ""}`,
    });

    return { senderWallet: updatedSender, recipientWallet: updatedRecipient };
  }
}
