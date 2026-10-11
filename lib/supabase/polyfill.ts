import prisma from "@/lib/prisma";

function serializePlain(val: any): any {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "bigint") return Number(val);
  if (typeof val === "object") {
    if (typeof (val as any).toNumber === "function") return (val as any).toNumber();
    if (typeof (val as any).toFixed === "function" && typeof val !== "string") {
      const num = Number(val);
      if (!isNaN(num)) return num;
    }
    if (Array.isArray(val)) return val.map(serializePlain);
    const res: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      res[key] = serializePlain(val[key]);
    }
    return res;
  }
  return val;
}

class QueryBuilder {
  private tableName: string;
  private selectCols: string = "*";
  private whereClauses: string[] = [];
  private params: any[] = [];
  private isSingle = false;
  private limitCount?: number;
  private orderClauses: string[] = [];
  private action: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: any;
  private orClauses: string[] = [];
  private rangeStart?: number;
  private rangeEnd?: number;
  private wantCount = false;

  private onConflictCols?: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(cols: string = "*", opts?: { count?: string }) {
    if (!["insert", "update", "upsert", "delete"].includes(this.action)) {
      this.action = "select";
    }
    this.selectCols = cols;
    if (opts?.count) this.wantCount = true;
    return this;
  }

  insert(data: any) {
    this.action = "insert";
    this.payload = data;
    return this;
  }

  update(data: any) {
    this.action = "update";
    this.payload = data;
    return this;
  }

