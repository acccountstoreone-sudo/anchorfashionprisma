"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

export async function createCustomerAction(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  lifecycleStage?: string;
}): Promise<{ success?: boolean; data?: any; error?: string }> {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanPhone = data.phone?.trim() ? data.phone.trim() : null;

  try {
    const supabase = createAdminClient();

    // 1. Check if customer profile already exists with this email
    const { data: existingEmail } = await supabase
      .from("customer_profiles")
      .select("id, email, first_name, last_name")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (existingEmail) {
      return {
        error: `A customer with email "${cleanEmail}" already exists (${existingEmail.first_name || ""} ${existingEmail.last_name || ""}).`,
      };
    }

    // 2. Check if customer profile already exists with this phone number (unique constraint)
    if (cleanPhone) {
      const { data: existingPhone } = await supabase
        .from("customer_profiles")
        .select("id, email, first_name, last_name")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (existingPhone) {
        return {
          error: `Phone number "${cleanPhone}" is already registered to another customer (${existingPhone.first_name || ""} ${existingPhone.last_name || ""}, ${existingPhone.email}). Please use a unique phone number or leave it blank.`,
        };
      }
    }

    // 3. Provision user in Supabase Auth to obtain a valid UUID (primary key for customer_profiles)
    let userId: string;
    const tempPassword = `AnchorCustomer@${Math.random().toString(36).slice(-8)}!2026`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        full_name: `${data.firstName.trim()} ${data.lastName.trim()}`,
        phone: cleanPhone || "",
        role: "customer",
      },
    });

    if (authError) {
      // If user already exists in auth.users, fetch their existing ID
      if (
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("already exists")
      ) {
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existingAuth = listData?.users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        );
        if (existingAuth?.id) {
          userId = existingAuth.id;
        } else {
          userId = crypto.randomUUID();
        }
      } else {
        // Fallback to generated UUID if auth admin is restricted
        userId = crypto.randomUUID();
      }
    } else {
      userId = authData?.user?.id || crypto.randomUUID();
    }

    // 4. Sync with profiles table if present
    try {
      await supabase.from("profiles").upsert(
        {
          id: userId,
          email: cleanEmail,
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          phone: cleanPhone,
          role: "customer",
          is_active: true,
        },
        { onConflict: "id" }
      );
    } catch {
      // Non-critical if profiles table schema differs
    }

    // 5. Create customer profile with valid primary key id
    const { data: newCustomer, error: profileError } = await supabase
      .from("customer_profiles")
      .upsert(
        {
          id: userId,
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          is_active: true,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (profileError) throw profileError;

    // 6. Initialize CRM customer metadata
    if (newCustomer?.id) {
      await supabase.from("crm_customers").upsert(
        {
          profile_id: newCustomer.id,
          customer_lifecycle_stage: data.lifecycleStage || "PROSPECT",
          is_vip: false,
          health_score: 80,
          total_support_tickets: 0,
          last_interaction_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" }
      );
    }

    revalidatePath("/admin/customers");
    revalidatePath("/manager/customers");
    return { success: true, data: newCustomer };
  } catch (error: any) {
    console.error("[createCustomerAction]", error);

    // Handle unique constraint violations gracefully
    if (
      error.code === "23505" ||
      error.message?.includes("customer_profiles_phone_key") ||
      error.message?.includes("unique constraint")
    ) {
      if (
        error.message?.includes("customer_profiles_phone_key") ||
        error.message?.includes("phone")
      ) {
        return {
          error: `Phone number "${cleanPhone}" is already in use by another customer. Phone numbers must be unique, or you can leave the phone field blank.`,
        };
      }
      if (error.message?.includes("email")) {
        return {
          error: `A customer with email "${cleanEmail}" is already registered.`,
        };
      }
      return {
        error: "A customer with this email or phone number already exists in the system.",
      };
    }

    return { error: error.message || "Failed to create customer" };
  }
}
