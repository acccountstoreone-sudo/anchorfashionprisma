"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { verifySuperAdmin } from "@/lib/security/roles";
import { revalidatePath } from "next/cache";

export async function fetchRolesAction() {
  try {
    await verifySuperAdmin();
    const supabase = createAdminClient();

    // Fetch roles
    const { data: roles, error: rolesErr } = await supabase.from("roles").select("*");
    if (rolesErr) throw rolesErr;

    // Fetch all permissions
    const { data: allPermissions, error: permErr } = await supabase.from("permissions").select("*");
    if (permErr) throw permErr;

    // Fetch role_permissions
    const { data: rolePerms, error: rolePermsErr } = await supabase.from("role_permissions").select("*");
    if (rolePermsErr) throw rolePermsErr;

    // Fetch counts from profiles per role
    const { data: profiles, error: profErr } = await supabase.from("profiles").select("role_id");
    if (profErr) throw profErr;

    const formattedRoles = roles.map((role) => {
      const userCount = profiles.filter((p) => p.role_id === role.id).length;
      
      const rolePermIds = rolePerms
        .filter((rp) => rp.role_id === role.id)
        .map((rp) => rp.permission_id);

      const permissionMap: Record<string, boolean> = {};
      
      allPermissions.forEach((p) => {
        permissionMap[p.action] = rolePermIds.includes(p.id);
      });

      return {
        id: role.id,
        name: role.name,
        description: role.description || "",
        usersCount: userCount,
        permissions: permissionMap,
      };
    });

    return { 
      success: true, 
      data: formattedRoles,
      allPermissions: allPermissions 
    };
  } catch (error: any) {
    console.error("[fetchRolesAction]", error);
    return { success: false, error: error.message };
  }
}

export async function toggleRolePermissionAction(roleId: string, permissionId: string, enable: boolean) {
  try {
    await verifySuperAdmin();
    const supabase = createAdminClient();

    if (enable) {
      await supabase.from("role_permissions").insert({
        role_id: roleId,
        permission_id: permissionId
      });
    } else {
      await supabase.from("role_permissions")
        .delete()
        .eq("role_id", roleId)
        .eq("permission_id", permissionId);
    }

    revalidatePath("/admin/users/roles");
    return { success: true };
  } catch (error: any) {
    console.error("[toggleRolePermissionAction]", error);
    return { success: false, error: error.message };
  }
}

export async function createRoleAction(data: { name: string, description: string }) {
  try {
    await verifySuperAdmin();
    const supabase = createAdminClient();
    
    const { error } = await supabase.from("roles").insert({
      name: data.name,
      description: data.description,
    });
    
    if (error) throw error;
    
    revalidatePath("/admin/users/roles");
    return { success: true };
  } catch (error: any) {
    console.error("[createRoleAction]", error);
    return { success: false, error: error.message };
  }
}

export async function updateRoleAction(
  id: string,
  data: { name: string; description: string }
) {
  try {
    await verifySuperAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("roles")
      .update({ name: data.name, description: data.description })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/users/roles");
    return { success: true };
  } catch (error: any) {
    console.error("[updateRoleAction]", error);
    return { success: false, error: error.message };
  }
}

export async function deleteRoleAction(id: string) {
  try {
    await verifySuperAdmin();
    const supabase = createAdminClient();

    // Check if role has users assigned
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role_id", id);

    if ((count || 0) > 0) {
      return {
        success: false,
        error: `Cannot delete role: ${count} user(s) are assigned to it. Reassign them first.`,
      };
    }

    // Delete role_permissions first (FK constraint)
    await supabase.from("role_permissions").delete().eq("role_id", id);

    const { error } = await supabase.from("roles").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/admin/users/roles");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteRoleAction]", error);
    return { success: false, error: error.message };
  }
}
