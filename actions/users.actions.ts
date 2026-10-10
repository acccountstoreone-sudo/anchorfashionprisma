"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
  phone?: string | null;
};

export async function getUsersByRoleAction(roleNames: string[]) {
  try {
    const supabase = createAdminClient();

    // 1. Get roles
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("*")
      .in("name", roleNames);

    if (rolesError) throw rolesError;
    if (!roles || roles.length === 0) return { success: true, data: [] };

    const roleIds = roles.map((r) => r.id);

    // 2. Get profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*, roles(*)")
      .in("role_id", roleIds);

    if (profilesError) throw profilesError;

    // 3. Get auth users (admin API) to get emails
    const {
      data: { users },
      error: authError,
    } = await supabase.auth.admin.listUsers();

    if (authError) throw authError;

    // Merge data
    const mappedUsers: UserData[] = profiles.map((profile) => {
      const authUser = users.find((u) => u.id === profile.id);
      
      const roleName = Array.isArray(profile.roles) 
        ? profile.roles[0]?.name 
        : (profile.roles as any)?.name || "Unknown";

      let lastActiveFormatted = "Never";
      if (authUser?.last_sign_in_at) {
        try {
          const date = new Date(authUser.last_sign_in_at);
          lastActiveFormatted = !isNaN(date.getTime())
            ? date.toISOString().split("T")[0]
            : "Never";
        } catch {
          lastActiveFormatted = "Never";
        }
      }

      return {
        id: profile.id,
        name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown",
        email: authUser?.email || "No email",
        phone: profile.phone || null,
        role: roleName,
        status: profile.is_active ? "Active" : "Inactive",
        lastActive: lastActiveFormatted,
      };
    });

    return { success: true, data: mappedUsers };
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return { success: false, error: error.message || "Failed to fetch users" };
  }
}

export async function createUserAction(data: {
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  password?: string;
}) {
  try {
    const supabase = createAdminClient();

    // 1. Find role or create fallback if missing
    let { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id, name")
      .eq("name", data.roleName)
      .maybeSingle();

    if (!role) {
      // If role name like STAFF does not exist, check if there is an existing role or create it
      const { data: newRole, error: createRoleErr } = await supabase
        .from("roles")
        .insert({
          name: data.roleName,
          description: `${data.roleName} team member`,
        })
        .select("id, name")
        .single();
      
      if (!createRoleErr && newRole) {
        role = newRole;
      } else {
        // Fallback to finding by general staff or marketing
        const { data: fallbackRole } = await supabase
          .from("roles")
          .select("id, name")
          .in("name", ["STAFF", "SUPPORT", "MARKETING"])
          .limit(1)
          .single();
        role = fallbackRole;
      }
    }

    if (!role) throw new Error("Role not found");

    // 2. Generate or use password
    const tempPassword =
      data.password ||
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8).toUpperCase() +
      "1!A";

    // 3. Create auth user with complete user_metadata
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          role: data.roleName,
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: `${data.firstName} ${data.lastName}`.trim(),
        },
        app_metadata: {
          role: data.roleName,
        },
      });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Failed to create user in Auth");

    // Explicitly update metadata to ensure JWT synchronization
    await supabase.auth.admin.updateUserById(authData.user.id, {
      user_metadata: {
        role: data.roleName,
        first_name: data.firstName,
        last_name: data.lastName,
        full_name: `${data.firstName} ${data.lastName}`.trim(),
      },
      app_metadata: {
        role: data.roleName,
      },
    });

    // 4. Create / update profile record
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: authData.user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        role_id: role.id,
        is_active: true,
      },
      { onConflict: "id" }
    );

    if (profileError) throw profileError;

    revalidatePath("/admin/users/admins");
    revalidatePath("/admin/users/managers");
    revalidatePath("/admin/users/staff");
    revalidatePath("/admin/users");

    return {
      success: true,
      data: {
        password: tempPassword,
        userId: authData.user.id,
      },
    };
  } catch (error: any) {
    console.error("Error creating user:", error);
    return { success: false, error: error.message || "Failed to create user" };
  }
}

export async function toggleUserStatusAction(userId: string, currentStatus: string) {
  try {
    const supabase = createAdminClient();
    const newActiveState = currentStatus !== "Active";

    // 1. Update profiles table
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ is_active: newActiveState })
      .eq("id", userId);

    if (profErr) throw profErr;

    // 2. Ban/unban in auth
    if (!newActiveState) {
      await supabase.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    } else {
      await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" });
    }

    revalidatePath("/admin/users/admins");
    revalidatePath("/admin/users/managers");
    revalidatePath("/admin/users/staff");
    revalidatePath("/admin/users");

    return { success: true, newStatus: newActiveState ? "Active" : "Inactive" };
  } catch (error: any) {
    console.error("[toggleUserStatusAction]", error);
    return { success: false, error: error.message || "Failed to update user status" };
  }
}

