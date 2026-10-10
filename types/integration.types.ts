export type ProviderStatus = "active" | "inactive" | "sandbox" | "deprecated";

export interface BaseProviderConfig {
  id: string;
  name: string;
  type: string; // e.g., 'payment', 'courier', 'email', 'ai'
  status: ProviderStatus;
  priority: number;
  credentials: Record<string, any>;
  settings?: Record<string, any>;
}

export interface IntegrationResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  providerId: string;
  timestamp: string;
}

// Payment Types
export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  orderId: string;
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
}

export interface PaymentIntentResponse {
  transactionId: string;
  redirectUrl?: string;
  clientSecret?: string;
  status: "initiated" | "pending" | "completed" | "failed";
}

export interface PaymentVerifyRequest {
  transactionId: string;
  providerData?: any;
}

export interface PaymentProvider {
  id: string;
  name: string;
  initiatePayment(
    request: PaymentIntentRequest
  ): Promise<IntegrationResponse<PaymentIntentResponse>>;
  verifyPayment(
    request: PaymentVerifyRequest
  ): Promise<
    IntegrationResponse<{ status: string; amount: number; currency: string }>
  >;
  processWebhook(
    payload: any,
    signature: string
  ): Promise<IntegrationResponse<any>>;
}

// Courier Types
export interface CourierCreateConsignmentRequest {
  orderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity?: string;
  recipientZone?: string;
  codAmount: number;
  invoiceNumber: string;
  weight?: number;
  instructions?: string;
}

export interface CourierCreateConsignmentResponse {
  trackingCode: string;
  consignmentId: string;
  labelUrl?: string;
  status: "created" | "failed";
}

export interface CourierProvider {
  id: string;
  name: string;
  createConsignment(
    request: CourierCreateConsignmentRequest
  ): Promise<IntegrationResponse<CourierCreateConsignmentResponse>>;
  trackShipment(
    trackingCode: string
  ): Promise<
    IntegrationResponse<{
      status: string;
      statusDescription?: string;
      updates: any[];
    }>
  >;
  processWebhook(
    payload: any,
    signature: string
  ): Promise<IntegrationResponse<any>>;
}

// Email Types
export interface EmailSendRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailProvider {
  id: string;
  name: string;
  sendEmail(
    request: EmailSendRequest
  ): Promise<IntegrationResponse<{ messageId: string }>>;
}

// AI Types
export interface AIGenerateRequest {
  prompt: string;
  systemInstruction?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  generateText(
    request: AIGenerateRequest
  ): Promise<
    IntegrationResponse<{
      text: string;
      usage?: { promptTokens: number; completionTokens: number };
    }>
  >;
}
