"use server";

import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/constants/auth";

export async function getPostLoginRedirectAction(
  nextUrl?: string | null
): Promise<{ redirectUrl: string; role: string }> {
  try {
    const session = await auth.getSession({
      headers: await headers(),
    });
    const user = session?.user;

    if (!user) {
      return {
        redirectUrl:
          nextUrl && !nextUrl.startsWith("/auth/") ? nextUrl : "/account/profile",
        role: "CUSTOMER",
      };
    }

    let role = String((user as any).role || "").toUpperCase();

    // Check DB profile if role is missing or default
    if (!role || role === "CUSTOMER") {
      try {
        const isUuid =
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
        }
      } catch (dbErr) {
        console.error(
          "[getPostLoginRedirectAction] Error fetching profile role:",
          dbErr
        );
      }
    }

    if (!role) {
      role = "CUSTOMER";
    }

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

    if (isStaffOrAdmin) {
      if (nextUrl && nextUrl.startsWith("/admin")) {
        return { redirectUrl: nextUrl, role };
      }
      return { redirectUrl: "/admin", role };
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
