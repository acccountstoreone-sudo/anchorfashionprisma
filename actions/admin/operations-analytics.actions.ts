"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";

export interface OperationsMetrics {
  revenue: {
    total: number;
    orderCount: number;
    averageOrderValue: number;
  };
  inventory: {
    totalUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalVariants: number;
  };
  procurement: {
    totalPOs: number;
    totalSpend: number;
    pendingPOs: number;
  };
  fulfillment: {
    totalPickLists: number;
    completedPickLists: number;
    fulfillmentRate: number;
  };
  returns: {
    totalReturns: number;
    returnRate: number;
    totalRefundAmount: number;
  };
  warehouseBreakdown: Array<{
    id: string;
    name: string;
    code: string;
    units: number;
    activePOs: number;
    activePickLists: number;
  }>;
  recentTrends: Array<{
    date: string;
    orders: number;
    returns: number;
    revenue: number;
  }>;
}

export async function getOperationsAnalyticsAction(timeRange: "7d" | "30d" | "90d" | "365d" | "all" = "30d") {
  try {
    const supabase = createAdminClient();

    // Calculate cutoff date
    let cutoffDate: Date | null = new Date();
    if (timeRange === "7d") {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (timeRange === "30d") {
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    } else if (timeRange === "90d") {
      cutoffDate.setDate(cutoffDate.getDate() - 90);
    } else if (timeRange === "365d") {
      cutoffDate.setDate(cutoffDate.getDate() - 365);
    } else {
      cutoffDate = null;
    }

    const cutoffIso = cutoffDate ? cutoffDate.toISOString() : null;

    // 1. Orders aggregation
    let ordersQuery = supabase
      .from("orders")
      .select("id, grand_total, status, created_at");
    if (cutoffIso) {
      ordersQuery = ordersQuery.gte("created_at", cutoffIso);
    }
    const { data: orders = [] } = await ordersQuery;

    const safeOrders = orders || [];
    const totalRevenue = safeOrders.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
    const orderCount = safeOrders.length;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // 2. Inventory aggregation
    const { data: levels = [] } = await supabase
      .from("inventory_levels")
      .select("quantity_available, quantity_reserved, reorder_point, warehouse_id");

    const safeLevels = levels || [];
    const totalUnits = safeLevels.reduce((sum, l) => sum + (l.quantity_available || 0), 0);
    const lowStockCount = safeLevels.filter(
      (l) => (l.quantity_available || 0) <= (l.reorder_point || 5) && (l.quantity_available || 0) > 0
    ).length;
    const outOfStockCount = safeLevels.filter((l) => (l.quantity_available || 0) === 0).length;
    const totalVariants = safeLevels.length;

    // 3. Procurement (Purchase Orders) aggregation
    let poQuery = supabase
      .from("purchase_orders")
      .select("id, po_number, status, total_amount, warehouse_id, created_at");
    if (cutoffIso) {
      poQuery = poQuery.gte("created_at", cutoffIso);
    }
    const { data: pos = [] } = await poQuery;

    const safePOs = pos || [];
    const totalPOs = safePOs.length;
    const totalSpend = safePOs.reduce((sum, po) => sum + (parseFloat(po.total_amount) || 0), 0);
    const pendingPOs = safePOs.filter((po) =>
      ["DRAFT", "PENDING", "ORDERED"].includes((po.status || "").toUpperCase())
    ).length;

    // 4. Fulfillment (Pick Lists) aggregation
    let pickQuery = supabase
      .from("pick_lists")
      .select("id, status, warehouse_id, created_at");
    if (cutoffIso) {
      pickQuery = pickQuery.gte("created_at", cutoffIso);
    }
    const { data: pickLists = [] } = await pickQuery;

    const safePickLists = pickLists || [];
    const totalPickLists = safePickLists.length;
    const completedPickLists = safePickLists.filter(
      (pl) => (pl.status || "").toUpperCase() === "COMPLETED"
    ).length;
    const fulfillmentRate =
      totalPickLists > 0 ? Math.round((completedPickLists / totalPickLists) * 100) : 100;

    // 5. Returns aggregation
    let returnsQuery = supabase
      .from("returns")
      .select("id, status, refund_amount, created_at");
    if (cutoffIso) {
      returnsQuery = returnsQuery.gte("created_at", cutoffIso);
    }
    const { data: returns = [] } = await returnsQuery;

    const safeReturns = returns || [];
    const totalReturns = safeReturns.length;
    const returnRate = orderCount > 0 ? Number(((totalReturns / orderCount) * 100).toFixed(1)) : 0;
    const totalRefundAmount = safeReturns.reduce(
      (sum, r) => sum + (parseFloat(r.refund_amount) || 0),
      0
    );

    // 6. Warehouses breakdown
    const { data: warehouses = [] } = await supabase
      .from("warehouses")
      .select("id, name, warehouse_code, is_active");

    const warehouseBreakdown = (warehouses || []).map((wh) => {
      const whUnits = safeLevels
        .filter((l) => l.warehouse_id === wh.id)
        .reduce((sum, l) => sum + (l.quantity_available || 0), 0);

      const whActivePOs = safePOs.filter(
        (po) =>
          po.warehouse_id === wh.id &&
          ["DRAFT", "PENDING", "ORDERED"].includes((po.status || "").toUpperCase())
      ).length;

      const whActivePickLists = safePickLists.filter(
        (pl) =>
          pl.warehouse_id === wh.id &&
          ["PENDING", "ASSIGNED", "PICKING"].includes((pl.status || "").toUpperCase())
      ).length;

      return {
        id: wh.id,
        name: wh.name,
        code: (wh as any).warehouse_code || "",
        units: whUnits,
        activePOs: whActivePOs,
        activePickLists: whActivePickLists,
      };
    });

    // 7. Recent Daily/Monthly Trends (grouped by last 7 intervals)
    const trendsMap: Record<string, { orders: number; returns: number; revenue: number }> = {};

    safeOrders.forEach((o) => {
      const day = new Date(o.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (!trendsMap[day]) trendsMap[day] = { orders: 0, returns: 0, revenue: 0 };
      trendsMap[day].orders += 1;
      trendsMap[day].revenue += Number(o.grand_total) || 0;
    });

    safeReturns.forEach((r) => {
      const day = new Date(r.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (!trendsMap[day]) trendsMap[day] = { orders: 0, returns: 0, revenue: 0 };
      trendsMap[day].returns += 1;
    });

    const recentTrends = Object.entries(trendsMap)
      .slice(-7)
      .map(([date, vals]) => ({
        date,
        orders: vals.orders,
        returns: vals.returns,
        revenue: Math.round(vals.revenue),
      }));

    return {
      success: true,
      data: {
        revenue: {
          total: totalRevenue,
          orderCount,
          averageOrderValue,
        },
        inventory: {
          totalUnits,
          lowStockCount,
          outOfStockCount,
          totalVariants,
        },
        procurement: {
          totalPOs,
          totalSpend,
          pendingPOs,
        },
        fulfillment: {
          totalPickLists,
          completedPickLists,
          fulfillmentRate,
        },
        returns: {
          totalReturns,
          returnRate,
          totalRefundAmount,
        },
        warehouseBreakdown,
        recentTrends,
      } as OperationsMetrics,
    };
  } catch (err: any) {
    console.error("[getOperationsAnalyticsAction]", err);
    return { success: false, error: err.message || "Failed to fetch operations analytics" };
  }
}
