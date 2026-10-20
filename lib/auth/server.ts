import { createNeonAuth } from "@neondatabase/auth/next/server";
import { prisma } from "@/lib/prisma";

const isProduction = process.env.NODE_ENV === "production";
const authCookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;

if (isProduction && !authCookieSecret) {
  throw new Error(
    "[FATAL SECURITY] NEON_AUTH_COOKIE_SECRET is required in production. Please set it in your environment variables to prevent session forgery."
  );
}

if (isProduction && !authBaseUrl) {
  throw new Error(
    "[FATAL SECURITY] NEON_AUTH_BASE_URL is required in production. Please set it in your environment variables."
  );
}

export const auth = createNeonAuth({
  baseUrl:
    authBaseUrl ||
    "https://ep-autumn-cake-b45phh1c.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth",
  cookies: {
    secret:
      authCookieSecret ||
      "xmByXFMSm9OtrGDUDl1fm3Roi308TkGFE+/b8qRDd9c=",
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

export async function resolveUserRole(user: { id?: string | null; email?: string | null; role?: string | null }): Promise<string> {
  if (!user) return "CUSTOMER";
  let role = String(user.role || "").toUpperCase();

  // If role is missing, "USER", or "CUSTOMER", always check DB profile to get the authoritative role
  if (!role || role === "USER" || role === "CUSTOMER") {
    try {
      const isUuid =
        user.id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          user.id
        );
      const profile = await prisma.profile.findFirst({
        where: {
          OR: [
            ...(isUuid ? [{ id: user.id }] : []),
            ...(user.email ? [{ email: user.email }] : []),
          ],
        },
        include: { role: true },
      });

      if (profile?.role?.name) {
        role = profile.role.name.toUpperCase();
      } else {
        role = "CUSTOMER";
      }
    } catch (err) {
      console.error("[resolveUserRole] Error fetching profile role:", err);
      if (!role || role === "USER") role = "CUSTOMER";
    }
  }

  return role || "CUSTOMER";
}

export async function getServerSession(): Promise<{
  user: NeonAuthSessionUser | null;
  session: any | null;
}> {
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
