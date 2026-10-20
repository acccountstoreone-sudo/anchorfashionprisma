"use server";

import { getServerSession, resolveUserRole } from "@/lib/auth/server";
import { ADMIN_ROLES, STAFF_ROLES } from "@/lib/constants/auth";

export async function getPostLoginRedirectAction(
  nextUrl?: string | null,
  clientUser?: any
): Promise<{ redirectUrl: string; role: string }> {
  try {
    const { user: serverUser } = await getServerSession();
    const user = serverUser || clientUser;

    if (!user) {
      return {
        redirectUrl:
          nextUrl && !nextUrl.startsWith("/auth/") ? nextUrl : "/account/profile",
        role: "CUSTOMER",
      };
    }

    const role = await resolveUserRole(user);

    const isSuperOrAdmin = ADMIN_ROLES.includes(role);
    if (isSuperOrAdmin) {
      if (nextUrl && (nextUrl.startsWith("/admin") || nextUrl.startsWith("/manager"))) {
        return { redirectUrl: nextUrl, role };
      }
      return { redirectUrl: "/admin", role };
    }

    const isStaffOrAdmin = STAFF_ROLES.includes(role);
    if (isStaffOrAdmin) {
      if (nextUrl && nextUrl.startsWith("/manager")) {
        return { redirectUrl: nextUrl, role };
      }
      return { redirectUrl: "/manager", role };
    }

    // Customer
    if (
      nextUrl &&
      !nextUrl.startsWith("/admin") &&
      !nextUrl.startsWith("/auth/")
    ) {
      return { redirectUrl: nextUrl, role };
    }

    return { redirectUrl: "/account/profile", role };
  } catch (error) {
    console.error("[getPostLoginRedirectAction] Error:", error);
    return {
      redirectUrl: nextUrl || "/account/profile",
      role: "CUSTOMER",
    };
  }
}
