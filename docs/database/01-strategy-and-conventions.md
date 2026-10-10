# Enterprise Database Strategy & Conventions

## 1. Migration Strategy

- We use Supabase CLI to generate and apply migrations.
- Migrations must be numbered chronologically (e.g., `YYYYMMDDHHMMSS_name.sql`).
- All structural changes (tables, views, functions, triggers, policies) MUST be tracked in migrations.
- **NEVER** modify production schema directly via UI.
- Local development requires running `supabase start` and `supabase db push`.

## 2. Seed Strategy

- `supabase/seed.sql` handles local testing data.
- The seed script should insert minimal required roles and configuration options.
- Maintain separate environments: local seed is allowed to have mock users, but production seed (if any) should strictly be static taxonomy/lookup data.

## 3. Database Versioning

- DB Schema matches API versioning indirectly.
- Non-breaking changes: Adding columns, new tables.
- Breaking changes: Renaming/dropping columns requires multi-step deployment (add new, backfill, migrate reads/writes, drop old).

## 4. Naming Conventions

- **Tables**: `snake_case`, singular form for entity (e.g., `user`, `order`, not `users`, `orders`).
- **Columns**: `snake_case`. Primary keys are typically `id`. Foreign keys are `[entity]_id`.
- **Functions/Triggers**: `snake_case` with verb prefix (e.g., `update_updated_at_column()`).
- **Indexes**: `idx_[table]_[columns]` (e.g., `idx_user_email`).
- **Timestamps**: All tables MUST include `created_at` and `updated_at` (TIMESTAMPTZ).
