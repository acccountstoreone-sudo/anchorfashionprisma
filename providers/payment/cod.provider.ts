import { IPaymentProvider } from "./payment.interface";
import {
  PaymentInitializeRequest,
  PaymentInitializeResponse,
  RefundRequest,
  PaymentRefund,
  PaymentTransaction,
} from "@/types/payment";
import { v4 as uuidv4 } from "uuid";

export class CodProvider implements IPaymentProvider {
  getCode(): string {
    return "cod";
  }

  async initializePayment(
    request: PaymentInitializeRequest
  ): Promise<PaymentInitializeResponse> {
    const sessionId = uuidv4();
    const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // For COD, the gateway URL is just a success redirect directly
    return {
      sessionId,
      providerCode: "cod",
      gatewayUrl: `${domain}/checkout/success?session_id=${sessionId}&method=cod`,
    };
  }

  async verifyPayment(
    transactionId: string,
    payload: Record<string, any>
  ): Promise<Partial<PaymentTransaction>> {
    return {
      status: "pending", // COD transactions remain pending until physical delivery
      gateway_transaction_id: `cod_txn_${Date.now()}`,
      gateway_response: payload,
    };
  }

  async processWebhook(
    payload: Record<string, any>,
    headers: Record<string, any>
  ): Promise<any> {
    return { success: true, message: "COD does not support webhooks" };
  }

  async refundPayment(request: RefundRequest): Promise<Partial<PaymentRefund>> {
    // COD refunds would be handled manually
    return {
      status: "rejected",
      gateway_response: {
        error: "COD cannot be automatically refunded through gateway",
      },
    };
  }
}
