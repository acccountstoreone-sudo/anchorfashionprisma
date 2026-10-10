"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

export async function createGroupAction(data: {
  name: string;
  description?: string;
  isDynamic?: boolean;
}): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("customer_segments")
      .select("id")
      .ilike("name", data.name.trim())
      .maybeSingle();

    if (existing) {
      return { error: "A group with this name already exists." };
    }

    const { data: newGroup, error } = await supabase
      .from("customer_segments")
      .insert({
        name: data.name.trim(),
        description: data.description?.trim() || null,
        is_dynamic: data.isDynamic ?? false,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/admin/customers/groups");
    return { success: true, data: newGroup };
  } catch (error: any) {
    console.error("[createGroupAction]", error);
    return { error: error.message || "Failed to create group" };
  }
}

export async function deleteGroupAction(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // First delete any members
    await supabase.from("customer_segment_members").delete().eq("segment_id", id);

    const { error } = await supabase
      .from("customer_segments")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/customers/groups");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteGroupAction]", error);
    return { error: error.message || "Failed to delete group" };
  }
}

export async function updateGroupAction(
  id: string,
  data: { name: string; description?: string; isDynamic?: boolean }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { data: updated, error } = await supabase
      .from("customer_segments")
      .update({
        name: data.name.trim(),
        description: data.description?.trim() || null,
        is_dynamic: data.isDynamic ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/admin/customers/groups");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("[updateGroupAction]", error);
    return { success: false, error: error.message || "Failed to update group" };
  }
}

export async function getGroupMembersAction(groupId: string): Promise<{
  success: boolean;
  data?: {
    group: any;
    members: any[];
    count: number;
  };
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    const { data: group, error: groupErr } = await supabase
      .from("customer_segments")
      .select("*")
      .eq("id", groupId)
      .single();

    if (groupErr || !group) {
      return { success: false, error: "Group not found" };
    }

    let members: any[] = [];

    // 1. Fetch explicitly assigned static members by customer_id
    const { data: directRows, error: directErr } = await supabase
      .from("customer_segment_members")
      .select("customer_id, added_at")
      .eq("segment_id", groupId);

    if (!directErr && directRows && directRows.length > 0) {
      const customerIds = directRows.map((r: any) => r.customer_id).filter(Boolean);
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("customer_profiles")
          .select("id, first_name, last_name, email, phone, created_at")
          .in("id", customerIds);
        members = profiles || [];
      }
    }

    // 2. If it's a dynamic group and has no manually pinned members, dynamically populate matching customers
    if (group.is_dynamic && members.length === 0) {
      const name = (group.name || "").toUpperCase();

      if (name.includes("VIP")) {
        // Query VIPs from crm_customers
        const { data: crmMatches } = await supabase
          .from("crm_customers")
          .select("profile_id")
          .or("is_vip.eq.true,health_score.gte.80")
          .limit(50);

        const profileIds = (crmMatches || []).map((m: any) => m.profile_id).filter(Boolean);
        if (profileIds.length > 0) {
          const { data: vipProfiles } = await supabase
            .from("customer_profiles")
            .select("id, first_name, last_name, email, phone, created_at")
            .in("id", profileIds)
            .limit(50);
          members = vipProfiles || [];
        }
      } else if (name.includes("REPEAT") || name.includes("FREQUENT")) {
        // Customers with multiple orders
        const { data: orders } = await supabase.from("orders").select("customer_id");
        const orderCounts: Record<string, number> = {};
        orders?.forEach((o: any) => {
          if (o.customer_id) orderCounts[o.customer_id] = (orderCounts[o.customer_id] || 0) + 1;
        });
        const repeatIds = Object.keys(orderCounts).filter((id) => orderCounts[id] >= 2);
        if (repeatIds.length > 0) {
          const { data: repProfiles } = await supabase
            .from("customer_profiles")
            .select("id, first_name, last_name, email, phone, created_at")
            .in("id", repeatIds)
            .limit(50);
          members = repProfiles || [];
        }
      } else if (name.includes("FIRST")) {
        // Customers with 1 order
        const { data: orders } = await supabase.from("orders").select("customer_id");
        const orderCounts: Record<string, number> = {};
        orders?.forEach((o: any) => {
          if (o.customer_id) orderCounts[o.customer_id] = (orderCounts[o.customer_id] || 0) + 1;
        });
        const firstIds = Object.keys(orderCounts).filter((id) => orderCounts[id] === 1);
        if (firstIds.length > 0) {
          const { data: firstProfiles } = await supabase
            .from("customer_profiles")
            .select("id, first_name, last_name, email, phone, created_at")
            .in("id", firstIds)
            .limit(50);
          members = firstProfiles || [];
        }
      } else if (name.includes("PROSPECT") || name.includes("LEAD")) {
        // Customers with 0 orders
        const { data: orders } = await supabase.from("orders").select("customer_id");
        const buyerIds = new Set(orders?.map((o: any) => o.customer_id).filter(Boolean));
        const { data: allProfiles } = await supabase
          .from("customer_profiles")
          .select("id, first_name, last_name, email, phone, created_at")
          .limit(50);
        members = (allProfiles || []).filter((p: any) => !buyerIds.has(p.id));
      } else if (name.includes("RISK") || name.includes("INACTIVE")) {
        const { data: crmMatches } = await supabase
          .from("crm_customers")
          .select("profile_id")
          .or("customer_lifecycle_stage.eq.AT_RISK,health_score.lt.50")
          .limit(50);
        const profileIds = (crmMatches || []).map((m: any) => m.profile_id).filter(Boolean);
        if (profileIds.length > 0) {
          const { data: riskProfiles } = await supabase
            .from("customer_profiles")
            .select("id, first_name, last_name, email, phone, created_at")
            .in("id", profileIds)
            .limit(50);
          members = riskProfiles || [];
        }
      }

      // If dynamic rules returned empty or no specific keyword, fallback to active customers
      if (members.length === 0) {
        const { data: defaultProfiles } = await supabase
          .from("customer_profiles")
          .select("id, first_name, last_name, email, phone, created_at")
          .order("created_at", { ascending: false })
          .limit(10);
        members = defaultProfiles || [];
      }
    }

    return {
      success: true,
      data: {
        group,
        members,
        count: members.length,
      },
    };
  } catch (error: any) {
    console.error("[getGroupMembersAction]", error);
    return { success: false, error: error.message || "Failed to fetch group members" };
  }
}

