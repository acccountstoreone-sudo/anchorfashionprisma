import { createClient } from "@/lib/supabase/server";

export async function getExecutiveKpis() {
  const supabase = await createClient();

  // In a real scenario, this would query the bi_sales_mart or fact_sales directly
  // with a date filter for 'today' or 'this month' vs 'last month' to calculate trends.
  // For the sake of the template, we'll fetch basic aggregates or return mocked structured data
  // aligned with the enterprise schema.

  const { data: salesData, error: salesError } = await supabase
    .from("bi_sales_mart")
    .select("total_sales, total_orders, gross_profit")
    .order("date", { ascending: false })
    .limit(30);

  if (salesError) {
    console.error("Error fetching sales KPIs:", salesError);
    return null;
  }

  // Calculate aggregates from the mart
  const totalRevenue =
    salesData?.reduce(
      (sum: any, day: any) => sum + Number(day.total_sales),
      0
    ) || 0;
  const totalOrders =
    salesData?.reduce(
      (sum: any, day: any) => sum + Number(day.total_orders),
      0
    ) || 0;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalProfit =
    salesData?.reduce(
      (sum: any, day: any) => sum + Number(day.gross_profit),
      0
    ) || 0;

  return {
    revenue: {
      value: totalRevenue,
      trend: 12.5, // Mock trend calculation for now
    },
    orders: {
      value: totalOrders,
      trend: 8.2,
    },
    aov: {
      value: aov,
      trend: -1.5,
    },
    profit: {
      value: totalProfit,
      trend: 14.1,
    },
  };
}

export async function getSalesTrends() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("created_at, grand_total, status")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    if (error) console.error("Error fetching sales trends:", error);
    return [];
  }

  const grouped: Record<string, { sales: number; profit: number }> = {};
  for (const o of data) {
    const s = (o.status || "").toLowerCase();
    if (s === "cancelled" || s === "returned") continue;
    const dateKey = new Date(o.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const val = Number(o.grand_total) || 0;
    if (!grouped[dateKey]) {
      grouped[dateKey] = { sales: 0, profit: 0 };
    }
    grouped[dateKey].sales += val;
    grouped[dateKey].profit += val * 0.35;
  }

  return Object.entries(grouped)
    .reverse()
    .slice(-30)
    .map(([date, vals]) => ({
      date,
      sales: vals.sales,
      profit: vals.profit,
    }));
}

export async function getTopCategories() {
  return [
    { name: "Dresses", value: 45000 },
    { name: "Tops", value: 32000 },
    { name: "Outerwear", value: 28000 },
    { name: "Accessories", value: 15000 },
    { name: "Bottoms", value: 22000 },
  ];
}

export async function getCustomerMetrics() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bi_customer_mart")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching customer metrics:", error);
    return null;
  }

  return data;
}

export async function getInventoryMetrics() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bi_inventory_mart")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching inventory metrics:", error);
    return null;
  }

  return data;
}
