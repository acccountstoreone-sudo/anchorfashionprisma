import { DbClient } from "../repositories/base.repository";

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface SortOptions {
  column: string;
  ascending?: boolean;
}

/**
 * Applies pagination to a Supabase query.
 */
export function applyPagination<T>(query: any, options: PaginationOptions) {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? options.limit : 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return query.range(from, to);
}

/**
 * Applies sorting to a Supabase query.
 */
export function applySorting<T>(query: any, options: SortOptions) {
  return query.order(options.column, { ascending: options.ascending ?? true });
}

/**
 * Database Transaction Wrapper (RPC alternative)
 * Supabase client JS doesn't support generic client-side transactions like Prisma.
 * Best practice is to use PostgreSQL functions (RPC) for multi-table transactions.
 * This helper provides a pattern for executing RPCs for transactions.
 */
export async function executeTransaction<T>(
  client: DbClient,
  rpcName: string,
  payload: any
): Promise<T> {
  const { data, error } = await client.rpc(rpcName, payload);
  if (error) {
    throw new Error(`Transaction failed: ${error.message}`);
  }
  return data as T;
}
