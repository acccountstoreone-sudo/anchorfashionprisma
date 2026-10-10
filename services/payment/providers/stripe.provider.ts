import {
  PaymentProvider,
  PaymentIntentRequest,
  PaymentIntentResponse,
  IntegrationResponse,
  PaymentVerifyRequest,
} from "@/types/integration.types";

export class StripeProvider implements PaymentProvider {
  id = "stripe";
  name = "Stripe";

  private secretKey: string;
  private isSandbox: boolean;

  constructor(config: Record<string, any>, isSandbox: boolean) {
    this.secretKey = config.secretKey || "";
    this.isSandbox = isSandbox;
  }

  private getBaseUrl(): string {
    return "https://api.stripe.com/v1";
  }

  async initiatePayment(
    request: PaymentIntentRequest
  ): Promise<IntegrationResponse<PaymentIntentResponse>> {
    try {
      const payload = new URLSearchParams();
      payload.append("amount", Math.round(request.amount * 100).toString()); // Stripe expects cents
      payload.append("currency", request.currency.toLowerCase());
      if (request.customerEmail) {
        payload.append("receipt_email", request.customerEmail);
      }
      payload.append("metadata[orderId]", request.orderId);

      const response = await fetch(`${this.getBaseUrl()}/payment_intents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${this.secretKey}`,
        },
        body: payload.toString(),
      });

      const data = await response.json();

      if (data.id) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            transactionId: data.id,
            clientSecret: data.client_secret,
            status: "initiated",
          },
        };
      }

      return {
        success: false,
        providerId: this.id,
        timestamp: new Date().toISOString(),
        error: {
          code: data.error?.code || "API_ERROR",
          message: data.error?.message || "Failed to initiate Stripe payment",
        },
      };
    } catch (error: any) {
      return {
        success: false,
        providerId: this.id,
        timestamp: new Date().toISOString(),
        error: {
          code: "EXCEPTION",
          message: error.message,
        },
      };
    }
  }

  async verifyPayment(
    request: PaymentVerifyRequest
  ): Promise<
    IntegrationResponse<{ status: string; amount: number; currency: string }>
  > {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/payment_intents/${request.transactionId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      const data = await response.json();

      if (data.status === "succeeded") {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            status: "completed",
            amount: data.amount / 100, // convert back from cents
            currency: data.currency.toUpperCase(),
          },
        };
      }

      return {
        success: false,
        providerId: this.id,
        timestamp: new Date().toISOString(),
        error: {
          code: data.status,
          message: "Payment not successful",
        },
      };
    } catch (error: any) {
      return {
        success: false,
        providerId: this.id,
        timestamp: new Date().toISOString(),
        error: {
          code: "EXCEPTION",
          message: error.message,
        },
      };
    }
  }

  async processWebhook(
    payload: any,
    signature: string
  ): Promise<IntegrationResponse<any>> {
    // Requires stripe signature verification using the endpoint secret
    return {
      success: true,
      providerId: this.id,
      timestamp: new Date().toISOString(),
      data: payload,
    };
  }
}