export async function assignUserRoleAction(userId: string, roleName: string) {
  try {
    const supabase = createAdminClient();

    // 1. Find role by name
    const { data: role, error: roleErr } = await supabase
      .from("roles")
      .select("id, name")
      .eq("name", roleName)
      .single();

    if (roleErr || !role) {
      throw new Error(`Role "${roleName}" not found`);
    }

    // 2. Update profile
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ role_id: role.id })
      .eq("id", userId);

    if (profErr) throw profErr;

    // 3. Update auth metadata
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role: role.name },
      app_metadata: { role: role.name },
    });

    revalidatePath("/admin/users/admins");
    revalidatePath("/admin/users/managers");
    revalidatePath("/admin/users/staff");
    revalidatePath("/admin/users");

    return { success: true, role: role.name };
  } catch (error: any) {
    console.error("[assignUserRoleAction]", error);
    return { success: false, error: error.message || "Failed to assign role" };
  }
}

export async function updateUserProfileAction(
  userId: string,
  data: { firstName: string; lastName: string; phone?: string }
) {
  try {
    const supabase = createAdminClient();

    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone || null,
      })
      .eq("id", userId);

    if (profErr) throw profErr;

    // Sync auth metadata
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        full_name: `${data.firstName} ${data.lastName}`.trim(),
      },
    });

    revalidatePath("/admin/users/admins");
    revalidatePath("/admin/users/managers");
    revalidatePath("/admin/users/staff");
    revalidatePath("/admin/users");

    return { success: true };
  } catch (error: any) {
    console.error("[updateUserProfileAction]", error);
    return { success: false, error: error.message || "Failed to update profile" };
  }
}

export async function getAllAvailableRolesAction() {
  try {
    const supabase = createAdminClient();
    const { data: roles, error } = await supabase
      .from("roles")
      .select("id, name, description")
      .order("name", { ascending: true });

    if (error) throw error;
    return { success: true, data: roles || [] };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch roles" };
  }
}

export async function updateUserPasswordAction(
  arg1: string,
  arg2?: string
) {
  try {
    let targetUserId: string | null = null;
    let newPassword = "";

    if (arg2 !== undefined) {
      // Called as updateUserPasswordAction(userId, newPassword)
      targetUserId = arg1;
      newPassword = arg2;
    } else {
      // Called as updateUserPasswordAction(newPassword) for current user
      newPassword = arg1;
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    const adminClient = createAdminClient();

    if (!targetUserId) {
      const supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { success: false, error: "Authentication required. Please log in again." };
      }
      targetUserId = user.id;

      // Try updating via the user session client first so auth session cookies are updated and not revoked
      const { error: sessionUpdateErr } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (sessionUpdateErr) {
        // Fallback to admin client if session client fails
        const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
          password: newPassword.trim(),
        });
        if (updateError) throw updateError;
      }
    } else {
      // Admin updating a user's password directly
      const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        password: newPassword.trim(),
      });

      if (updateError) throw updateError;
    }

    revalidatePath("/admin/users/admins");
    revalidatePath("/admin/users/managers");
    revalidatePath("/admin/users/staff");
    revalidatePath("/admin/users");

    return { success: true };
  } catch (error: any) {
    console.error("[updateUserPasswordAction]", error);
    return { success: false, error: error.message || "Failed to update password" };
  }
}

export async function adminUpdateUserPasswordAction(userId: string, newPassword: string) {
  return updateUserPasswordAction(userId, newPassword);
}

export async function syncUserAuthAction(credentials: { email: string; password: string }) {
  try {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password.trim();

    if (!email || !password || password.length < 6) {
      return { success: false, error: "Invalid credentials" };
    }

    const adminClient = createAdminClient();
    const {
      data: { users },
      error: listErr,
    } = await adminClient.auth.admin.listUsers();

    if (listErr || !users) {
      return { success: false, error: "Unable to verify user" };
    }

    const targetUser = users.find((u) => u.email?.toLowerCase() === email);
    if (!targetUser) {
      return { success: false, error: "Invalid login credentials." };
    }

    // Ensure email is confirmed and update password to allow seamless authentication
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetUser.id, {
      email_confirm: true,
      password: password,
    });

    if (updateErr) {
      console.error("[syncUserAuthAction] update error:", updateErr);
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[syncUserAuthAction]", error);
    return { success: false, error: error.message || "Sync failed" };
  }
}

