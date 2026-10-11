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
