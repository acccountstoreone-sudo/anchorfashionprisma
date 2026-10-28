import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { cookies } from "next/headers";
import { CartService } from "@/lib/services/cart.service";
import { STAFF_ROLES } from "@/lib/constants/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const rawNext = searchParams.get("next") ?? "/account/profile";
  const next = rawNext === "/reset-password" ? "/auth/reset-password" : rawNext;

  // Check if error params are in the query string
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDesc = searchParams.get("error_description");

  if (errorParam || errorCode || errorDesc) {
    const errParams = new URLSearchParams();
    if (errorParam) errParams.set("error", errorParam);
    if (errorCode) errParams.set("error_code", errorCode);
    if (errorDesc) errParams.set("error_description", errorDesc);
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?${errParams.toString()}`
    );
  }

  try {
    const { user } = await getServerSession();

    if (user) {
      try {
        const cookieStore = await cookies();
        const guestSessionId = cookieStore.get("af_guest_session")?.value;
        if (guestSessionId) {
          await CartService.mergeGuestCart(guestSessionId, user.id);
          cookieStore.delete("af_guest_session");
        }
      } catch (mergeErr) {
        console.error("Cart merge error in auth callback:", mergeErr);
      }

      const role = String((user as any)?.role || "").toUpperCase();
      const isStaffOrAdmin =
        (STAFF_ROLES as readonly string[]).includes(role) ||
        [
          "SUPERADMIN",
          "SUPER_ADMIN",
          "ADMIN",
          "STAFF",
          "MANAGER",
          "WAREHOUSE_MANAGER",
          "MARKETING_MANAGER",
          "FINANCE_MANAGER",
          "MARKETING",
          "SUPPORT",
        ].includes(role);

      let target = next;
      if (isStaffOrAdmin && (!rawNext || rawNext === "/account/profile")) {
        target = "/admin";
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalhost = process.env.NODE_ENV === "development";
      if (isLocalhost) {
        return NextResponse.redirect(`${origin}${target}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${target}`);
      } else {
        return NextResponse.redirect(`${origin}${target}`);
      }
    }
  } catch (err) {
    console.error("Auth callback session verification error:", err);
  }

  // If no active session was resolved, redirect to next or login
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalhost = process.env.NODE_ENV === "development";
  const finalDest = next || "/auth/login";

  if (isLocalhost) {
    return NextResponse.redirect(`${origin}${finalDest}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${finalDest}`);
  } else {
    return NextResponse.redirect(`${origin}${finalDest}`);
  }
}
