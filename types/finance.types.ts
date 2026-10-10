export type ExpenseCategory =
  | "Rent & Lease"
  | "Utilities & Internet"
  | "Logistics & Shipping"
  | "Payroll & Wages"
  | "Marketing & Advertising"
  | "Inventory & Packaging"
  | "Office Supplies"
  | "Repairs & Maintenance"
  | "Software & Subscriptions"
  | "Legal & Professional"
  | "Taxes & Duties"
  | "Miscellaneous";

export type ExpenseStatus = "paid" | "pending" | "scheduled" | "cancelled";

export type ExpensePaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "CREDIT_CARD"
  | "MOBILE_BANKING"
  | "CHEQUE"
  | "OTHER";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory | string;
  description: string;
  amount: number;
  status: ExpenseStatus;
  vendor: string;
  branchId?: string | null;
  branchName?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  paymentMethod: ExpensePaymentMethod | string;
  notes?: string | null;
  receiptUrl?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummary {
  totalExpenditure: number;
  paidAmount: number;
  pendingAmount: number;
  totalCount: number;
  categoryBreakdown: Record<string, number>;
}

export interface ExpenseFilters {
  search?: string;
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  warehouseId?: string;
  branchId?: string;
  limit?: number;
  offset?: number;
}
