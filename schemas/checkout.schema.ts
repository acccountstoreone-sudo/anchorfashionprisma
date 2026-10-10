import { z } from "zod";

// ==========================================
// 1. SHARED SCHEMAS
// ==========================================

export const addressSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  phone: z.string().min(11, "Phone number must be at least 11 digits").max(20),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  address_line_1: z.string().min(1, "Address is required").max(255),
  address_line_2: z.string().max(255).optional(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().max(100).optional(),
  postal_code: z.string().min(1, "Postal code is required").max(20),
  country: z.string().default("Bangladesh"),
});

// ==========================================
// 2. CHECKOUT STEP SCHEMAS
// ==========================================

export const checkoutInformationSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  shipping_address: addressSchema,
  save_information: z.boolean().default(false),
  create_account: z.boolean().default(false).optional(),
  password: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.create_account && (!data.password || data.password.length < 6)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Password must be at least 6 characters to create an account",
      path: ["password"],
    });
  }
});

export const checkoutShippingSchema = z.object({
  shipping_method: z.string().min(1, "Please select a shipping method"),
});

export const manualPaymentSchema = z.object({
  sender_number: z.string().optional(),
  transaction_id: z.string().optional(),
  bank_name: z.string().optional(),
  branch_name: z.string().optional(),
  account_holder_name: z.string().optional(),
  notes: z.string().optional(),
});

export const checkoutPaymentSchema = z
  .object({
    payment_method: z.string().min(1, "Please select a payment method"),
    billing_address_same_as_shipping: z.boolean().default(true),
    billing_address: addressSchema.optional(),
    manual_payment: manualPaymentSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.billing_address_same_as_shipping && !data.billing_address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Billing address is required if different from shipping",
        path: ["billing_address"],
      });
    }

    const method = data.payment_method?.toUpperCase() || "";
    const isMfs = ["BKASH", "NAGAD", "ROCKET"].includes(method);
    const isBank = method === "BANK_TRANSFER" || method === "BANK";

    if (isMfs) {
      if (!data.manual_payment?.sender_number || data.manual_payment.sender_number.trim().length < 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid sender phone number (min 11 digits)",
          path: ["manual_payment", "sender_number"],
        });
      }
      if (!data.manual_payment?.transaction_id || data.manual_payment.transaction_id.trim().length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Transaction ID (TrxID) is required",
          path: ["manual_payment", "transaction_id"],
        });
      }
    }

    if (isBank) {
      if (!data.manual_payment?.transaction_id || data.manual_payment.transaction_id.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deposit/Transfer Reference or Transaction ID is required",
          path: ["manual_payment", "transaction_id"],
        });
      }
    }
  });

// ==========================================
// 3. COMPLETE CHECKOUT SCHEMA
// ==========================================

export const checkoutFormSchema = z.object({
  information: checkoutInformationSchema,
  shipping: checkoutShippingSchema,
  payment: checkoutPaymentSchema,
  notes: z.string().max(500).optional(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
export type CheckoutInformationFormValues = z.infer<
  typeof checkoutInformationSchema
>;
export type CheckoutShippingFormValues = z.infer<typeof checkoutShippingSchema>;
export type ManualPaymentFormValues = z.infer<typeof manualPaymentSchema>;
export type CheckoutPaymentFormValues = z.infer<typeof checkoutPaymentSchema>;
export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
