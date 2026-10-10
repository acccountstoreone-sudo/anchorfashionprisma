"use server";

import { ADMIN_ROLES, STAFF_ROLES } from "@/lib/constants/auth";
import { DashboardRepository } from "@/lib/repositories/bi/dashboard.repository";
import { createClient } from "@/lib/supabase/server";

const dashboardRepo = new DashboardRepository();

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  
  let role = user.user_metadata?.role || user.app_metadata?.role;
  if (!role) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("roles(name)")
        .eq("id", user.id)
        .single();
      role = (profile?.roles as any)?.name;
    } catch {
      role = "CUSTOMER";
    }
  }
  if (!role) role = "CUSTOMER";

  if (!ADMIN_ROLES.includes(role) && !STAFF_ROLES.includes(role)) {
    throw new Error("Unauthorized: Staff or Admin access required");
  }
}

export async function fetchDashboardRevenueAction(days = 7) {
  try {
    await verifyAdmin();
    const rawData = await dashboardRepo.getDailyRevenue(days);
    const data = rawData || [];

    const formattedData = data.map((d: any) => {
      const date = new Date(d.date);
      return {
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        revenue: Number(d.total_revenue),
        orders: Number(d.total_orders),
        aov: Number(d.aov),
        newCustomers: Number(d.new_customers)
      };
    });

    return { success: true, data: formattedData };
  } catch (error: any) {
    console.error("fetchDashboardRevenueAction error:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchDashboardKPIsAction() {
  try {
    await verifyAdmin();
    const data = await dashboardRepo.getDashboardKPIs();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchDashboardKPIsAction error:", error);
    return { success: false, error: error.message, data: null };
  }
}

export async function fetchOperationalMetricsAction() {
  try {
    await verifyAdmin();
    const data = await dashboardRepo.getOperationalMetrics();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchOperationalMetricsAction error:", error);
    return { success: false, error: error.message, data: null };
  }
}

export async function fetchTopSellersAction() {
  try {
    await verifyAdmin();
    const data = await dashboardRepo.getTopSellers();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchTopSellersAction error:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchRevenueByCategoryAction() {
  try {
    await verifyAdmin();
    const data = await dashboardRepo.getRevenueByCategory();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchRevenueByCategoryAction error:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchRecentCustomersAction() {
  try {
    await verifyAdmin();
    const data = await dashboardRepo.getRecentCustomers();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchRecentCustomersAction error:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchUserLocationsAction() {
  try {
    await verifyAdmin();
    const data = await dashboardRepo.getUserLocations();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchUserLocationsAction error:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchDealOfTheDayAction() {
  try {
    await verifyAdmin();
    const data = await dashboardRepo.getDealOfTheDay();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchDealOfTheDayAction error:", error);
    return { success: false, error: error.message, data: null };
  }
}

export async function fetchRecentOrdersAction() {
  try {
    await verifyAdmin();
    const data = await dashboardRepo.getRecentOrders();
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchRecentOrdersAction error:", error);
    return { success: false, error: error.message, data: [] };
  }
}
