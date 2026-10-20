import { auth } from "@/lib/auth/server";
import { type NextRequest } from "next/server";

const authHandler = auth.middleware({ loginUrl: "/auth/login" });

export async function proxy(request: NextRequest) {
  const response = await authHandler(request);

  // Apply enterprise security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export default proxy;

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/manager/:path*", "/dashboard/:path*"],
};
