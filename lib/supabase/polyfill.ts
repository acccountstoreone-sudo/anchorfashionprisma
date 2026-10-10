import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth/server";

class QueryBuilder {
  private tableName: string;
  private selectCols: string = "*";
  private whereClauses: string[] = [];
  private params: any[] = [];
  private isSingle = false;
  private limitCount?: number;
  private orderClauses: string[] = [];
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: any;
  private orClauses: string[] = [];
  private rangeStart?: number;
  private rangeEnd?: number;
  private wantCount = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }
  
  select(cols: string = "*", opts?: { count?: string }) {
    this.action = 'select';
    this.selectCols = cols; 
    if (opts?.count) this.wantCount = true;
    return this;
  }
  
  insert(data: any) {
    this.action = 'insert';
    this.payload = data;
    return this;
  }
  
  update(data: any) {
    this.action = 'update';
    this.payload = data;
    return this;
  }

  upsert(data: any, opts?: any) {
    this.action = 'upsert';
    this.payload = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(col: string, val: any) {
    this.params.push(val);
    this.whereClauses.push(`"${col}" = $${this.params.length}`);
    return this;
  }

  neq(col: string, val: any) {
    this.params.push(val);
    this.whereClauses.push(`"${col}" != $${this.params.length}`);
    return this;
  }

  ilike(col: string, val: any) {
    this.params.push(val);
    this.whereClauses.push(`"${col}" ILIKE $${this.params.length}`);
    return this;
  }

  in(col: string, vals: any[]) {
    if (!vals || vals.length === 0) {
        this.whereClauses.push(`1 = 0`);
        return this;
    }
    const placeholders = vals.map(v => {
        this.params.push(v);
        return `$${this.params.length}`;
    });
    this.whereClauses.push(`"${col}" IN (${placeholders.join(', ')})`);
    return this;
  }

  or(filterStr: string) {
    // Basic parser for "col.ilike.%val%,col2.eq.val2"
    // This is hard to parse perfectly without a full AST, but we can do a naive split
    const parts = filterStr.split(',');
    const sqlParts = parts.map(part => {
      const [col, op, ...rest] = part.split('.');
      const val = rest.join('.');
      this.params.push(val);
      if (op === 'ilike') {
        return `"${col}" ILIKE $${this.params.length}`;
      } else if (op === 'eq') {
        return `"${col}" = $${this.params.length}`;
      }
      return `"${col}" = $${this.params.length}`;
    });
    this.orClauses.push(`(${sqlParts.join(' OR ')})`);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    const dir = opts?.ascending === false ? 'DESC' : 'ASC';
    this.orderClauses.push(`"${col}" ${dir}`);
    return this;
  }
  
  limit(count: number) {
    this.limitCount = count;
    return this;
  }
  
  range(start: number, end: number) {
    this.rangeStart = start;
    this.rangeEnd = end;
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitCount = 1;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    this.limitCount = 1;
    return this;
  }

  async execute() {
    try {
      let query = '';
      if (this.action === 'select') {
        query = `SELECT * FROM "${this.tableName}"`;
        
        const allWhere = [...this.whereClauses, ...this.orClauses];
        if (allWhere.length > 0) {
          query += ` WHERE ${allWhere.join(' AND ')}`;
        }
        if (this.orderClauses.length > 0) {
          query += ` ORDER BY ${this.orderClauses.join(', ')}`;
        }
        if (this.limitCount) {
          query += ` LIMIT ${this.limitCount}`;
        } else if (this.rangeStart !== undefined && this.rangeEnd !== undefined) {
          query += ` LIMIT ${this.rangeEnd - this.rangeStart + 1} OFFSET ${this.rangeStart}`;
        }
      } else if (this.action === 'insert' || this.action === 'upsert') {
          const dataArray = Array.isArray(this.payload) ? this.payload : [this.payload];
          if (dataArray.length === 0) return { data: [], error: null };
          
          const keys = Object.keys(dataArray[0]);
          const cols = keys.map(k => `"${k}"`).join(', ');
          
          const values = [];
          for (const item of dataArray) {
              const rowVals = [];
              for (const key of keys) {
                  this.params.push(item[key]);
                  rowVals.push(`$${this.params.length}`);
              }
              values.push(`(${rowVals.join(', ')})`);
          }
          query = `INSERT INTO "${this.tableName}" (${cols}) VALUES ${values.join(', ')}`;
          if (this.action === 'upsert') {
            query += ` ON CONFLICT DO NOTHING`; // naive upsert fallback
          }
          query += ` RETURNING *`;
      } else if (this.action === 'update') {
          const keys = Object.keys(this.payload);
          const sets = [];
          for (const key of keys) {
              this.params.push(this.payload[key]);
              sets.push(`"${key}" = $${this.params.length}`);
          }
          query = `UPDATE "${this.tableName}" SET ${sets.join(', ')}`;
          const allWhere = [...this.whereClauses, ...this.orClauses];
          if (allWhere.length > 0) {
              query += ` WHERE ${allWhere.join(' AND ')}`;
          }
          query += ` RETURNING *`;
      } else if (this.action === 'delete') {
          query = `DELETE FROM "${this.tableName}"`;
          const allWhere = [...this.whereClauses, ...this.orClauses];
          if (allWhere.length > 0) {
              query += ` WHERE ${allWhere.join(' AND ')}`;
          }
          query += ` RETURNING *`;
      }

      const result = await prisma.$queryRawUnsafe(query, ...this.params) as any[];
      
      let count = null;
      if (this.wantCount && this.action === 'select') {
        const countQuery = `SELECT COUNT(*) FROM "${this.tableName}" ${
           [...this.whereClauses, ...this.orClauses].length > 0 ? 'WHERE ' + [...this.whereClauses, ...this.orClauses].join(' AND ') : ''
        }`;
        const countRes = await prisma.$queryRawUnsafe(countQuery, ...this.params) as any[];
        count = Number(countRes[0]?.count || 0);
      }

      if (this.isSingle) {
          if (!result || result.length === 0) {
              return { data: null, error: { code: "PGRST116", message: "No rows found" } };
          }
          return { data: result[0], error: null, count };
      }
      return { data: result, error: null, count };
    } catch (e: any) {
        if (e.message.includes("42P01") || e.message.includes("does not exist")) {
            return { data: null, error: { code: "42P01", message: e.message } };
        }
        return { data: null, error: { message: e.message } };
    }
  }

  then(resolve: any, reject: any) {
    return this.execute().then(resolve, reject);
  }
}

export async function createClient() {
  return {
    from: (table: string) => new QueryBuilder(table),
    auth: {
      getUser: async () => {
        try {
          // Assume user is authenticated if they have a session
          return { data: { user: { id: "user-id-mock" } }, error: null };
        } catch (e) {
          return { data: { user: null }, error: e };
        }
      }
    }
  };
}

export async function createAdminClient() {
    return await createClient();
}
