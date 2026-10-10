import { z } from "zod";

export const paymentInitializeSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  userId: z.string().uuid("Invalid user ID format"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3).default("BDT"),
  providerCode: z.string().min(1, "Provider code is required"),
  metadata: z.record(z.any()).optional(),
});

export const refundRequestSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID format"),
  amount: z.number().positive("Refund amount must be positive"),
  reason: z.string().min(5, "Reason must be at least 5 characters long"),
  requestedBy: z.string().uuid("Invalid requester ID format"),
});

// Admin provider configuration schema
export const providerConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  status: z.enum(["active", "inactive", "maintenance", "deprecated"]),
  is_fallback: z.boolean(),
  supported_currencies: z.array(z.string().length(3)),
  config: z.record(z.any()), // Provider specific config
});
