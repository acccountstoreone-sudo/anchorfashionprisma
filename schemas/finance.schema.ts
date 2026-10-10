import { z } from "zod";

export const ExpenseCategoryEnum = z.enum([
  "Rent & Lease",
  "Utilities & Internet",
  "Logistics & Shipping",
  "Payroll & Wages",
  "Marketing & Advertising",
  "Inventory & Packaging",
  "Office Supplies",
  "Repairs & Maintenance",
  "Software & Subscriptions",
  "Legal & Professional",
  "Taxes & Duties",
  "Miscellaneous",
]);

export const ExpenseStatusEnum = z.enum(["paid", "pending", "scheduled", "cancelled"]);

export const ExpensePaymentMethodEnum = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "MOBILE_BANKING",
  "CHEQUE",
  "OTHER",
]);

export const ExpenseFormSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be a valid number" })
    .positive("Amount must be greater than 0")
    .max(100000000, "Amount exceeds realistic limits"),
  category: z.string().min(1, "Please select an expense category"),
  date: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  description: z
    .string()
    .min(3, "Description must be at least 3 characters")
    .max(1000, "Description cannot exceed 1000 characters"),
  vendor: z.string().max(255, "Vendor name cannot exceed 255 characters").optional().default(""),
  status: ExpenseStatusEnum.default("paid"),
  paymentMethod: ExpensePaymentMethodEnum.default("CASH"),
  warehouseId: z.string().uuid("Invalid warehouse selection").optional().nullable().or(z.literal("")),
  branchId: z.string().uuid("Invalid branch selection").optional().nullable().or(z.literal("")),
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional().nullable().default(""),
  receiptUrl: z.string().url("Receipt must be a valid URL").optional().nullable().or(z.literal("")),
});

export type ExpenseFormValues = z.infer<typeof ExpenseFormSchema>;

export const ExpenseFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  warehouseId: z.string().optional(),
  branchId: z.string().optional(),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});

export type ExpenseFilterValues = z.infer<typeof ExpenseFilterSchema>;
