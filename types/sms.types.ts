export type SmsStatus = "PENDING" | "SENT" | "FAILED";

export type SmsType = "ORDER_CONFIRMATION" | "TEST" | "PROMOTIONAL" | "OTP";

export interface SmsLog {
  id: string;
  order_id?: string | null;
  phone: string;
  message: string;
  type: string;
  status: SmsStatus;
  provider: string;
  request_id?: string | null;
  response?: any;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmsSendResult {
  success: boolean;
  status: SmsStatus | "SKIPPED";
  phone: string;
  message: string;
  requestId?: string | null;
  error?: string | null;
  isTestMode?: boolean;
  skipped?: boolean;
  reason?: string;
  logId?: string;
}

export interface SendSmsOptions {
  to: string;
  message: string;
  orderId?: string;
  type?: SmsType | string;
}

export interface AlphaSmsApiResponse {
  error: number;
  msg?: string;
  data?: {
    request_id?: string | number;
  };
  request_id?: string | number;
  [key: string]: any;
}
