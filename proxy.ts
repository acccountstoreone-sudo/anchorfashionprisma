import { auth } from "@/lib/auth/server";

export const proxy = auth.middleware({ loginUrl: "/auth/sign-in" });

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
