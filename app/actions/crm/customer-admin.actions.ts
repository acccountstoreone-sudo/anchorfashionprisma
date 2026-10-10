"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { verifyAdmin } from "@/lib/security/roles";
import { revalidatePath } from "next/cache";
import { CustomerLifecycleStage } from "@/features/crm/components/CustomersList";

export interface UpdateCustomerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  lifecycleStage?: CustomerLifecycleStage;
  isVip?: boolean;
  password?: string;
}

export async function updateCustomerByAdminAction(
  data: UpdateCustomerData
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Strictly verify the caller is an Admin or Super Admin
    await verifyAdmin();

    const cleanId = data.id?.trim();
    const cleanFirstName = data.firstName?.trim();
    const cleanLastName = data.lastName?.trim() || "";
    const cleanEmail = data.email?.trim().toLowerCase();
    const cleanPhone = data.phone?.trim() ? data.phone.trim() : null;
    const cleanPassword = data.password?.trim();

    if (!cleanId) {
      return { success: false, error: "Customer ID is required." };
    }
    if (!cleanFirstName) {
      return { success: false, error: "First name is required." };
    }
    if (!cleanEmail) {
      return { success: false, error: "Email address is required." };
    }
    if (cleanPassword && cleanPassword.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters long.",
      };
    }

    const supabase = createAdminClient();

    // 2. Check for duplicate email across other customer profiles
    const { data: existingEmail } = await supabase
      .from("customer_profiles")
      .select("id, email")
      .ilike("email", cleanEmail)
      .neq("id", cleanId)
      .maybeSingle();

    if (existingEmail) {
      return {
        success: false,
        error: `Email "${cleanEmail}" is already registered to another customer.`,
      };
    }

    // 3. Check for duplicate phone across other customer profiles if phone provided
    if (cleanPhone) {
      const { data: existingPhone } = await supabase
        .from("customer_profiles")
        .select("id, phone")
        .eq("phone", cleanPhone)
        .neq("id", cleanId)
        .maybeSingle();

      if (existingPhone) {
        return {
          success: false,
          error: `Phone number "${cleanPhone}" is already assigned to another customer.`,
        };
      }
    }

    // 4. Update Supabase Auth user (email, password, user_metadata)
    const authUpdates: {
      email?: string;
      password?: string;
      user_metadata?: Record<string, any>;
    } = {
      email: cleanEmail,
      user_metadata: {
        first_name: cleanFirstName,
        last_name: cleanLastName,
        full_name: `${cleanFirstName} ${cleanLastName}`.trim(),
        phone: cleanPhone || "",
      },
    };

    if (cleanPassword) {
      authUpdates.password = cleanPassword;
      authUpdates.user_metadata = {
        ...authUpdates.user_metadata,
        assigned_password: cleanPassword,
      };
    }

    const { error: authErr } = await supabase.auth.admin.updateUserById(
      cleanId,
      authUpdates
    );
    if (authErr) {
      console.warn("[updateCustomerByAdminAction] Auth update warning:", authErr.message);
    }

    // 5. Update customer_profiles table
    const { error: custErr } = await supabase
      .from("customer_profiles")
      .update({
        first_name: cleanFirstName,
        last_name: cleanLastName,
        email: cleanEmail,
        phone: cleanPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cleanId);

    if (custErr) {
      throw custErr;
    }

    // 6. Sync with public profiles table
    try {
      await supabase
        .from("profiles")
        .update({
          first_name: cleanFirstName,
          last_name: cleanLastName,
          email: cleanEmail,
          phone: cleanPhone,
        })
        .eq("id", cleanId);
    } catch {
      // non-fatal if profiles table row does not exist
    }

    // 7. Update or upsert CRM customer metadata (lifecycleStage, isVip)
    if (data.lifecycleStage || data.isVip !== undefined) {
      const crmPayload: {
        profile_id: string;
        customer_lifecycle_stage?: string;
        is_vip?: boolean;
        last_interaction_at: string;
      } = {
        profile_id: cleanId,
        last_interaction_at: new Date().toISOString(),
      };
      if (data.lifecycleStage) {
        crmPayload.customer_lifecycle_stage = data.lifecycleStage;
      }
      if (data.isVip !== undefined) {
        crmPayload.is_vip = data.isVip;
      }

      await supabase
        .from("crm_customers")
        .upsert(crmPayload, { onConflict: "profile_id" });
    }

    // 8. Revalidate all related CRM paths
    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${cleanId}`);
    revalidatePath("/manager/customers");

    return { success: true };
  } catch (error: any) {
    console.error("[updateCustomerByAdminAction] Error:", error);
    return {
      success: false,
      error: error?.message || "Failed to update customer details.",
    };
  }
}

export async function deleteCustomerByAdminAction(
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Strictly verify caller is an Admin or Super Admin
    const currentUser = await verifyAdmin();

    const cleanId = customerId?.trim();
    if (!cleanId) {
      return { success: false, error: "Customer ID is required." };
    }

    if (currentUser.id === cleanId) {
      return {
        success: false,
        error: "Security violation: You cannot delete your own account.",
      };
    }

    const supabase = createAdminClient();

    // 2. Cascade delete dependent CRM and customer records
    await Promise.allSettled([
      supabase.from("support_tickets").delete().eq("customer_id", cleanId),
      supabase.from("customer_addresses").delete().eq("customer_id", cleanId),
      supabase.from("customer_notifications").delete().eq("customer_id", cleanId),
      supabase.from("loyalty_accounts").delete().eq("customer_id", cleanId),
      supabase.from("crm_customers").delete().eq("profile_id", cleanId),
    ]);

    // 3. Delete customer profile
    const { error: profileErr } = await supabase
      .from("customer_profiles")
      .delete()
      .eq("id", cleanId);

    if (profileErr) {
      // If there's a foreign key constraint (e.g., historical financial transactions / orders)
      if (profileErr.code === "23503") {
        return {
          success: false,
          error:
            "This customer has historical order or invoice records and cannot be permanently deleted. You can mark them inactive or remove credentials instead.",
        };
      }
      throw profileErr;
    }

    // 4. Delete user profile from profiles table if exists
    try {
      await supabase.from("profiles").delete().eq("id", cleanId);
    } catch {
      // non-fatal
    }

    // 5. Delete user from Supabase Auth
    const { error: authErr } = await supabase.auth.admin.deleteUser(cleanId);
    if (authErr) {
      console.warn("[deleteCustomerByAdminAction] Auth delete warning:", authErr.message);
    }

    // 6. Revalidate routes
    revalidatePath("/admin/customers");
    revalidatePath("/manager/customers");

    return { success: true };
  } catch (error: any) {
    console.error("[deleteCustomerByAdminAction] Error:", error);
    return {
      success: false,
      error: error?.message || "Failed to delete customer.",
    };
  }
}

export async function getCustomerPasswordAction(
  customerId: string
): Promise<{ success: boolean; password?: string | null; error?: string }> {
  try {
    await verifyAdmin();
    const cleanId = customerId?.trim();
    if (!cleanId) return { success: false, error: "Customer ID is required." };

    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(cleanId);
    if (error) throw error;

    const password = data.user?.user_metadata?.assigned_password || null;
    return { success: true, password };
  } catch (error: any) {
    console.error("[getCustomerPasswordAction] Error:", error);
    return {
      success: false,
      error: error?.message || "Failed to retrieve customer password.",
    };
  }
}
