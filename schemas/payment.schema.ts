import { z } from "zod";

export const PaymentProviderCodeSchema = z.enum([
  "sslcommerz",
  "bkash",
  "nagad",
  "rocket",
  "visa",
  "mastercard",
  "cod",
]);

export const InitPaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  providerCode: PaymentProviderCodeSchema,
  amount: z.number().positive("Amount must be greater than zero"),
  currency: z.string().length(3).default("BDT"),
  returnUrl: z.string().url("Invalid return URL").optional(),
  cancelUrl: z.string().url("Invalid cancel URL").optional(),
  metadata: z.record(z.any()).optional(),
});

export const RefundPaymentSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
  amount: z.number().positive("Amount must be greater than zero"),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

export const ProviderConfigSchema = z.object({
  name: z.string().min(2, "Provider name is required"),
  code: PaymentProviderCodeSchema,
  status: z.enum(["active", "inactive", "maintenance", "deprecated"]),
  is_fallback: z.boolean().default(false),
  supported_currencies: z.array(z.string().length(3)).min(1),
  config: z.record(z.any()), // Provider specific configs
});

export type InitPaymentInput = z.infer<typeof InitPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof RefundPaymentSchema>;
export type ProviderConfigInput = z.infer<typeof ProviderConfigSchema>;
