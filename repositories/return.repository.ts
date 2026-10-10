// ============================================================================
// Return Repository
// ============================================================================

import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  ReturnRequest,
  ReturnItem,
  ReturnWithItems,
  ReturnFilters,
  PaginatedResult,
} from "@/types/shipping.types";

export class ReturnRepository {
  private getClient() {
    return createAdminClient();
  }

  /**
   * Create a return with its items.
   */
  async createReturn(
    data: Omit<Partial<ReturnRequest>, "id" | "created_at" | "updated_at">,
    items: Omit<Partial<ReturnItem>, "id" | "return_id" | "created_at">[]
  ): Promise<ReturnWithItems> {
    const supabase = this.getClient();

    const { data: ret, error } = await supabase
      .from("returns")
      .insert(data as any)
      .select()
      .single();

    if (error) throw new Error(`Create return failed: ${error.message}`);

    if (items.length > 0) {
      const { error: itemError } = await supabase
        .from("return_items")
        .insert(items.map((item) => ({ ...item, return_id: ret.id })) as any);

      if (itemError) console.error("Failed to insert return items:", itemError);
    }

    return this.getReturnWithItems(ret.id) as Promise<ReturnWithItems>;
  }

  /**
   * Update return fields.
   */
  async updateReturn(
    id: string,
    data: Partial<ReturnRequest> & { [key: string]: any }
  ): Promise<ReturnRequest> {
    const supabase = this.getClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from("returns").update(data as any);
    query = isUuid ? query.eq("id", id) : query.eq("return_number", id);

    const { data: updated, error } = await query
      .select()
      .maybeSingle();

    if (error) throw new Error(`Update return failed: ${error.message}`);
    return updated as ReturnRequest;
  }

  /**
   * Atomic state transition: updates status only if current status is in allowed array.
   * Automatically logs to order_notes.
   */
  async atomicUpdateStatus(
    id: string,
    allowedCurrentStatuses: string[],
    data: Partial<ReturnRequest> & { status: string },
    actorId?: string
  ): Promise<ReturnRequest> {
    const supabase = this.getClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // Support both lowercase and UPPERCASE to prevent casing mismatches
    const caseInsensitiveStatuses = Array.from(
      new Set([
        ...allowedCurrentStatuses.map((s) => s.toLowerCase()),
        ...allowedCurrentStatuses.map((s) => s.toUpperCase()),
      ])
    );
    
    let query = supabase.from("returns").update(data as any);
    query = isUuid ? query.eq("id", id) : query.eq("return_number", id);

    const { data: updated, error } = await query
      .in("status", caseInsensitiveStatuses)
      .select()
      .maybeSingle();

    if (error) throw new Error(`Atomic status update failed: ${error.message}`);
    if (!updated) throw new Error(`Invalid state transition. Return ${id} is not in an allowed state: ${allowedCurrentStatuses.join(", ")}`);
    
    // Audit Log
    if (updated.order_id) {
      try {
        await supabase.from("order_notes").insert({
          order_id: updated.order_id,
          author_id: actorId || null,
          note: `[RETURN] Status changed to '${data.status}' for Return #${updated.return_number}`,
          is_customer_visible: false,
        });
      } catch (noteErr) {
        console.warn("[atomicUpdateStatus] Note logging skipped:", noteErr);
      }
    }

    return updated as ReturnRequest;
  }

  /**
   * Atomic refund transition: updates refund_status only if it is in allowed array (or null).
   * Automatically logs to order_notes.
   */
  async atomicUpdateRefundStatus(
    id: string,
    allowedCurrentStatuses: (string | null)[],
    data: Partial<ReturnRequest> & { refund_status: string },
    actorId?: string
  ): Promise<ReturnRequest> {
    const supabase = this.getClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    const conditionParts = [];
    const validStrings = allowedCurrentStatuses.filter(s => s !== null);
    if (validStrings.length > 0) {
      const caseInsensitiveStrings = Array.from(
        new Set([
          ...validStrings.map((s) => s.toLowerCase()),
          ...validStrings.map((s) => s.toUpperCase()),
        ])
      );
      conditionParts.push(`refund_status.in.(${caseInsensitiveStrings.join(",")})`);
    }
    if (allowedCurrentStatuses.includes(null)) {
      conditionParts.push(`refund_status.is.null`);
    }
    
    let query = supabase.from("returns").update(data as any);
    query = isUuid ? query.eq("id", id) : query.eq("return_number", id);

    const { data: updated, error } = await query
      .or(conditionParts.join(","))
      .select()
      .maybeSingle();

    if (error) throw new Error(`Atomic refund status update failed: ${error.message}`);
    if (!updated) throw new Error(`Refund already processed or locked by another transaction.`);
    
    // Audit Log
    if (updated.order_id) {
      try {
        await supabase.from("order_notes").insert({
          order_id: updated.order_id,
          author_id: actorId || null,
          note: `[RETURN] Refund status changed to '${data.status || data.refund_status}' for Return #${updated.return_number}`,
          is_customer_visible: false,
        });
      } catch (noteErr) {
        console.warn("[atomicUpdateRefundStatus] Note logging skipped:", noteErr);
      }
    }

    return updated as ReturnRequest;
  }

