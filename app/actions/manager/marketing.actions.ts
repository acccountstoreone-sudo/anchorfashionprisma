"use server";

import { MarketingRepository } from "@/repositories/marketing.repository";
import { verifyStaff } from "@/lib/security/roles";

const marketingRepo = new MarketingRepository();

export async function fetchManagerMarketingStatsAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const data = await marketingRepo.getManagerMarketingStats();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchManagerMarketingStatsAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchAdminMarketingStatsAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const data = await marketingRepo.getAdminMarketingStats();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchAdminMarketingStatsAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchDashboardCampaignsAction(status?: string, limit = 5) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const data = await marketingRepo.getDashboardCampaigns(status, limit);
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchDashboardCampaignsAction error:", error);
    return { success: false, error: error.message };
  }
}
