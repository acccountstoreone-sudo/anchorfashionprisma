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
    .from("bi_daily_revenue_rollup")
    .select("date, total_revenue, total_profit")
    .order("date", { ascending: true })
    .limit(30);

  if (error) {
    console.error("Error fetching sales trends:", error);
    return [];
  }

  return data.map((day: any) => ({
    date: new Date(day.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    sales: Number(day.total_revenue),
    profit: Number(day.total_profit),
  }));
}

export async function getTopCategories() {
  const supabase = await createClient();
  // Using an RPC call or complex grouping if needed, or querying a pre-aggregated view
  // Fallback to mock data representing what the SQL query would return
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
