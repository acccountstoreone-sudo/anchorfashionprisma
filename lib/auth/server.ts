import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl:
    process.env.NEON_AUTH_BASE_URL ||
    "https://ep-autumn-cake-b45phh1c.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth",
  cookies: {
    secret:
      process.env.NEON_AUTH_COOKIE_SECRET ||
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

export async function getServerSession(): Promise<{
  user: NeonAuthSessionUser | null;
  session: any | null;
}> {
  try {
    const res = await auth.getSession();
    const data = (res as any)?.data ?? res;
    const user = data?.user ?? null;
    const session = data?.session ?? null;
    return { user, session };
  } catch (err) {
    console.error("[getServerSession] Error fetching auth session:", err);
    return { user: null, session: null };
  }
}
