import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ADMIN_ROLES, MANAGER_ROLES, MARKETING_ROLES, STAFF_ROLES } from "@/lib/constants/auth";

function applyCookies(res: NextResponse, sourceResponse: NextResponse): NextResponse {
  sourceResponse.cookies.getAll().forEach((c) => {
    res.cookies.set(c);
  });
  return res;
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Update the session to ensure cookies are refreshed.
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // CSP: Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://*.supabase.co"} https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  // Apply Security Headers to every response
  supabaseResponse.headers.set("Content-Security-Policy", cspHeader);
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );
  supabaseResponse.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // API Gateway Logic for External API Routes
  if (pathname.startsWith("/api/v1/")) {
    const apiKey = request.headers.get("x-api-key");
    if (!pathname.startsWith("/api/v1/webhooks/")) {
      if (!apiKey) {
        return NextResponse.json(
          { error: "Unauthorized: Missing API Key" },
          { status: 401 }
        );
      }
    }
    supabaseResponse.headers.set("X-RateLimit-Limit", "100");
    supabaseResponse.headers.set("X-RateLimit-Remaining", "99");
    return supabaseResponse;
  }

  // Protect Auth Routes
  const isAuthRoute =
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/register") ||
    pathname.startsWith("/auth/forgot-password") ||
    pathname.startsWith("/auth/reset-password");

  if (user && isAuthRoute) {
    const next = request.nextUrl.searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("/auth/")) {
      return applyCookies(NextResponse.redirect(new URL(next, request.url)), supabaseResponse);
    }

    let currentRole = user?.user_metadata?.role || user?.app_metadata?.role || "";
    
    // Quick role fetch if missing
    if (!currentRole) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role_id, roles(name)")
          .eq("id", user.id)
          .single();
        currentRole = (profile?.roles as any)?.name || "CUSTOMER";
      } catch {
        currentRole = "CUSTOMER";
      }
    }
    
    if (ADMIN_ROLES.includes(currentRole)) {
      return applyCookies(NextResponse.redirect(new URL("/admin", request.url)), supabaseResponse);
    } else if (MANAGER_ROLES.includes(currentRole)) {
      return applyCookies(NextResponse.redirect(new URL("/manager", request.url)), supabaseResponse);
    } else if (MARKETING_ROLES.includes(currentRole)) {
      return applyCookies(NextResponse.redirect(new URL("/admin/marketing", request.url)), supabaseResponse);
    } else if (STAFF_ROLES.includes(currentRole)) {
      return applyCookies(NextResponse.redirect(new URL("/admin", request.url)), supabaseResponse);
    } else {
      return applyCookies(NextResponse.redirect(new URL("/account/profile", request.url)), supabaseResponse);
    }
  }

  // Protect Internal and Customer Routes
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/manager") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/cms") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/customer");

  // Public API endpoints that must allow unauthenticated access (auth, webhooks, storefront, cron, health, payments, shipping)
  const isPublicApiRoute =
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/store/") ||
    pathname.startsWith("/api/shipping/") ||
    pathname.startsWith("/api/payment/") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/public/") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/v1/");

  // Protect internal/administrative API Routes
  const isInternalApiRoute = pathname.startsWith("/api/") && !isPublicApiRoute;
  
  if (!user && (isProtectedRoute || isInternalApiRoute)) {
    if (isInternalApiRoute) {
       return applyCookies(NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 }), supabaseResponse);
    }
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return applyCookies(NextResponse.redirect(redirectUrl), supabaseResponse);
  }

  // Role resolution
  let role = user?.user_metadata?.role || user?.app_metadata?.role || "";

  if (user && !role) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role_id, roles(name)")
        .eq("id", user.id)
        .single();
      role = (profile?.roles as any)?.name || "CUSTOMER";
    } catch {
      role = "CUSTOMER";
    }
  }

  if (!role) role = "CUSTOMER";

  // Restrict Admin users from customer-only operations / user pages:
  // "admin shudhu admin ei access korba user hisaba ba user er kaj jate admin na korta para"
  const isCustomerAccountPath =
    pathname.startsWith("/account") ||
    pathname.startsWith("/customer") ||
    pathname.startsWith("/checkout");

  if (user && ADMIN_ROLES.includes(role) && isCustomerAccountPath) {
    if (pathname.startsWith("/api/")) {
      return applyCookies(
        NextResponse.json({ error: "Forbidden: Admin accounts cannot perform customer operations" }, { status: 403 }),
        supabaseResponse
      );
    }
    return applyCookies(
      NextResponse.redirect(new URL("/admin", request.url)),
      supabaseResponse
    );
  }

  // Restricted Admin-only subroutes (sensitive financial, user management, and system settings)
  const isAdminRestrictedPath =
    pathname.startsWith("/admin/finance") ||
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/settings") ||
    pathname.startsWith("/admin/operations") ||
    pathname.startsWith("/admin/inventory") ||
    pathname.startsWith("/admin/security") ||
    pathname.startsWith("/api/admin/finance") ||
    pathname.startsWith("/api/admin/users") ||
    pathname.startsWith("/api/admin/settings");

  // Role-Based Route Protection for Admin Routes (including API)
  if (user && (pathname.startsWith("/admin") || pathname.startsWith("/api/admin"))) {
    // Check if path is strictly restricted to SUPERADMIN / ADMIN
    if (isAdminRestrictedPath && !ADMIN_ROLES.includes(role)) {
      if (pathname.startsWith("/api/")) {
        return applyCookies(NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 }), supabaseResponse);
      }
      if (MARKETING_ROLES.includes(role)) {
        return applyCookies(NextResponse.redirect(new URL("/admin/marketing", request.url)), supabaseResponse);
      }
      return applyCookies(NextResponse.redirect(new URL("/account/profile", request.url)), supabaseResponse);
    }

    // For all other /admin routes, user must have a staff role
    if (!STAFF_ROLES.includes(role)) {
      if (pathname.startsWith("/api/")) {
        return applyCookies(NextResponse.json({ error: "Forbidden" }, { status: 403 }), supabaseResponse);
      }
      return applyCookies(NextResponse.redirect(new URL("/account/profile", request.url)), supabaseResponse);
    }
  }

  // Role-Based Route Protection for Manager Routes (including API)
  const isManagerPath =
    pathname.startsWith("/manager") ||
    pathname.startsWith("/cms") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/api/manager") ||
    pathname.startsWith("/api/cms");

  if (user && isManagerPath) {
    if (!MANAGER_ROLES.includes(role) && !STAFF_ROLES.includes(role)) {
      if (pathname.startsWith("/api/")) {
        return applyCookies(NextResponse.json({ error: "Forbidden" }, { status: 403 }), supabaseResponse);
      }
      return applyCookies(NextResponse.redirect(new URL("/account/profile", request.url)), supabaseResponse);
    }
  }

  return supabaseResponse;
}


export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
