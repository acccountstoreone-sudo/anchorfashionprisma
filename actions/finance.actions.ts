"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ExpenseRepository } from "@/repositories/expense.repository";
import { ExpenseFormSchema, ExpenseFormValues } from "@/schemas/finance.schema";
import { Expense, ExpenseFilters, ExpenseSummary } from "@/types/finance.types";

const expenseRepository = new ExpenseRepository();

export async function getExpensesAction(
  filters?: ExpenseFilters
): Promise<{ success: boolean; data?: Expense[]; error?: string }> {
  try {
    const expenses = await expenseRepository.getExpenses(filters);
    return { success: true, data: expenses };
  } catch (err: any) {
    console.error("[getExpensesAction] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to load expenses from database",
    };
  }
}

export async function getExpenseSummaryAction(): Promise<{
  success: boolean;
  data?: ExpenseSummary;
  error?: string;
}> {
  try {
    const summary = await expenseRepository.getExpenseSummary();
    return { success: true, data: summary };
  } catch (err: any) {
    console.error("[getExpenseSummaryAction] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to calculate expense summary",
    };
  }
}

export async function createExpenseAction(
  formData: ExpenseFormValues
): Promise<{ success: boolean; data?: Expense; error?: string }> {
  try {
    const supabase = await createClient();
    const userRes = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const user = userRes?.data?.user;

    // Validate payload with Zod
    const validated = ExpenseFormSchema.parse(formData);

    const newExpense = await expenseRepository.createExpense(validated, user?.id);

    revalidatePath("/admin/finance/expenses");
    return { success: true, data: newExpense };
  } catch (err: any) {
    console.error("[createExpenseAction] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to create expense record",
    };
  }
}

export async function updateExpenseAction(
  id: string,
  formData: Partial<ExpenseFormValues>
): Promise<{ success: boolean; data?: Expense; error?: string }> {
  try {
    if (!id) {
      return { success: false, error: "Expense ID is required for updates" };
    }

    // Partial validation
    const partialSchema = ExpenseFormSchema.partial();
    const validated = partialSchema.parse(formData);

    const updated = await expenseRepository.updateExpense(id, validated);

    revalidatePath("/admin/finance/expenses");
    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[updateExpenseAction] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to update expense record",
    };
  }
}

export async function deleteExpenseAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) {
      return { success: false, error: "Expense ID is required" };
    }

    await expenseRepository.deleteExpense(id);

    revalidatePath("/admin/finance/expenses");
    return { success: true };
  } catch (err: any) {
    console.error("[deleteExpenseAction] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to delete expense record",
    };
  }
}
