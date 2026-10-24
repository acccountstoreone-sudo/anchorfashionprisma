import { cache } from "react";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { prisma } from "@/lib/prisma";

const isProduction = process.env.NODE_ENV === "production";
const authCookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;

// Safe fallbacks to prevent runtime crashes if env vars are missing on host
const effectiveAuthBaseUrl =
  authBaseUrl ||
  "https://ep-autumn-cake-b45phh1c.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth";
const effectiveAuthCookieSecret =
  authCookieSecret ||
  "xmByXFMSm9OtrGDUDl1fm3Roi308TkGFE+/b8qRDd9c=";

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
 */
export const resolveUserRole = cache(
  async (user: { id?: string | null; email?: string | null; role?: string | null }): Promise<string> => {
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
            select: { role: { select: { name: true } } },
          })
        : isUuid
        ? await prisma.profile.findUnique({
            where: { id: user.id! },
            select: { role: { select: { name: true } } },
          })
        : null;

      if (profile?.role?.name) {
        role = profile.role.name.toUpperCase().trim();
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
