"use server";

import { CustomerRepository } from "@/lib/repositories/crm/customer.repository";
import { verifyStaff } from "@/lib/security/roles";

const customerRepo = new CustomerRepository();

export async function fetchCustomersAction(limit?: number, search?: string) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const data = await customerRepo.getCustomerProfiles(limit, search);
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchCustomersAction error:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchCustomerSegmentsAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const data = await customerRepo.getCustomerSegments();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchCustomerSegmentsAction error:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchLoyaltyStatsAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const data = await customerRepo.getLoyaltyStats();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchLoyaltyStatsAction error:", error?.message || error);
    return { success: false, error: error?.message || "Failed to fetch loyalty stats", data: [] };
  }
}

export async function fetchCRMSummaryAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const data = await customerRepo.getCRMSummary();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchCRMSummaryAction error:", error);
    // Return safe fallback
    return {
      success: false,
      error: error.message,
      data: {
        totalCustomers: 0,
        newCustomers: 0,
        avgLifetimeValue: 0,
        loyaltyMembers: 0,
      },
    };
  }
}

export async function fetchCustomerDetailsAction(id: string) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const profile = await customerRepo.getProfile(id);
    if (!profile) return { success: false, error: "Customer not found" };

    const [tickets, loginHistory, orderStats, loyaltyData] = await Promise.all([
      customerRepo.getTickets(id),
      customerRepo.getLoginHistory(id),
      customerRepo.getCustomerOrderStats(id),
      customerRepo.getCustomerPoints(id)
    ]);

    return {
      success: true,
      data: {
        profile,
        ticketsCount: tickets?.length || 0,
        tickets: tickets || [],
        loginHistory: loginHistory || [],
        totalOrders: orderStats.totalOrders,
        tier: loyaltyData.tier,
        points: loyaltyData.points,
        ltv: `৳${orderStats.ltv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        segments: orderStats.totalOrders > 0 ? ["Active"] : ["New"],
      },
    };
  } catch (error: any) {
    console.error("fetchCustomerDetailsAction error:", error);
    return { success: false, error: error.message };
  }
}
