import { getServerSession } from "@/lib/auth/server";
import { AUTH_ROLES, ADMIN_ROLES, MARKETING_ROLES, STAFF_ROLES } from "@/lib/constants/auth";

export async function getRoleForUser(user: any): Promise<string> {
  if (!user) return "CUSTOMER";
  let role = user.role || user.user_metadata?.role || user.app_metadata?.role;
  if (!role || String(role).toUpperCase() === "CUSTOMER") {
    try {
      const { prisma } = await import("@/lib/prisma");
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
        role = profile.role.name;
      }
    } catch {
      role = "CUSTOMER";
    }
  }
  return String(role || "CUSTOMER").toUpperCase();
}

export async function isStaffOrManager(user: any): Promise<boolean> {
  const role = await getRoleForUser(user);
  return (
    (ADMIN_ROLES as readonly string[]).includes(role) ||
    (STAFF_ROLES as readonly string[]).includes(role) ||
    [
      "SUPERADMIN",
      "SUPER_ADMIN",
      "ADMIN",
      "MANAGER",
      "WAREHOUSE_MANAGER",
      "MARKETING_MANAGER",
      "FINANCE_MANAGER",
      "STAFF",
      "SUPPORT",
    ].includes(role)
  );
}

export async function verifySuperAdmin() {
  const { user } = await getServerSession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const role = await getRoleForUser(user);
  const normalizedRole = role.replace(/[\s_-]+/g, "").toUpperCase();
  
  if (!["SUPERADMIN", "ADMIN"].includes(normalizedRole)) {
    throw new Error("Forbidden: Administrator access required");
  }

  return user;
}

export async function verifyAdmin() {
  const { user } = await getServerSession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const role = await getRoleForUser(user);
  const normalizedRole = role.replace(/[\s_-]+/g, "").toUpperCase();
  
  if (!["SUPERADMIN", "ADMIN"].includes(normalizedRole)) {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

export async function verifyMarketing() {
  const { user } = await getServerSession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const role = await getRoleForUser(user);
  
  if (!(MARKETING_ROLES as readonly string[]).includes(role)) {
    throw new Error("Forbidden: Marketing access required");
  }

  return user;
}

export async function verifyStaff() {
  const { user } = await getServerSession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const role = await getRoleForUser(user);
  
  if (!(STAFF_ROLES as readonly string[]).includes(role)) {
    throw new Error("Forbidden: Staff access required");
  }

  return user;
}

export async function verifyStaffOrManager() {
  const { user } = await getServerSession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const role = await getRoleForUser(user);
  const normalizedRole = role.replace(/[\s_-]+/g, "").toUpperCase();

  const allowedRoles = [
    "SUPERADMIN",
    "SUPER_ADMIN",
    "ADMIN",
    "MANAGER",
    "WAREHOUSE_MANAGER",
    "MARKETING_MANAGER",
    "FINANCE_MANAGER",
    "STAFF",
    "SUPPORT",
  ];

  if (!allowedRoles.includes(normalizedRole)) {
    throw new Error("Forbidden: Management or staff access required");
  }

  return user;
}

