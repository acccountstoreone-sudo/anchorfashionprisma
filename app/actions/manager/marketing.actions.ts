"use server";

import { MarketingRepository } from "@/repositories/marketing.repository";

const marketingRepo = new MarketingRepository();

export async function fetchManagerMarketingStatsAction() {
  try {
    const data = await marketingRepo.getManagerMarketingStats();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchManagerMarketingStatsAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchAdminMarketingStatsAction() {
  try {
    const data = await marketingRepo.getAdminMarketingStats();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchAdminMarketingStatsAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchDashboardCampaignsAction(status?: string, limit = 5) {
  try {
    const data = await marketingRepo.getDashboardCampaigns(status, limit);
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchDashboardCampaignsAction error:", error);
    return { success: false, error: error.message };
  }
}
