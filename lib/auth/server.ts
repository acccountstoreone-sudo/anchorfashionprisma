import { cache } from "react";
import { randomBytes } from "crypto";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { prisma } from "@/lib/prisma";

const isProduction = process.env.NODE_ENV === "production";
// `next build` evaluates server modules without runtime secrets; only enforce at runtime.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const authCookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;

/**
 * SECURITY: never ship a hardcoded session secret / auth endpoint.
 * - Production runtime: both values MUST come from the environment.
 * - Development / build: an ephemeral random secret is generated per process.
 */
if (isProduction && !isBuildPhase) {
  if (!authBaseUrl) {
    throw new Error("NEON_AUTH_BASE_URL must be set in production.");
  }
  if (!authCookieSecret || authCookieSecret.length < 32) {
    throw new Error(
      "NEON_AUTH_COOKIE_SECRET must be set (min 32 characters) in production."
    );
  }
}

const effectiveAuthBaseUrl = authBaseUrl || "http://localhost:0/auth-not-configured";
const effectiveAuthCookieSecret =
  authCookieSecret && authCookieSecret.length >= 32
    ? authCookieSecret
    : randomBytes(32).toString("base64");

export const auth = createNeonAuth({
  baseUrl: effectiveAuthBaseUrl,
  cookies: {
    secret: effectiveAuthCookieSecret,
  },
});

export interface NeonAuthSessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string | null;
  [key: string]: any;
}

/**
 * Deduplicated and indexed role resolution.
 * If user.role is already an elevated role, skips DB query completely.
 * Uses point-lookup by unique email / id.
 *
 * SECURITY: the profile is looked up by email, and sign-up is open. An elevated
 * (non-customer) role is therefore only honored when the profile row is bound to
 * this auth user's id (ids cannot be chosen at sign-up) OR the auth email has been
 * verified. Otherwise anyone could register a staff member's email address and
 * inherit that profile's role.
 */
export const resolveUserRole = cache(
  async (user: {
    id?: string | null;
    email?: string | null;
    role?: string | null;
    emailVerified?: boolean | null;
  }): Promise<string> => {
    if (!user) return "CUSTOMER";
    let role = String(user.role || "").toUpperCase().trim();

    // If role is already known and elevated, return immediately
    if (role && role !== "USER" && role !== "CUSTOMER") {
      return role;
    }

    try {
      const email = user.email ? user.email.toLowerCase().trim() : undefined;
      const isUuid =
        user.id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);

      // Fast single-key index lookup (findUnique instead of findFirst with OR)
      const profile = email
        ? await prisma.profile.findUnique({
            where: { email },
            select: { id: true, role: { select: { name: true } } },
          })
        : isUuid
        ? await prisma.profile.findUnique({
            where: { id: user.id! },
            select: { id: true, role: { select: { name: true } } },
          })
        : null;

      if (profile?.role?.name) {
        const resolved = profile.role.name.toUpperCase().trim();
        const isElevated = resolved !== "CUSTOMER" && resolved !== "USER";
        const identityBound =
          (!!user.id && profile.id === user.id) || user.emailVerified === true;

        if (isElevated && !identityBound) {
          console.warn(
            "[resolveUserRole] Elevated role withheld: profile is not bound to this auth user and the email is unverified."
          );
          role = "CUSTOMER";
        } else {
          role = resolved;
        }
      } else {
        role = "CUSTOMER";
      }
    } catch (err) {
      console.error("[resolveUserRole] Error fetching profile role:", err);
      if (!role || role === "USER") role = "CUSTOMER";
    }

    return role || "CUSTOMER";
  }
);

/**
 * Deduplicated session fetch within a single request.
 * Wrapped in React.cache to avoid repeating HTTP calls and DB lookups across layout and page.
 */
export const getServerSession = cache(
  async (): Promise<{
    user: NeonAuthSessionUser | null;
    session: any | null;
  }> => {
    try {
      const res = await auth.getSession();
      const data = (res as any)?.data ?? res;
      const user = data?.user ?? null;
      const session = data?.session ?? null;

      if (user) {
        const resolvedRole = await resolveUserRole(user);
        return {
          user: {
            ...user,
            role: resolvedRole,
          },
          session,
        };
      }

      return { user: null, session: null };
    } catch (err) {
      console.error("[getServerSession] Error fetching auth session:", err);
      return { user: null, session: null };
    }
  }
);