  /**
   * Get return by ID.
   */
  async getReturnById(id: string): Promise<ReturnRequest | null> {
    const supabase = this.getClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const query = supabase.from("returns").select("*");
    const { data, error } = await (isUuid
      ? query.eq("id", id)
      : query.eq("return_number", id)
    ).maybeSingle();

    if (error) throw new Error(`Get return failed: ${error.message}`);
    return data as ReturnRequest | null;
  }

  /**
   * Get return with items.
   */
  async getReturnWithItems(id: string): Promise<ReturnWithItems | null> {
    const supabase = this.getClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const query = supabase.from("returns").select(
      `
      *,
      items:return_items(*)
    `
    );
    const { data, error } = await (isUuid
      ? query.eq("id", id)
      : query.eq("return_number", id)
    ).maybeSingle();

    if (error)
      throw new Error(`Get return with items failed: ${error.message}`);
    return data as ReturnWithItems | null;
  }

  /**
   * Get returns by order.
   */
  async getReturnsByOrderId(orderId: string): Promise<ReturnRequest[]> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from("returns")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Get returns by order failed: ${error.message}`);
    return (data ?? []) as ReturnRequest[];
  }

  /**
   * List returns with pagination and filters.
   */
  async listReturns(
    filters: ReturnFilters
  ): Promise<PaginatedResult<ReturnRequest>> {
    const supabase = this.getClient();
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Only join orders table when filtering by branchId
    let query = filters.branchId
      ? supabase.from("returns").select("*, orders!inner(branch_id)", { count: "exact" })
      : supabase.from("returns").select("*", { count: "exact" });

    if (filters.status) {
      query = query.or(`status.eq.${filters.status.toLowerCase()},status.eq.${filters.status.toUpperCase()}`);
    }
    if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
    if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
    if (filters.search) {
      query = query.or(`return_number.ilike.%${filters.search}%`);
    }
    if (filters.branchId) {
      query = query.eq("orders.branch_id", filters.branchId);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`List returns failed: ${error.message}`);

    return {
      data: ((data ?? []) as unknown) as ReturnRequest[],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  /**
   * Get returns by customer ID.
   */
  async getReturnsByCustomerId(customerId: string): Promise<ReturnWithItems[]> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from("returns")
      .select(
        `
        *,
        items:return_items(*)
      `
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Get returns by customer failed: ${error.message}`);
    return (data ?? []) as ReturnWithItems[];
  }

  /**
   * Get active return items for an order (excluding rejected/cancelled).
   * Used to check already requested/returned quantities.
   */
  async getActiveReturnItemsForOrder(
    orderId: string
  ): Promise<Array<ReturnItem & { return_status: string }>> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from("returns")
      .select(
        `
        id,
        status,
        items:return_items(*)
      `
      )
      .eq("order_id", orderId)
      .not("status", "in", "('rejected','cancelled')");

    if (error) {
      console.error("Error fetching active return items for order:", error);
      return [];
    }

    const result: Array<ReturnItem & { return_status: string }> = [];
    if (data) {
      for (const ret of data) {
        if (Array.isArray(ret.items)) {
          for (const it of ret.items) {
            result.push({
              ...it,
              return_status: ret.status,
            });
          }
        }
      }
    }
    return result;
  }

  /**
   * Get return items for a return.
   */
  async getReturnItems(returnId: string): Promise<ReturnItem[]> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from("return_items")
      .select("*")
      .eq("return_id", returnId);

    if (error) throw new Error(`Get return items failed: ${error.message}`);
    return (data ?? []) as ReturnItem[];
  }

  /**
   * Mark a return item as restocked.
   */
  async markItemRestocked(returnItemId: string): Promise<void> {
    const supabase = this.getClient();
    await supabase
      .from("return_items")
      .update({ restocked: true } as any)
      .eq("id", returnItemId);
  }
}

