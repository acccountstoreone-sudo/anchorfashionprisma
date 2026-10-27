import { paymentRepository } from "@/repositories/payment.repository";
import { paymentFactory } from "@/providers/payment/payment.factory";
import { RefundRequest, PaymentRefund } from "@/types/payment";

export class PaymentRefundService {
  async requestRefund(request: RefundRequest): Promise<PaymentRefund> {
    const transaction = await paymentRepository.getTransactionById(
      request.transactionId
    );
    if (!transaction) throw new Error("Transaction not found");

    if (
      transaction.status !== "completed" &&
      transaction.status !== "partially_refunded"
    ) {
      throw new Error(
        `Cannot refund transaction with status: ${transaction.status}`
      );
    }

    const existingRefunds = await paymentRepository.getRefundsByTransactionId(
      transaction.id
    );
    const priorRefundedAmount = existingRefunds
      .filter((r) => r.status === "completed" || r.status === "pending" || r.status === "processing")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const remainingRefundable = Math.max(
      0,
      Math.round((transaction.amount - priorRefundedAmount) * 100) / 100
    );

    if (request.amount > remainingRefundable) {
      throw new Error(
        `Refund amount (৳${request.amount}) exceeds remaining refundable balance (৳${remainingRefundable})`
      );
    }

    const providerEntity = await paymentRepository.getProviderByCode(
      transaction.provider_id || ""
    );
    if (!providerEntity) throw new Error("Provider not found for transaction");

    // Create pending refund record
    const refund = await paymentRepository.createRefund({
      transaction_id: transaction.id,
      amount: request.amount,
      reason: request.reason,
      status: "pending",
      requested_by: request.requestedBy,
    });

    try {
      const provider = paymentFactory.getProvider(providerEntity.code);
      const refundResult = await provider.refundPayment(request);

      const updatedRefund = await paymentRepository.updateRefund(refund.id, {
        ...refundResult,
        processed_at: new Date().toISOString(),
      });

      // Update Transaction status based on total cumulative refund amount
      const totalRefundedNow = Math.round((priorRefundedAmount + request.amount) * 100) / 100;
      const newTxnStatus =
        totalRefundedNow >= transaction.amount
          ? "refunded"
          : "partially_refunded";
      await paymentRepository.updateTransaction(transaction.id, {
        status: newTxnStatus,
      });

      await paymentRepository.createAuditLog({
        entity_type: "refund",
        entity_id: refund.id,
        action: "refund_processed",
        user_id: request.requestedBy,
        new_data: updatedRefund,
      });

      return updatedRefund;
    } catch (error: any) {
      await paymentRepository.updateRefund(refund.id, {
        status: "failed",
        gateway_response: { error: error.message },
      });
      throw error;
    }
  }
}

export const paymentRefundService = new PaymentRefundService();