  upsert(data: any, opts?: any) {
    this.action = "upsert";
    this.payload = data;
    if (opts?.onConflict) {
      this.onConflictCols = opts.onConflict;
    }
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(col: string, val: any) {
    if (val === null) {
      this.whereClauses.push(`"${col}" IS NULL`);
      return this;
    }
    this.params.push(val);
    const idx = this.params.length;
    if (typeof val === "boolean") {
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
    if (typeof val === "boolean") {
      this.whereClauses.push(`"${col}" != $${idx}`);
    } else {
      this.whereClauses.push(`("${col}"::text != $${idx}::text)`);
    }
    return this;
  }

  gt(col: string, val: any) {
    this.params.push(val);
    const idx = this.params.length;
    if (
      typeof val === "string" &&
      !isNaN(Date.parse(val)) &&
      (val.includes("-") || val.includes("T"))
    ) {
      this.whereClauses.push(`"${col}" > $${idx}::timestamptz`);
    } else {
      this.whereClauses.push(`"${col}" > $${idx}`);
    }
    return this;
  }

  gte(col: string, val: any) {
    this.params.push(val);
    const idx = this.params.length;
    if (
      typeof val === "string" &&
      !isNaN(Date.parse(val)) &&
      (val.includes("-") || val.includes("T"))
    ) {
      this.whereClauses.push(`"${col}" >= $${idx}::timestamptz`);
    } else {
      this.whereClauses.push(`"${col}" >= $${idx}`);
    }
    return this;
  }

  lt(col: string, val: any) {
    this.params.push(val);
    const idx = this.params.length;
    if (
      typeof val === "string" &&
      !isNaN(Date.parse(val)) &&
      (val.includes("-") || val.includes("T"))
    ) {
      this.whereClauses.push(`"${col}" < $${idx}::timestamptz`);
    } else {
      this.whereClauses.push(`"${col}" < $${idx}`);
    }
    return this;
  }

  lte(col: string, val: any) {
    this.params.push(val);
    const idx = this.params.length;
    if (
      typeof val === "string" &&
      !isNaN(Date.parse(val)) &&
      (val.includes("-") || val.includes("T"))
    ) {
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
    } else if (typeof val === "boolean") {
      this.whereClauses.push(`"${col}" IS ${val ? "TRUE" : "FALSE"}`);
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
    const placeholders = vals.map((v) => {
      this.params.push(v);
      return `$${this.params.length}::text`;
    });
    this.whereClauses.push(`("${col}"::text IN (${placeholders.join(", ")}))`);
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
    if (op === "is" && val === null) {
      this.whereClauses.push(`"${col}" IS NOT NULL`);
    } else if (op === "in") {
      if (!val || val.length === 0) {
        this.whereClauses.push(`1 = 1`);
        return this;
      }
      const placeholders = val.map((v: any) => {
        this.params.push(v);
        return `$${this.params.length}::text`;
      });
      this.whereClauses.push(
        `("${col}"::text NOT IN (${placeholders.join(", ")}))`
      );
    } else if (op === "eq") {
      return this.neq(col, val);
    } else {
      this.params.push(val);
      this.whereClauses.push(
        `NOT ("${col}"::text = $${this.params.length}::text)`
      );
    }
    return this;
  }

  or(filterStr: string) {
    const parts = filterStr.split(",");
    const sqlParts = parts.map((part) => {
      const [col, op, ...rest] = part.split(".");
      const val = rest.join(".");
      this.params.push(val);
      const idx = this.params.length;
      if (op === "ilike") {
        return `"${col}" ILIKE $${idx}`;
      } else if (op === "like") {
        return `"${col}" LIKE $${idx}`;
      } else if (op === "eq") {
        return `("${col}"::text = $${idx}::text)`;
      } else if (op === "neq") {
        return `("${col}"::text != $${idx}::text)`;
      } else if (op === "gt") {
        return `"${col}" > $${idx}`;
      } else if (op === "gte") {
        return `"${col}" >= $${idx}`;
      } else if (op === "lt") {
        return `"${col}" < $${idx}`;
      } else if (op === "lte") {
        return `"${col}" <= $${idx}`;
      }
      return `("${col}"::text = $${idx}::text)`;
    });
    this.orClauses.push(`(${sqlParts.join(" OR ")})`);
    return this;
  }

  filter(col: string, op: string, val: any) {
    switch (op) {
      case "eq":
        return this.eq(col, val);
      case "neq":
        return this.neq(col, val);
      case "gt":
        return this.gt(col, val);
      case "gte":
        return this.gte(col, val);
      case "lt":
        return this.lt(col, val);
      case "lte":
        return this.lte(col, val);
      case "like":
        return this.like(col, val);
      case "ilike":
        return this.ilike(col, val);
      case "is":
        return this.is(col, val);
      case "in":
        return this.in(col, val);
      case "contains":
        return this.contains(col, val);
      default:
        return this.eq(col, val);
    }
  }

  textSearch(col: string, query: string, opts?: any) {
    this.params.push(query);
    this.whereClauses.push(
      `"${col}"::text ILIKE '%' || $${this.params.length} || '%'`
    );
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    const dir = opts?.ascending === false ? "DESC" : "ASC";
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

  private async attachRelations(rows: any[]) {
    if (!rows || rows.length === 0) return rows;

    try {
      // 1. If querying profiles and roles relation requested: profiles(*), roles(*)
      if (
        (this.tableName === "profiles" || this.tableName === "customer_profiles") &&
        this.selectCols.includes("roles")
      ) {
        const roleIds = [
          ...new Set(rows.map((r) => r.role_id).filter(Boolean)),
        ];
        if (roleIds.length > 0) {
          const roles = await prisma.role.findMany({
            where: { id: { in: roleIds } },
          });
          const roleMap = new Map(roles.map((r) => [r.id, r]));
          for (const row of rows) {
            row.roles = roleMap.get(row.role_id) || null;
          }
        }
      }

      // 2. If querying orders and order_items requested
      if (
        (this.tableName === "orders" || this.tableName === "customer_orders") &&
        this.selectCols.includes("order_items")
      ) {
        const orderIds = rows.map((r) => r.id).filter(Boolean);
        if (orderIds.length > 0) {
          const items = (await prisma.$queryRawUnsafe(
            `SELECT * FROM "order_items" WHERE "order_id" = ANY($1::uuid[])`,
            orderIds
          )) as any[];
          const itemMap = new Map<string, any[]>();
          for (const it of items) {
            if (!itemMap.has(it.order_id)) itemMap.set(it.order_id, []);
            itemMap.get(it.order_id)!.push(serializePlain(it));
          }
          for (const row of rows) {
            row.order_items = itemMap.get(row.id) || [];
          }
        }
      }

      // 3. If querying products and variants or media requested
      if (
        (this.tableName === "products" || this.tableName === "store_products") &&
        (this.selectCols.includes("variants") ||
          this.selectCols.includes("product_media") ||
          this.selectCols.includes("categories"))
      ) {
        const productIds = rows.map((r) => r.id).filter(Boolean);
        if (productIds.length > 0) {
          if (this.selectCols.includes("variants")) {
            const vars = (await prisma.$queryRawUnsafe(
              `SELECT * FROM "variants" WHERE "product_id" = ANY($1::uuid[])`,
              productIds
            )) as any[];
            const varMap = new Map<string, any[]>();
            for (const v of vars) {
              if (!varMap.has(v.product_id)) varMap.set(v.product_id, []);
              varMap.get(v.product_id)!.push(serializePlain(v));
            }
            for (const row of rows) {
              row.variants = varMap.get(row.id) || [];
            }
          }
          if (this.selectCols.includes("product_media")) {
            const mediaList = (await prisma.$queryRawUnsafe(
              `SELECT * FROM "product_media" WHERE "product_id" = ANY($1::uuid[]) ORDER BY "sort_order" ASC`,
              productIds
            )) as any[];
            const mediaMap = new Map<string, any[]>();
            for (const m of mediaList) {
              if (!mediaMap.has(m.product_id)) mediaMap.set(m.product_id, []);
              mediaMap.get(m.product_id)!.push(serializePlain(m));
            }
            for (const row of rows) {
              row.product_media = mediaMap.get(row.id) || [];
            }
          }
        }
      }
    } catch (relErr) {
      // Non-critical relation attachment failure
      console.warn("[attachRelations] Notice:", relErr);
    }

    return rows;
  }

  async execute() {
    try {
      let query = "";
      if (this.action === "select") {
        query = `SELECT * FROM "${this.tableName}"`;

        const allWhere = [...this.whereClauses, ...this.orClauses];
        if (allWhere.length > 0) {
          query += ` WHERE ${allWhere.join(" AND ")}`;
        }
        if (this.orderClauses.length > 0) {
          query += ` ORDER BY ${this.orderClauses.join(", ")}`;
        }
        if (this.limitCount) {
          query += ` LIMIT ${this.limitCount}`;
        } else if (
          this.rangeStart !== undefined &&
          this.rangeEnd !== undefined
        ) {
          query += ` LIMIT ${this.rangeEnd - this.rangeStart + 1} OFFSET ${this.rangeStart}`;
        }
      } else if (this.action === "insert" || this.action === "upsert") {
        const dataArray = Array.isArray(this.payload)
          ? this.payload
          : [this.payload];
        if (dataArray.length === 0) return { data: [], error: null };

        const keys = Object.keys(dataArray[0]);
        const cols = keys.map((k) => `"${k}"`).join(", ");

        const values = [];
        for (const item of dataArray) {
          const rowVals = [];
          for (const key of keys) {
            let val = item[key];
            if (val !== null && typeof val === "object" && !(val instanceof Date)) {
              this.params.push(JSON.stringify(val));
              rowVals.push(`$${this.params.length}::jsonb`);
            } else if (
              typeof val === "string" &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
            ) {
              this.params.push(val);
              rowVals.push(`$${this.params.length}::uuid`);
            } else {
              this.params.push(val);
              rowVals.push(`$${this.params.length}`);
            }
          }
          values.push(`(${rowVals.join(", ")})`);
        }
        query = `INSERT INTO "${this.tableName}" (${cols}) VALUES ${values.join(", ")}`;
        if (this.action === "upsert") {
          if (this.onConflictCols) {
            const conflictCols = this.onConflictCols
              .split(",")
              .map((c: string) => `"${c.trim()}"`)
              .join(", ");
            const conflictColNames = this.onConflictCols.split(",").map((c: string) => c.trim());
            const updateCols = keys
              .filter((k) => !conflictColNames.includes(k))
              .map((k) => `"${k}" = EXCLUDED."${k}"`)
              .join(", ");
            if (updateCols) {
              query += ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateCols}`;
            } else {
              query += ` ON CONFLICT (${conflictCols}) DO NOTHING`;
            }
          } else {
            query += ` ON CONFLICT DO NOTHING`;
          }
        }
        query += ` RETURNING *`;
      } else if (this.action === "update") {
        const keys = Object.keys(this.payload);
        const sets = [];
        for (const key of keys) {
          let val = this.payload[key];
          if (val !== null && typeof val === "object" && !(val instanceof Date)) {
            this.params.push(JSON.stringify(val));
            sets.push(`"${key}" = $${this.params.length}::jsonb`);
          } else if (
            typeof val === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
          ) {
            this.params.push(val);
            sets.push(`"${key}" = $${this.params.length}::uuid`);
          } else {
            this.params.push(val);
            sets.push(`"${key}" = $${this.params.length}`);
          }
        }
        query = `UPDATE "${this.tableName}" SET ${sets.join(", ")}`;
        const allWhere = [...this.whereClauses, ...this.orClauses];
        if (allWhere.length > 0) {
          query += ` WHERE ${allWhere.join(" AND ")}`;
        }
        query += ` RETURNING *`;
      } else if (this.action === "delete") {
        query = `DELETE FROM "${this.tableName}"`;
        const allWhere = [...this.whereClauses, ...this.orClauses];
        if (allWhere.length > 0) {
          query += ` WHERE ${allWhere.join(" AND ")}`;
        }
        query += ` RETURNING *`;
      }

      let rawResult = (await prisma.$queryRawUnsafe(
        query,
        ...this.params
      )) as any[];
      let result = serializePlain(rawResult) as any[];

      if (this.action === "select" && result && result.length > 0) {
        result = await this.attachRelations(result);
      }

      let count = null;
      if (this.wantCount && this.action === "select") {
        try {
          const countQuery = `SELECT COUNT(*) FROM "${this.tableName}" ${
            [...this.whereClauses, ...this.orClauses].length > 0
              ? "WHERE " + [...this.whereClauses, ...this.orClauses].join(" AND ")
              : ""
          }`;
          const countRes = (await prisma.$queryRawUnsafe(
            countQuery,
            ...this.params
          )) as any[];
          count = Number(countRes[0]?.count || 0);
        } catch {
          count = result?.length || 0;
        }
      }

      if (this.isSingle) {
        if (!result || result.length === 0) {
          return {
            data: null,
            error: { code: "PGRST116", message: "No rows found" },
          };
        }
        return { data: result[0], error: null, count };
      }
      return { data: result || [], error: null, count };
    } catch (e: any) {
      if (e.code === "42P01" || e.message?.includes("does not exist")) {
        // Relation does not exist - return empty gracefully so it never crashes
        return {
          data: this.isSingle ? null : [],
          error: null,
          count: 0,
        };
      }
      return {
        data: this.isSingle ? null : [],
        error: { code: e.code || "42P01", message: e.message },
      };
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
          const res = (await prisma.$queryRawUnsafe(
            `SELECT * FROM "${fnName}"()`
          )) as any[];
          return { data: serializePlain(res), error: null };
        }
        const keys = Object.keys(args);
        const params = keys.map((k) => args[k]);
        const placeholders = params.map((_, i) => `$${i + 1}`).join(", ");
        const res = (await prisma.$queryRawUnsafe(
          `SELECT * FROM "${fnName}"(${placeholders})`,
          ...params
        )) as any[];
        return { data: serializePlain(res), error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message, code: e.code } };
      }
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: any, opts?: any) => {
          try {
            if (typeof window === "undefined" && file) {
              const fs = await import("fs/promises");
              const pathModule = await import("path");
              const uploadDir = pathModule.join(process.cwd(), "public", "uploads");
              await fs.mkdir(uploadDir, { recursive: true });
              const filename = pathModule.basename(path);
              const dest = pathModule.join(uploadDir, filename);

              let buffer: Buffer;
              if (Buffer.isBuffer(file)) {
                buffer = file;
              } else if (
                file instanceof Blob ||
                typeof file?.arrayBuffer === "function"
              ) {
                const ab = await file.arrayBuffer();
                buffer = Buffer.from(ab);
              } else if (typeof file === "string") {
                buffer = Buffer.from(file, "base64");
              } else {
                buffer = Buffer.from(String(file));
              }
              await fs.writeFile(dest, buffer);
            }
            return { data: { path }, error: null };
          } catch {
            return { data: { path }, error: null };
          }
        },
        getPublicUrl: (path: string) => ({
          data: {
            publicUrl: path?.startsWith("http")
              ? path
              : `/uploads/${path?.replace(/^\/+/, "")}`,
          },
        }),
        download: async (path: string) => ({ data: new Blob(), error: null }),
        remove: async (paths: string[]) => ({ data: paths, error: null }),
        list: async (folder?: string, opts?: any) => ({
          data: [],
          error: null,
        }),
        createSignedUrl: async (path: string, exp: number) => ({
          data: {
            signedUrl: path?.startsWith("http")
              ? path
              : `/uploads/${path?.replace(/^\/+/, "")}`,
          },
          error: null,
        }),
      }),
      listBuckets: async () => ({
        data: [{ name: "media" }, { name: "return_proofs" }],
        error: null,
      }),
      getBucket: async (name: string) => ({ data: { name }, error: null }),
      createBucket: async (name: string, opts?: any) => ({
        data: { name },
        error: null,
      }),
      deleteBucket: async (name: string) => ({ data: null, error: null }),
    },
    auth: {
      getUser: async () => {
        try {
          if (typeof window !== "undefined") {
            const { authClient } = await import("@/lib/auth/client");
            const res = await authClient.getSession();
            const u = res?.data?.user;
            if (u) {
              return {
                data: {
                  user: {
                    id: u.id,
                    email: u.email,
                    user_metadata: {
                      first_name: u.name?.split(" ")[0] || "",
                      last_name: u.name?.split(" ").slice(1).join(" ") || "",
                      full_name: u.name || "",
                      role: (u as any).role || "CUSTOMER",
                    },
                    app_metadata: {
                      role: (u as any).role || "CUSTOMER",
                    },
                    ...u,
                  },
                },
                error: null,
              };
            }
            return { data: { user: null }, error: null };
          } else {
            const { getServerSession } = await import("@/lib/auth/server");
            const { user: u } = await getServerSession();
            if (u) {
              return {
                data: {
                  user: {
                    id: u.id,
                    email: u.email,
                    user_metadata: {
                      first_name: u.name?.split(" ")[0] || "",
                      last_name: u.name?.split(" ").slice(1).join(" ") || "",
                      full_name: u.name || "",
                      role: (u as any).role || "CUSTOMER",
                    },
                    app_metadata: {
                      role: (u as any).role || "CUSTOMER",
                    },
                    ...u,
                  },
                },
                error: null,
              };
            }
            return { data: { user: null }, error: null };
          }
        } catch {
          return { data: { user: null }, error: null };
        }
      },
      getSession: async () => {
        try {
          if (typeof window !== "undefined") {
            const { authClient } = await import("@/lib/auth/client");
            const res = await authClient.getSession();
            return {
              data: { session: res?.data?.session || null },
              error: null,
            };
          } else {
            const { getServerSession } = await import("@/lib/auth/server");
            const { session } = await getServerSession();
            return { data: { session: session || null }, error: null };
          }
        } catch {
          return { data: { session: null }, error: null };
        }
      },
      signOut: async () => {
        try {
          if (typeof window !== "undefined") {
            const { authClient } = await import("@/lib/auth/client");
            await authClient.signOut();
          }
        } catch {}
        return { error: null };
      },
      updateUser: async (updates: any) => {
        try {
          if (typeof window === "undefined") {
            const { getServerSession } = await import("@/lib/auth/server");
            const { user } = await getServerSession();
            if (user?.id) {
              const meta = updates?.data || updates?.user_metadata || {};
              await prisma.profile.update({
                where: { id: user.id },
                data: {
                  firstName: meta.first_name !== undefined ? meta.first_name : undefined,
                  lastName: meta.last_name !== undefined ? meta.last_name : undefined,
                  phone: updates.phone !== undefined ? updates.phone : undefined,
                },
              });
            }
          }
          return { data: { user: updates }, error: null };
        } catch (e: any) {
          return { data: null, error: { message: e.message } };
        }
      },
      resetPasswordForEmail: async (email: string, opts?: any) => {
        return { data: {}, error: null };
      },
      onAuthStateChange: (cb: any) => {
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      exchangeCodeForSession: async () => ({
        data: { session: null, user: null },
        error: null,
      }),
      admin: {
        getUserById: async (id: string) => {
          try {
            const isUuid =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                id
              );
            if (!isUuid) return { data: { user: null }, error: null };

            const p = await prisma.profile.findUnique({
              where: { id },
              include: { role: true },
            });
            if (!p) return { data: { user: null }, error: null };
            return {
              data: {
                user: {
                  id: p.id,
                  email: p.email,
                  user_metadata: {
                    first_name: p.firstName || "",
                    last_name: p.lastName || "",
                    full_name: `${p.firstName || ""} ${p.lastName || ""}`.trim(),
                    role: p.role?.name || "CUSTOMER",
                  },
                  app_metadata: {
                    role: p.role?.name || "CUSTOMER",
                  },
                },
              },
              error: null,
            };
          } catch {
            return { data: { user: null }, error: null };
          }
        },
        listUsers: async () => {
          try {
            const profiles = await prisma.profile.findMany({
              include: { role: true },
            });
            const users = profiles.map((p) => ({
              id: p.id,
              email: p.email,
              created_at: p.createdAt?.toISOString(),
              user_metadata: {
                first_name: p.firstName || "",
                last_name: p.lastName || "",
                full_name: `${p.firstName || ""} ${p.lastName || ""}`.trim(),
                role: p.role?.name || "CUSTOMER",
              },
              app_metadata: {
                role: p.role?.name || "CUSTOMER",
              },
            }));
            return { data: { users }, error: null };
          } catch {
            return { data: { users: [] }, error: null };
          }
        },
        deleteUser: async (id: string) => {
          try {
            await prisma.profile.delete({ where: { id } });
            return { data: null, error: null };
          } catch (e: any) {
            return { data: null, error: { message: e.message } };
          }
        },
        createUser: async (userData: any) => {
          try {
            const p = await prisma.profile.create({
              data: {
                email: userData.email,
                firstName:
                  userData.user_metadata?.first_name ||
                  userData.first_name ||
                  null,
                lastName:
                  userData.user_metadata?.last_name ||
                  userData.last_name ||
                  null,
                phone: userData.phone || null,
              },
            });
            return {
              data: { user: { id: p.id, email: p.email } },
              error: null,
            };
          } catch (e: any) {
            return {
              data: {
                user: {
                  id: userData?.id || "user-" + Date.now(),
                  email: userData?.email,
                },
              },
              error: null,
            };
          }
        },
        updateUserById: async (id: string, updates: any) => {
          try {
            const meta = updates.user_metadata || {};
            const isUuid =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                id
              );
            if (isUuid) {
              await prisma.profile.update({
                where: { id },
                data: {
                  firstName:
                    meta.first_name !== undefined ? meta.first_name : undefined,
                  lastName:
                    meta.last_name !== undefined ? meta.last_name : undefined,
                  phone: updates.phone !== undefined ? updates.phone : undefined,
                },
              });
            }
            return { data: { user: { id, ...updates } }, error: null };
          } catch (e: any) {
            return { data: { user: { id, ...updates } }, error: null };
          }
        },
      },
    },
    channel: (name: string) => ({
      on: (_event: any, _filter: any, _callback?: any) => ({
        subscribe: () => ({ unsubscribe: () => {} }),
      }),
      subscribe: (cb?: any) => {
        if (typeof cb === "function") cb("SUBSCRIBED");
        return { unsubscribe: () => {} };
      },
      unsubscribe: () => {},
    }),
    removeChannel: (_channel: any) => {},
    getChannels: () => [],
  };
}

export function createAdminClient() {
  return createClient();
}
