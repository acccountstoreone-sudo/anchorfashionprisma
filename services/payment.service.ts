import { paymentRepository } from "@/repositories/payment.repository";
import { paymentFactory } from "@/providers/payment/payment.factory";
import {
  PaymentInitializeRequest,
  PaymentInitializeResponse,
  PaymentTransaction,
} from "@/types/payment";
import { v4 as uuidv4 } from "uuid";

export class PaymentService {
  /**
   * Initialize a payment flow.
   * Finds the provider, creates a session, creates a pending transaction,
   * and gets the gateway URL.
   */
  async initializePayment(
    request: PaymentInitializeRequest
  ): Promise<PaymentInitializeResponse> {
    try {
      // 1. Get Provider
      const provider = await paymentFactory
        .getActiveProvider(request.providerCode)
        .catch(async () => await paymentFactory.getFallbackProvider());

      const providerEntity = await paymentRepository.getProviderByCode(
        provider.getCode()
      );
      if (!providerEntity) throw new Error("Provider entity not found in DB");

      // 2. Setup Expiration (e.g., 30 mins)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      // 3. Create Session in DB
      const session = await paymentRepository.createSession({
        provider_id: providerEntity.id,
        order_id: request.orderId,
        user_id: request.userId,
        amount: request.amount,
        currency: request.currency || "BDT",
        status: "pending",
        expires_at: expiresAt.toISOString(),
        metadata: request.metadata || {},
      });

      // 4. Initialize at Gateway
      const gatewayResponse = await provider.initializePayment(request);

      // 5. Update Session with Gateway URL
      await paymentRepository.updateSession(session.id, {
        gateway_url: gatewayResponse.gatewayUrl,
      });

      // 6. Create Pending Transaction
      const referenceNumber = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await paymentRepository.createTransaction({
        session_id: session.id,
        provider_id: providerEntity.id,
        order_id: request.orderId,
        user_id: request.userId,
        amount: request.amount,
        currency: request.currency || "BDT",
        status: "pending",
        reference_number: referenceNumber,
      });

      // 7. Log Action
      await paymentRepository.createAuditLog({
        entity_type: "session",
        entity_id: session.id,
        action: "initialize",
        user_id: request.userId,
      });

      return {
        sessionId: session.id,
        providerCode: provider.getCode(),
        gatewayUrl: gatewayResponse.gatewayUrl,
      };
    } catch (error) {
      console.error("Payment initialization failed:", error);
      throw error;
    }
  }

  /**
   * Verify Payment (usually called on redirect back from Gateway)
   */
  async verifyPayment(
    sessionId: string,
    payload: Record<string, any>
  ): Promise<PaymentTransaction> {
    const session = await paymentRepository.getSessionById(sessionId);
    if (!session) throw new Error("Payment session not found");

    const transaction =
      await paymentRepository.getTransactionBySessionId(sessionId);
    if (!transaction) throw new Error("Payment transaction not found");

    const providerEntity = await paymentRepository.getProviderByCode(
      session.provider_id || ""
    );
    if (!providerEntity) throw new Error("Provider not found");

    const provider = paymentFactory.getProvider(providerEntity.code);

    // Call Provider to verify
    const verifiedData = await provider.verifyPayment(transaction.id, payload);

    // Update Transaction
    const updatedTransaction = await paymentRepository.updateTransaction(
      transaction.id,
      {
        ...verifiedData,
      }
    );

    // Update Session
    const sessionStatus =
      updatedTransaction.status === "completed" ? "completed" : "failed";
    await paymentRepository.updateSession(session.id, {
      status: sessionStatus,
    });

    // Log Action
    await paymentRepository.createAuditLog({
      entity_type: "transaction",
      entity_id: transaction.id,
      action: `verify_${sessionStatus}`,
      user_id: session.user_id,
      new_data: verifiedData,
    });

    return updatedTransaction;
  }
}

export const paymentService = new PaymentService();
