# Anchor Fashion - Database Architecture Guide

This guide details the implementation and usage of the Enterprise Database Layer.

## 1. Database Clients

We export specialized clients from `lib/supabase/` to ensure security and proper context:

- `createClient()` (Browser): Use only in React Client Components (`"use client"`).
- `createClient()` (Server): Use in Server Components, Server Actions, Route Handlers.
- `createAdminClient()`: Use strictly in secure backends when you must bypass RLS.
- `createMiddlewareClient()`: Used exclusively inside `middleware.ts`.

## 2. Repositories

The Repository pattern (`database/repositories/`) decouples business logic from Supabase syntax.

- Extend `CrudRepository` for standard tables.
- Use `applyPagination` and `applySorting` from `database/utils/repository-helpers.ts` for listing endpoints.

## 3. Server Actions (Safe Actions)

Use wrappers from `lib/actions/safe-action.ts` to build Server Actions.
These automatically:

1. Validate input via Zod.
2. Check Auth state (for Protected/Admin actions).
3. Catch and format errors properly without crashing the UI.

```typescript
// Example Action
const updateProfile = createProtectedAction(
  ProfileUpdateSchema,
  async (input, ctx) => {
    // ctx.user is guaranteed to exist
    const repo = new ProfileRepository();
    return await repo.update(ctx.user.id, input);
  }
);
```

## 4. Error Handling

Never throw raw Supabase errors to the frontend.
Wrap calls using `handlePostgresError(error)` from `database/utils/error-handler.ts` which returns a standardized `DatabaseError`.

## 5. Caching Strategy

- We use TanStack Query.
- Keys are centralized in `lib/cache/query-keys.ts` to prevent typos.
- Use `invalidateEntityCache` in mutation callbacks.

## 6. Audit Logging

For sensitive operations (financial, user modifications), use `AuditLogger.log({...})` from `lib/logger/audit-logger.ts`. It writes non-blocking logs via the Admin client to the `audit_logs` table.
