import { createClient } from "@/lib/supabase/server";
import { AUTH_ROLES, ADMIN_ROLES, MARKETING_ROLES, STAFF_ROLES } from "@/lib/constants/auth";

async function getRoleForUser(supabase: any, user: any): Promise<string> {
  let role = user.user_metadata?.role || user.app_metadata?.role || user.role;
  if (!role || String(role).toUpperCase() === "CUSTOMER") {
    try {
      const { prisma } = await import("@/lib/prisma");
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
        role = profile.role.name;
      }
    } catch {
      role = "CUSTOMER";
    }
  }
  return String(role || "CUSTOMER").toUpperCase();
}

export async function verifySuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const role = await getRoleForUser(supabase, user);
  
  if (!(ADMIN_ROLES as readonly string[]).includes(role)) {
    throw new Error("Forbidden: Administrator access required");
  }

  return user;
}

export async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const role = await getRoleForUser(supabase, user);
  
  if (!(ADMIN_ROLES as readonly string[]).includes(role)) {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

export async function verifyMarketing() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const role = await getRoleForUser(supabase, user);
  
  if (!(MARKETING_ROLES as readonly string[]).includes(role)) {
    throw new Error("Forbidden: Marketing access required");
  }

  return user;
}

export async function verifyStaff() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const role = await getRoleForUser(supabase, user);
  
  if (!(STAFF_ROLES as readonly string[]).includes(role)) {
    throw new Error("Forbidden: Staff access required");
  }

  return user;
}

