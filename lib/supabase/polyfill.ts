import prisma from "@/lib/prisma";

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
    if (val === null) {
      this.whereClauses.push(`"${col}" IS NULL`);
      return this;
    }
    this.params.push(val);
    const idx = this.params.length;
    if (typeof val === 'boolean') {
      this.whereClauses.push(`"${col}" = $${idx}`);
    } else {
      this.whereClauses.push(`("${col}"::text = $${idx}::text)`);
    }
    return this;
  }

  neq(col: string, val: any) {
    if (val === null) {
      this.whereClauses.push(`"${col}" IS NOT NULL`);
      return this;
    }
    this.params.push(val);
    const idx = this.params.length;
    if (typeof val === 'boolean') {
      this.whereClauses.push(`"${col}" != $${idx}`);
    } else {
      this.whereClauses.push(`("${col}"::text != $${idx}::text)`);
    }
    return this;
  }

  gt(col: string, val: any) {
    this.params.push(val);
    const idx = this.params.length;
    if (typeof val === 'string' && !isNaN(Date.parse(val)) && (val.includes('-') || val.includes('T'))) {
      this.whereClauses.push(`"${col}" > $${idx}::timestamptz`);
    } else {
      this.whereClauses.push(`"${col}" > $${idx}`);
    }
    return this;
  }

  gte(col: string, val: any) {
    this.params.push(val);
    const idx = this.params.length;
    if (typeof val === 'string' && !isNaN(Date.parse(val)) && (val.includes('-') || val.includes('T'))) {
      this.whereClauses.push(`"${col}" >= $${idx}::timestamptz`);
    } else {
      this.whereClauses.push(`"${col}" >= $${idx}`);
    }
    return this;
  }

  lt(col: string, val: any) {
    this.params.push(val);
    const idx = this.params.length;
    if (typeof val === 'string' && !isNaN(Date.parse(val)) && (val.includes('-') || val.includes('T'))) {
      this.whereClauses.push(`"${col}" < $${idx}::timestamptz`);
    } else {
      this.whereClauses.push(`"${col}" < $${idx}`);
    }
    return this;
  }

  lte(col: string, val: any) {
    this.params.push(val);
    const idx = this.params.length;
    if (typeof val === 'string' && !isNaN(Date.parse(val)) && (val.includes('-') || val.includes('T'))) {
      this.whereClauses.push(`"${col}" <= $${idx}::timestamptz`);
    } else {
      this.whereClauses.push(`"${col}" <= $${idx}`);
    }
    return this;
  }

  like(col: string, val: any) {
    this.params.push(val);
    this.whereClauses.push(`"${col}" LIKE $${this.params.length}`);
    return this;
  }

  ilike(col: string, val: any) {
    this.params.push(val);
    this.whereClauses.push(`"${col}" ILIKE $${this.params.length}`);
    return this;
  }

  is(col: string, val: any) {
    if (val === null) {
      this.whereClauses.push(`"${col}" IS NULL`);
    } else if (typeof val === 'boolean') {
      this.whereClauses.push(`"${col}" IS ${val ? 'TRUE' : 'FALSE'}`);
    } else {
      this.params.push(val);
      this.whereClauses.push(`("${col}"::text = $${this.params.length}::text)`);
    }
    return this;
  }

  in(col: string, vals: any[]) {
    if (!vals || vals.length === 0) {
      this.whereClauses.push(`1 = 0`);
      return this;
    }
    const placeholders = vals.map(v => {
      this.params.push(v);
      return `$${this.params.length}::text`;
    });
    this.whereClauses.push(`("${col}"::text IN (${placeholders.join(', ')}))`);
    return this;
  }

  contains(col: string, val: any) {
    this.params.push(val);
    this.whereClauses.push(`"${col}" @> $${this.params.length}`);
    return this;
  }

  containedBy(col: string, val: any) {
    this.params.push(val);
    this.whereClauses.push(`"${col}" <@ $${this.params.length}`);
    return this;
  }

  overlaps(col: string, val: any) {
    this.params.push(val);
    this.whereClauses.push(`"${col}" && $${this.params.length}`);
    return this;
  }

  match(obj: Record<string, any>) {
    for (const [k, v] of Object.entries(obj)) {
      this.eq(k, v);
    }
    return this;
  }

  not(col: string, op: string, val: any) {
    if (op === 'is' && val === null) {
      this.whereClauses.push(`"${col}" IS NOT NULL`);
    } else if (op === 'in') {
      if (!val || val.length === 0) {
        this.whereClauses.push(`1 = 1`);
        return this;
      }
      const placeholders = val.map((v: any) => {
        this.params.push(v);
        return `$${this.params.length}::text`;
      });
      this.whereClauses.push(`("${col}"::text NOT IN (${placeholders.join(', ')}))`);
    } else if (op === 'eq') {
      return this.neq(col, val);
    } else {
      this.params.push(val);
      this.whereClauses.push(`NOT ("${col}"::text = $${this.params.length}::text)`);
    }
    return this;
  }

  or(filterStr: string) {
    const parts = filterStr.split(',');
    const sqlParts = parts.map(part => {
      const [col, op, ...rest] = part.split('.');
      const val = rest.join('.');
      this.params.push(val);
      const idx = this.params.length;
      if (op === 'ilike') {
        return `"${col}" ILIKE $${idx}`;
      } else if (op === 'like') {
        return `"${col}" LIKE $${idx}`;
      } else if (op === 'eq') {
        return `("${col}"::text = $${idx}::text)`;
      } else if (op === 'neq') {
        return `("${col}"::text != $${idx}::text)`;
      } else if (op === 'gt') {
        return `"${col}" > $${idx}`;
      } else if (op === 'gte') {
        return `"${col}" >= $${idx}`;
      } else if (op === 'lt') {
        return `"${col}" < $${idx}`;
      } else if (op === 'lte') {
        return `"${col}" <= $${idx}`;
      }
      return `("${col}"::text = $${idx}::text)`;
    });
    this.orClauses.push(`(${sqlParts.join(' OR ')})`);
    return this;
  }

  filter(col: string, op: string, val: any) {
    switch (op) {
      case 'eq': return this.eq(col, val);
      case 'neq': return this.neq(col, val);
      case 'gt': return this.gt(col, val);
      case 'gte': return this.gte(col, val);
      case 'lt': return this.lt(col, val);
      case 'lte': return this.lte(col, val);
      case 'like': return this.like(col, val);
      case 'ilike': return this.ilike(col, val);
      case 'is': return this.is(col, val);
      case 'in': return this.in(col, val);
      case 'contains': return this.contains(col, val);
      default: return this.eq(col, val);
    }
  }

  textSearch(col: string, query: string, opts?: any) {
    this.params.push(query);
    this.whereClauses.push(`"${col}"::text ILIKE '%' || $${this.params.length} || '%'`);
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

  returns() {
    return this;
  }

  csv() {
    return this;
  }

  abortSignal() {
    return this;
  }

  throwOnError() {
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
            query += ` ON CONFLICT DO NOTHING`;
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
      return { data: result || [], error: null, count };
    } catch (e: any) {
        return { data: this.isSingle ? null : [], error: { code: e.code || "42P01", message: e.message } };
    }
  }

  then(resolve: any, reject: any) {
    return this.execute().then(resolve, reject);
  }
}

