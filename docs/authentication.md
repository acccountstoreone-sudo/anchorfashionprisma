# Authentication & Authorization Architecture

This document outlines the authentication, session management, and role-based access control (RBAC) flow for the Anchor Fashion enterprise application.

## 1. Authentication Flow

The authentication system is built on **Supabase Auth** combined with **Next.js App Router Server Actions** to provide a secure, server-side rendered authentication mechanism.

1. **User Sign Up / Sign In**:
   - Users interact with the forms at `/login` or `/register`.
   - The form components (e.g. `login-form.tsx`) use `react-hook-form` and `zod` for client-side validation.
   - Upon submission, a Next.js Server Action (`loginAction` or `registerAction` in `features/auth/actions/auth.actions.ts`) is invoked.
2. **Server-Side Authentication**:
   - The Server Action uses the Supabase server client (`lib/supabase/server.ts`) to securely communicate with the Supabase API.
   - Supabase authenticates the credentials and sets an HTTP-only secure cookie containing the JWT session tokens on the response.
3. **Redirection**:
   - Upon successful authentication, the server action revalidates the necessary paths and redirects the user to the `/dashboard`.
   - The `middleware.ts` intercepts this redirect. If the user attempts to access `/login` while already authenticated, they are automatically routed back to `/dashboard`.

## 2. Session Flow

Maintaining the session across the Next.js server and client environments is critical for consistent state management.

1. **Cookie Management**:
   - Supabase issues an Access Token and a Refresh Token stored in HTTP-only cookies.
   - The Next.js middleware (`middleware.ts`) invokes `updateSession(request)` on every route transition.
2. **Session Refresh via Middleware**:
   - Inside `lib/supabase/middleware.ts`, `supabase.auth.getUser()` is called. This triggers an automatic token refresh if the current Access Token has expired but the Refresh Token is still valid.
   - The middleware then writes the updated cookies back to the `NextResponse`, ensuring the browser receives the fresh tokens.
3. **Persistent Login**:
   - Because the session is cookie-based and automatically refreshed via middleware, the user remains logged in across browser sessions and tabs until they explicitly sign out or their refresh token expires (typically 30+ days).

## 3. Role Flow (RBAC)

Anchor Fashion implements Role-Based Access Control using metadata embedded inside the Supabase User object.

1. **Role Definition**:
   - User roles (`SUPERADMIN`, `ADMIN`, `MANAGER`, `WAREHOUSE_MANAGER`, `MARKETING_MANAGER`, `FINANCE_MANAGER`, `STAFF`, `CUSTOMER`) are stored in `user.user_metadata.role` or `user.app_metadata.role`.
2. **Route Protection & Interception**:
   - `middleware.ts` checks the `pathname` of every request.
   - **Internal/Protected Routes** (`/dashboard`, `/profile`, `/orders`, `/inventory`, `/crm`, `/cms`): Require the user to be authenticated. Unauthenticated users are redirected to `/login?next=[path]`.
   - **Admin Routes** (`/admin/*`): Strictly require the role to be `SUPERADMIN` or `ADMIN`.
   - **Manager Routes** (`/manager/*`, `/cms/*`, `/crm/*`, `/inventory/*`): Require the user to possess a valid manager-level role or higher.
3. **Role Enforcement**:
   - If an authenticated user attempts to access a route they lack permissions for (e.g., a `CUSTOMER` trying to access `/admin`), the middleware gracefully deflects them back to `/dashboard`.
   - This prevents unauthorized components or data fetches from ever executing on the server.
