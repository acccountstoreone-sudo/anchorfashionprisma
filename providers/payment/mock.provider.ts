import { IPaymentProvider } from "./payment.interface";
import {
  PaymentInitializeRequest,
  PaymentInitializeResponse,
  RefundRequest,
  PaymentRefund,
  PaymentTransaction,
} from "@/types/payment";
import { v4 as uuidv4 } from "uuid";

export class MockProvider implements IPaymentProvider {
  private code: string;

  constructor(code: string) {
    this.code = code;
  }

  getCode(): string {
    return this.code;
  }

  async initializePayment(
    request: PaymentInitializeRequest
  ): Promise<PaymentInitializeResponse> {
    const sessionId = uuidv4();
    const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return {
      sessionId,
      providerCode: this.code,
      gatewayUrl: `${domain}/api/mock-gateway?session_id=${sessionId}&provider=${this.code}&amount=${request.amount}`,
    };
  }

  async verifyPayment(
    transactionId: string,
    payload: Record<string, any>
  ): Promise<Partial<PaymentTransaction>> {
    // Mock verification: if status is success in payload, return completed
    const isSuccess = payload.status === "success";

    return {
      status: isSuccess ? "completed" : "failed",
      gateway_transaction_id: `mock_txn_${Date.now()}`,
      gateway_response: payload,
      error_message: isSuccess ? null : "Mock verification failed",
    };
  }

  async processWebhook(
    payload: Record<string, any>,
    headers: Record<string, any>
  ): Promise<any> {
    // Mock processing
    return {
      success: true,
      event: payload.event_type || "unknown",
    };
  }

  async refundPayment(request: RefundRequest): Promise<Partial<PaymentRefund>> {
    // Mock refund processing
    return {
      status: "completed",
      gateway_refund_id: `mock_ref_${Date.now()}`,
      gateway_response: { success: true, original_txn: request.transactionId },
    };
  }
}
