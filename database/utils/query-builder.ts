import { DbClient } from "../repositories/base.repository";
import { Database } from "@/types/supabase";

/**
 * Enterprise Query Builder Wrapper
 * Provides a fluent interface for complex query construction
 * ensuring type safety and reusability.
 */
export class QueryBuilder<T> {
  private query: any;

  constructor(client: DbClient, tableName: keyof Database["public"]["Tables"]) {
    this.query = client.from(tableName as string).select("*");
  }

  select(columns: string) {
    this.query = this.query.select(columns);
    return this;
  }

  eq(column: string, value: any) {
    if (value !== undefined && value !== null) {
      this.query = this.query.eq(column, value);
    }
    return this;
  }

  in(column: string, values: any[]) {
    if (values && values.length > 0) {
      this.query = this.query.in(column, values);
    }
    return this;
  }

  ilike(column: string, pattern: string) {
    if (pattern) {
      this.query = this.query.ilike(column, `%${pattern}%`);
    }
    return this;
  }

  execute(): Promise<{ data: T[] | null; error: any }> {
    return this.query;
  }

  executeSingle(): Promise<{ data: T | null; error: any }> {
    return this.query.single();
  }
}