export async function addMemberToGroupAction(
  groupId: string,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Check if already in group
    const { data: existing } = await supabase
      .from("customer_segment_members")
      .select("customer_id")
      .eq("segment_id", groupId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "This customer is already in this group." };
    }

    const { error } = await supabase
      .from("customer_segment_members")
      .insert({
        segment_id: groupId,
        customer_id: customerId,
        added_by: "ADMIN",
      });

    if (error) throw error;

    revalidatePath("/admin/customers/groups");
    return { success: true };
  } catch (error: any) {
    console.error("[addMemberToGroupAction]", error);
    return { success: false, error: error.message || "Failed to add customer to group" };
  }
}

export async function removeMemberFromGroupAction(
  groupId: string,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("customer_segment_members")
      .delete()
      .eq("segment_id", groupId)
      .eq("customer_id", customerId);

    if (error) throw error;

    revalidatePath("/admin/customers/groups");
    return { success: true };
  } catch (error: any) {
    console.error("[removeMemberFromGroupAction]", error);
    return { success: false, error: error.message || "Failed to remove customer from group" };
  }
}

export async function searchAvailableCustomersAction(
  query: string,
  excludeIds: string[] = []
): Promise<{ success: boolean; data: any[]; error?: string }> {
  try {
    const supabase = createAdminClient();
    const clean = query.trim().replace(/,/g, "");

    let q = supabase
      .from("customer_profiles")
      .select("id, first_name, last_name, email, phone")
      .limit(10);

    if (clean) {
      q = q.or(`first_name.ilike.%${clean}%,last_name.ilike.%${clean}%,email.ilike.%${clean}%`);
    }

    const { data, error } = await q;

    if (error) throw error;

    const filtered = (data || []).filter((c: any) => !excludeIds.includes(c.id));
    return { success: true, data: filtered };
  } catch (error: any) {
    console.error("[searchAvailableCustomersAction]", error);
    return { success: false, data: [], error: error.message || "Search failed" };
  }
}