export function createClient() {
  return {
    from: (table: string) => new QueryBuilder(table),
    rpc: async (fnName: string, args?: any) => {
      try {
        if (!args || Object.keys(args).length === 0) {
          const res = await prisma.$queryRawUnsafe(`SELECT * FROM "${fnName}"()`) as any[];
          return { data: res, error: null };
        }
        const keys = Object.keys(args);
        const params = keys.map(k => args[k]);
        const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
        const res = await prisma.$queryRawUnsafe(`SELECT * FROM "${fnName}"(${placeholders})`, ...params) as any[];
        return { data: res, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message, code: e.code } };
      }
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: any, opts?: any) => ({ data: { path }, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: path?.startsWith('http') ? path : `/uploads/${path}` } }),
        download: async (path: string) => ({ data: new Blob(), error: null }),
        remove: async (paths: string[]) => ({ data: paths, error: null }),
        list: async (folder?: string, opts?: any) => ({ data: [], error: null }),
        createSignedUrl: async (path: string, exp: number) => ({ data: { signedUrl: `/uploads/${path}` }, error: null })
      }),
      listBuckets: async () => ({ data: [{ name: 'media' }, { name: 'return_proofs' }], error: null }),
      getBucket: async (name: string) => ({ data: { name }, error: null }),
      createBucket: async (name: string, opts?: any) => ({ data: { name }, error: null }),
      deleteBucket: async (name: string) => ({ data: null, error: null })
    },
    auth: {
      getUser: async () => {
        try {
          return { data: { user: { id: "user-id-mock" } }, error: null };
        } catch (e) {
          return { data: { user: null }, error: e };
        }
      },
      getSession: async () => ({ data: { session: null }, error: null }),
      admin: {
        getUserById: async (id: string) => ({ data: { user: null }, error: null }),
        listUsers: async () => ({ data: { users: [] }, error: null }),
        deleteUser: async (id: string) => ({ data: null, error: null })
      }
    }
  };
}

export function createAdminClient() {
  return createClient();
}
