"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { verifySuperAdmin } from "@/lib/security/roles";
import { revalidatePath } from "next/cache";

export async function fetchAdminUsersAction() {
  try {
    await verifySuperAdmin();
    const supabase = createAdminClient();

    // Fetch all profiles that have a role
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("*, roles(name, description)")
      .not("role_id", "is", null);

    if (profileErr) throw profileErr;

    // Fetch auth users to get emails
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) throw authErr;

    const usersList = profiles.map((p) => {
      const authUser = authData.users.find((u) => u.id === p.id);
      return {
        id: p.id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
        email: authUser?.email || "No Email",
        phone: p.phone,
        role: (p.roles as any)?.name || "NO ROLE",
        status: p.is_active ? "Active" : "Inactive",
        lastActive: authUser?.last_sign_in_at
          ? new Date(authUser.last_sign_in_at).toLocaleString()
          : "Never",
        avatar: p.avatar_url,
      };
    });

    return { success: true, data: usersList };
  } catch (error: any) {
    console.error("[fetchAdminUsersAction]", error);
    return { success: false, error: error.message };
  }
}

export async function toggleUserStatusAction(userId: string, isActive: boolean) {
  try {
    const currentUser = await verifySuperAdmin();
    if (currentUser.id === userId) {
      throw new Error("You cannot change your own status.");
    }

    const supabase = createAdminClient();
    
    // Update profile status
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", userId);
    
    if (profileErr) throw profileErr;

    // Update Auth status (ban/unban)
    if (!isActive) {
      await supabase.auth.admin.updateUserById(userId, { ban_duration: "876000h" }); // Ban for 100 years
    } else {
      await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" }); // Remove ban
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("[toggleUserStatusAction]", error);
    return { success: false, error: error.message };
  }
}

export async function createAdminUserAction(data: {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName: string;
}) {
  try {
    await verifySuperAdmin();
    const supabase = createAdminClient();

    // 1. Create auth user
    const finalPassword = data.password || (Math.random().toString(36).slice(-8) + "A1!"); 
    
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: data.email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        role: data.roleName,
        first_name: data.firstName,
        last_name: data.lastName,
      },
    });

    if (authErr) throw authErr;
    if (!authData.user) throw new Error("Failed to create user in Auth");

    const userId = authData.user.id;

    // Send Welcome Email via Resend
    try {
      const { EmailProvider } = await import("@/lib/notifications/EmailProvider");
      const { EmailTemplates } = await import("@/lib/notifications/EmailTemplates");
      const loginUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/login` : "https://anchor.com.bd/auth/login";
      
      await EmailProvider.send({
        to: data.email,
        subject: `Welcome to Anchor Fashion - ${data.roleName} Access`,
        html: EmailTemplates.welcomeAdmin(
          `${data.firstName} ${data.lastName}`.trim(),
          data.roleName,
          loginUrl,
          finalPassword
        ),
      });
    } catch (emailErr) {
      console.warn("[createAdminUserAction] Failed to send welcome email:", emailErr);
    }

    // 2. Insert or Update Profile
    // Since Auth triggers might auto-create a profile, we do an upsert or update
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: data.firstName,
      last_name: data.lastName,
      role_id: data.roleId,
      is_active: true,
    }, { onConflict: "id" });

    if (profileErr) throw profileErr;

    revalidatePath("/admin/users");
    return { success: true, password: finalPassword };
  } catch (error: any) {
    console.error("[createAdminUserAction]", error);
    return { success: false, error: error.message };
  }
}

export async function updateUserPasswordAction(userId: string, newPassword: string) {
  try {
    await verifySuperAdmin();
    if (!newPassword || newPassword.trim().length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword.trim(),
    });
    if (error) throw error;
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("[updateUserPasswordAction]", error);
    return { success: false, error: error.message || "Failed to update password" };
  }
}
