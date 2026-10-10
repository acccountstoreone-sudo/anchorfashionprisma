import { createAdminClient } from "@/lib/supabase/admin-client";
import { Expense, ExpenseFilters, ExpenseSummary } from "@/types/finance.types";
import { ExpenseFormValues } from "@/schemas/finance.schema";

export class ExpenseRepository {
  private getAdminClient() {
    return createAdminClient();
  }

  /**
   * Fetch expenses with optional filters and joined branch/warehouse metadata.
   */
  async getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
    const supabase = this.getAdminClient();

    try {
      let query = supabase
        .from("expenses")
        .select(`
          id,
          date,
          category,
          description,
          amount,
          status,
          vendor,
          branch_id,
          warehouse_id,
          payment_method,
          receipt_url,
          notes,
          created_by,
          created_at,
          updated_at,
          warehouse:warehouses(name),
          branch:branches(name)
        `)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.startDate) {
        query = query.gte("date", filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte("date", filters.endDate);
      }

      if (filters?.warehouseId) {
        query = query.eq("warehouse_id", filters.warehouseId);
      }

      if (filters?.branchId) {
        query = query.eq("branch_id", filters.branchId);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        // If table doesn't exist yet in schema cache, log guidance and return empty array
        if (error.code === "PGRST205" || error.message.includes("Could not find the table")) {
          console.warn(
            "[ExpenseRepository] Table 'public.expenses' not found in database. Please run the migration: supabase/migrations/20260910100000_enterprise_finance_expenses.sql"
          );
          return [];
        }
        throw new Error(`Failed to fetch expenses: ${error.message}`);
      }

      if (!data) return [];

      let list = (data as any[]).map(this.mapRowToExpense);

      if (filters?.search && filters.search.trim() !== "") {
        const term = filters.search.toLowerCase().trim();
        list = list.filter(
          (e) =>
            e.description.toLowerCase().includes(term) ||
            e.vendor.toLowerCase().includes(term) ||
            e.category.toLowerCase().includes(term) ||
            (e.warehouseName && e.warehouseName.toLowerCase().includes(term)) ||
            (e.branchName && e.branchName.toLowerCase().includes(term))
        );
      }

      return list;
    } catch (err: any) {
      console.error("[ExpenseRepository.getExpenses] Error:", err);
      throw err;
    }
  }

  /**
   * Fetch single expense by ID.
   */
  async getExpenseById(id: string): Promise<Expense | null> {
    const supabase = this.getAdminClient();

    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        warehouse:warehouses(name),
        branch:branches(name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch expense: ${error.message}`);
    }

    return this.mapRowToExpense(data);
  }

  /**
   * Create a new expense record in database.
   */
  async createExpense(values: ExpenseFormValues, userId?: string): Promise<Expense> {
    const supabase = this.getAdminClient();

    const insertPayload: Record<string, any> = {
      date: values.date,
      category: values.category,
      description: values.description.trim(),
      amount: values.amount,
      status: values.status || "paid",
      vendor: values.vendor?.trim() || "",
      payment_method: values.paymentMethod || "CASH",
      notes: values.notes?.trim() || null,
      receipt_url: values.receiptUrl?.trim() || null,
      warehouse_id: values.warehouseId || null,
      branch_id: values.branchId || null,
      created_by: userId || null,
    };

    const { data, error } = await supabase
      .from("expenses")
      .insert(insertPayload)
      .select(`
        *,
        warehouse:warehouses(name),
        branch:branches(name)
      `)
      .single();

    if (error) {
      if (error.message?.includes("expenses_created_by_fkey")) {
        insertPayload.created_by = null;
        const retry = await supabase
          .from("expenses")
          .insert(insertPayload)
          .select(`
            *,
            warehouse:warehouses(name),
            branch:branches(name)
          `)
          .single();
        if (!retry.error && retry.data) {
          return this.mapRowToExpense(retry.data);
        }
      }
      if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
        throw new Error(
          "Table 'expenses' not found in database. Please run the migration: supabase/migrations/20260910100000_enterprise_finance_expenses.sql"
        );
      }
      throw new Error(`Failed to create expense: ${error.message}`);
    }

    return this.mapRowToExpense(data);
  }

  /**
   * Update an existing expense record.
   */
  async updateExpense(id: string, values: Partial<ExpenseFormValues>): Promise<Expense> {
    const supabase = this.getAdminClient();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (values.amount !== undefined) updatePayload.amount = values.amount;
    if (values.category !== undefined) updatePayload.category = values.category;
    if (values.date !== undefined) updatePayload.date = values.date;
    if (values.description !== undefined) updatePayload.description = values.description.trim();
    if (values.vendor !== undefined) updatePayload.vendor = values.vendor.trim();
    if (values.status !== undefined) updatePayload.status = values.status;
    if (values.paymentMethod !== undefined) updatePayload.payment_method = values.paymentMethod;
    if (values.notes !== undefined) updatePayload.notes = values.notes?.trim() || null;
    if (values.receiptUrl !== undefined) updatePayload.receipt_url = values.receiptUrl?.trim() || null;
    if (values.warehouseId !== undefined) updatePayload.warehouse_id = values.warehouseId || null;
    if (values.branchId !== undefined) updatePayload.branch_id = values.branchId || null;

    const { data, error } = await supabase
      .from("expenses")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        *,
        warehouse:warehouses(name),
        branch:branches(name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update expense: ${error.message}`);
    }

    return this.mapRowToExpense(data);
  }

  /**
   * Delete an expense record by ID.
   */
  async deleteExpense(id: string): Promise<void> {
    const supabase = this.getAdminClient();

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      throw new Error(`Failed to delete expense: ${error.message}`);
    }
  }

  /**
   * Calculate summary metrics from expenses.
   */
  async getExpenseSummary(): Promise<ExpenseSummary> {
    const expenses = await this.getExpenses();

    let totalExpenditure = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    const categoryBreakdown: Record<string, number> = {};

    for (const exp of expenses) {
      totalExpenditure += Number(exp.amount) || 0;
      if (exp.status === "paid") {
        paidAmount += Number(exp.amount) || 0;
      } else if (exp.status === "pending" || exp.status === "scheduled") {
        pendingAmount += Number(exp.amount) || 0;
      }

      const cat = exp.category || "Uncategorized";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (Number(exp.amount) || 0);
    }

    return {
      totalExpenditure,
      paidAmount,
      pendingAmount,
      totalCount: expenses.length,
      categoryBreakdown,
    };
  }

  private mapRowToExpense(row: any): Expense {
    return {
      id: row.id,
      date: row.date,
      category: row.category,
      description: row.description,
      amount: Number(row.amount),
      status: row.status,
      vendor: row.vendor || "",
      branchId: row.branch_id || null,
      branchName: row.branch?.name || null,
      warehouseId: row.warehouse_id || null,
      warehouseName: row.warehouse?.name || null,
      paymentMethod: row.payment_method || "CASH",
      notes: row.notes || null,
      receiptUrl: row.receipt_url || null,
      createdBy: row.created_by || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
