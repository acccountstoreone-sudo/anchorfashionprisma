import { getServerSession, resolveUserRole } from "@/lib/auth/server";
import {
  ADMIN_ROLES,
  MANAGER_ROLES,
  MARKETING_ROLES,
  STAFF_ROLES,
} from "@/lib/constants/auth";

const normalizeRoleName = (r: string) => String(r).replace(/[\s_-]+/g, "").toUpperCase();

/** Compares roles ignoring case and space/underscore/hyphen differences. */
function roleIn(role: string, allowed: readonly string[]): boolean {
  const n = normalizeRoleName(role);
  return allowed.some((a) => normalizeRoleName(a) === n);
}

export async function getRoleForUser(user: any): Promise<string> {
  if (!user) return "CUSTOMER";
  // Single source of truth: resolveUserRole enforces that an elevated role is only
  // granted to an identity bound to the profile (or with a verified email).
  const role = await resolveUserRole({
    id: user.id,
    email: user.email,
    role: user.role || user.app_metadata?.role,
    emailVerified: user.emailVerified,
  });
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

  if (!roleIn(role, STAFF_ROLES)) {
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

/** Any signed-in user (customers included). Throws when there is no valid session. */
export async function verifyAuthenticated() {
  const { user } = await getServerSession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

/** Manager-level roles and above. */
export async function verifyManager() {
  const { user } = await getServerSession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const role = await getRoleForUser(user);

  if (!roleIn(role, MANAGER_ROLES)) {
    throw new Error("Forbidden: Manager access required");
  }

  return user;
}

/**
 * Authorizes the caller as the owner of `ownerId` OR as staff.
 * Prevents IDOR where a client-supplied user id is trusted.
 */
export async function verifySelfOrStaff(ownerId: string | null | undefined) {
  const { user } = await getServerSession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (ownerId && user.id === ownerId) {
    return user;
  }

  const role = await getRoleForUser(user);
  if (!roleIn(role, STAFF_ROLES)) {
    throw new Error("Forbidden");
  }

  return user;
}

/** Non-throwing variant for route handlers: returns the user or null. */
export async function getStaffUserOrNull() {
  try {
    return await verifyStaff();
  } catch {
    return null;
  }
}

