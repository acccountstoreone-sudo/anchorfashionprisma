import { createAdminClient } from "@/lib/supabase/server";

export type DateRange = {
  from: Date;
  to: Date;
};

export class AnalyticsRepository {
  /**
   * Executive Dashboard Data
   */
  static async getExecutiveSummary(dateRange?: DateRange) {
    const supabase = await createAdminClient();

    let periodDays = 30;
    let currentFrom = new Date();
    currentFrom.setDate(currentFrom.getDate() - 30);
    let currentTo = new Date();
    
    if (dateRange) {
      currentFrom = dateRange.from;
      currentTo = dateRange.to;
      periodDays = Math.max(1, Math.round((currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const previousFrom = new Date(currentFrom);
    previousFrom.setDate(previousFrom.getDate() - periodDays);
    
    const currentFromStr = currentFrom.toISOString().split("T")[0];
    const currentToStr = currentTo.toISOString().split("T")[0];
    const previousFromStr = previousFrom.toISOString().split("T")[0];

    // Revenue and Orders from BI Rollup if available, otherwise from orders table
    const { data: allRollups } = await supabase.from("bi_daily_revenue_rollup").select("*")
        .gte("date", previousFromStr)
        .lte("date", currentToStr);

    const rollups = allRollups?.filter(r => r.date >= currentFromStr) || [];
    const previousRollups = allRollups?.filter(r => r.date >= previousFromStr && r.date < currentFromStr) || [];

    // Customers
    const { data: allCustomers } = await supabase
      .from("customer_profiles")
      .select("id, created_at, is_active")
      .gte("created_at", previousFrom.toISOString())
      .lte("created_at", currentTo.toISOString());

    const customers = allCustomers?.filter(c => new Date(c.created_at) >= currentFrom) || [];
    const previousCustomers = allCustomers?.filter(c => new Date(c.created_at) >= previousFrom && new Date(c.created_at) < currentFrom) || [];

    // Products
    const { count: productsCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    // Inventory Value
    const { data: inventory } = await supabase
      .from("inventory_levels")
      .select("quantity_available");

    let totalRevenue = 0;
    let totalOrders = 0;
    let totalProfit = 0;

    let prevTotalRevenue = 0;
    let prevTotalOrders = 0;

    // Calculate today, week, month, year based on rollups
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    const monthAgo = new Date();
    monthAgo.setMonth(now.getMonth() - 1);
    const monthAgoStr = monthAgo.toISOString().split("T")[0];

    const yearAgo = new Date();
    yearAgo.setFullYear(now.getFullYear() - 1);
    const yearAgoStr = yearAgo.toISOString().split("T")[0];

    let todaysRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;

    rollups?.forEach((r) => {
      totalRevenue += r.total_revenue || 0;
      totalOrders += r.total_orders || 0;
      totalProfit += r.total_profit || 0;

      if (r.date === todayStr) todaysRevenue += r.total_revenue || 0;
      if (r.date >= weekAgoStr) weeklyRevenue += r.total_revenue || 0;
      if (r.date >= monthAgoStr) monthlyRevenue += r.total_revenue || 0;
      if (r.date >= yearAgoStr) yearlyRevenue += r.total_revenue || 0;
    });

    previousRollups?.forEach((r) => {
      prevTotalRevenue += r.total_revenue || 0;
      prevTotalOrders += r.total_orders || 0;
    });

    // Fallback if rollups are empty: query orders directly
    if (!allRollups || allRollups.length === 0) {
      const { data: orders } = await supabase
        .from("orders")
        .select("grand_total, status, created_at");
      if (orders) {
        orders.forEach((o) => {
          const s = (o.status || "").toLowerCase();
          if (s !== "cancelled" && s !== "returned") {
            const isCurrent = new Date(o.created_at) >= currentFrom;
            const amount = Number(o.grand_total) || 0;
            if (isCurrent) {
              totalRevenue += amount;
              totalOrders++;
              totalProfit += amount * 0.35; // Estimated profit margin
            } else {
              prevTotalRevenue += amount;
              prevTotalOrders++;
            }
          }
        });
      }
    }

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const prevAverageOrderValue = prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0;
    
    const totalCustomers = customers?.length || 0;
    const prevTotalCustomers = previousCustomers?.length || 0;
    
    const ordersPerCustomerVal = totalCustomers > 0 ? totalOrders / totalCustomers : 0;
    const prevOrdersPerCustomer = prevTotalCustomers > 0 ? prevTotalOrders / prevTotalCustomers : 0;
    
    // Instead of using 'status', we calculate active customers as those who made an order in the current period
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("customer_id")
      .gte("created_at", currentFrom.toISOString());
      
    const activeCustomers = new Set(recentOrders?.map(o => o.customer_id).filter(Boolean)).size || 0;

    const totalInventoryValue =
      (inventory?.reduce(
        (sum, item) => sum + (item.quantity_available || 0),
        0
      ) || 0) * 50; // Approximating $50 per item if we don't map to product

    const grossProfit = totalProfit; // Simplification
    const netProfit = totalProfit * 0.8; // Simplification (after taxes/expenses)

    const calcTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Number((((curr - prev) / prev) * 100).toFixed(1));
    };

    return {
      totalRevenue,
      revenueTrend: calcTrend(totalRevenue, prevTotalRevenue),
      todaysRevenue,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      grossProfit,
      netProfit,
      totalOrders,
      ordersTrend: calcTrend(totalOrders, prevTotalOrders),
      totalCustomers,
      customersTrend: calcTrend(totalCustomers, prevTotalCustomers),
      activeCustomers,
      productsCount: productsCount || 0,
      averageOrderValue,
      aovTrend: calcTrend(averageOrderValue, prevAverageOrderValue),
      ordersPerCustomer: Number(ordersPerCustomerVal.toFixed(1)),
      opcTrend: calcTrend(ordersPerCustomerVal, prevOrdersPerCustomer),
      inventoryValue: totalInventoryValue,
      revenueHistory:
        rollups?.map((r) => ({ name: r.date, total: r.total_revenue })) || [],
    };
  }

  /**
   * Sales Analytics
   */
  static async getSalesAnalytics(dateRange?: DateRange) {
    const supabase = await createAdminClient();

    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (dateRange) {
      fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
    }

    // Query real orders
    let ordersQuery = supabase
      .from("orders")
      .select(
        "id, order_number, grand_total, subtotal, shipping_total, discount_total, tax_total, payment_method, payment_status, status, created_at, customer_id"
      )
      .order("created_at", { ascending: true });

    if (fromDate && toDate) {
      ordersQuery = ordersQuery
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString());
    }

    const { data: rawOrders, error: ordersError } = await ordersQuery;
    if (ordersError) {
      console.error("Error fetching orders for sales analytics:", ordersError);
    }

    const orders = rawOrders || [];

    // Filter valid non-cancelled orders for sales calculation
    const validOrders = orders.filter((o) => {
      const s = (o.status || "").toLowerCase();
      return s !== "cancelled" && s !== "returned";
    });

    const validOrderIds = new Set(validOrders.map((o) => o.id));

    // Daily sales trend
    const salesByDate: Record<string, { revenue: number; ordersCount: number }> = {};
    validOrders.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split("T")[0];
      if (!salesByDate[date]) {
        salesByDate[date] = { revenue: 0, ordersCount: 0 };
      }
      salesByDate[date].revenue += Number(order.grand_total) || 0;
      salesByDate[date].ordersCount += 1;
    });

    const dailySales = Object.keys(salesByDate)
      .sort()
      .map((date) => ({
        date,
        revenue: Math.round(salesByDate[date].revenue * 100) / 100,
        orders: salesByDate[date].ordersCount,
      }));

    // Payment methods breakdown
    const paymentMethods: Record<string, number> = {};
    validOrders.forEach((order) => {
      let pm = (order.payment_method || "Other").toUpperCase();
      if (pm === "COD") pm = "Cash on Delivery";
      else if (pm === "BKASH") pm = "bKash";
      else if (pm === "SSLCOMMERZ") pm = "SSLCOMMERZ";
      else if (pm === "NAGAD") pm = "Nagad";

      paymentMethods[pm] =
        (paymentMethods[pm] || 0) + (Number(order.grand_total) || 0);
    });

    // Shipping methods breakdown
    const shippingMethods: Record<string, number> = {};
    validOrders.forEach((order) => {
      const st = Number(order.shipping_total) || 0;
      let sm = "Standard Delivery";
      if (st === 0) sm = "Free Shipping";
      else if (st === 60) sm = "Inside Dhaka";
      else if (st === 120) sm = "Express Dhaka";
      else if (st === 150) sm = "Outside Dhaka";
      else sm = `Standard (৳${st})`;

      shippingMethods[sm] =
        (shippingMethods[sm] || 0) + (Number(order.grand_total) || 0);
    });

    // Also fetch items, products & addresses to get Category breakdown, Top selling products & customer names
    const [itemsRes, productsRes, addressesRes] = await Promise.all([
      supabase
        .from("order_items")
        .select("id, order_id, product_id, product_name, quantity, line_total"),
      supabase
        .from("products")
        .select("id, name, category_id, categories(name)"),
      supabase
        .from("order_addresses")
        .select("order_id, first_name, last_name, city, address_type"),
    ]);

    const productMap = new Map((productsRes.data || []).map((p: any) => [p.id, p]));
    const categoryTotals: Record<string, number> = {};
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    (itemsRes.data || []).forEach((item: any) => {
      if (item.order_id && validOrderIds.has(item.order_id)) {
        const prod = productMap.get(item.product_id);
        const catName = prod?.categories?.name || "Apparel";
        const lineTotal = Number(item.line_total) || 0;
        const qty = Number(item.quantity) || 1;

        categoryTotals[catName] = (categoryTotals[catName] || 0) + lineTotal;

        const prodName = item.product_name || prod?.name || "Product";
        if (!productSalesMap[prodName]) {
          productSalesMap[prodName] = { name: prodName, quantity: 0, revenue: 0 };
        }
        productSalesMap[prodName].quantity += qty;
        productSalesMap[prodName].revenue += lineTotal;
      }
    });

    const categorySales = Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        quantity: p.quantity,
        revenue: Math.round(p.revenue * 100) / 100,
      }));

    // Customer mapping for recent orders
    const addressMap = new Map<string, string>();
    (addressesRes.data || []).forEach((addr: any) => {
      if (addr.order_id && (addr.first_name || addr.last_name)) {
        addressMap.set(
          addr.order_id,
          `${addr.first_name || ""} ${addr.last_name || ""}`.trim()
        );
      }
    });

    const recentOrders = validOrders.slice(-8).reverse().map((order) => {
      const customerName =
        addressMap.get(order.id) || "Valued Customer";

      return {
        id: order.id,
        orderNumber: order.order_number,
        customerName,
        amount: Number(order.grand_total) || 0,
        status: order.status,
        paymentMethod: order.payment_method || "COD",
        paymentStatus: order.payment_status || "PENDING",
        createdAt: order.created_at,
      };
    });

    const totalSales =
      Math.round(
        validOrders.reduce(
          (sum, o) => sum + (Number(o.grand_total) || 0),
          0
        ) * 100
      ) / 100;
    const totalOrdersCount = validOrders.length;
    const averageOrderValue =
      totalOrdersCount > 0
        ? Math.round((totalSales / totalOrdersCount) * 100) / 100
        : 0;
    const cancelledOrdersCount = orders.length - validOrders.length;

    return {
      dailySales,
      paymentMethodSales: Object.entries(paymentMethods).map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
      })),
      shippingMethodSales: Object.entries(shippingMethods).map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
      })),
      categorySales,
      topSellingProducts,
      recentOrders,
      totalSales,
      totalOrders: totalOrdersCount,
      averageOrderValue,
      cancelledOrdersCount,
    };
  }

  /**
   * Order Analytics
   */
  static async getOrderAnalytics(dateRange?: DateRange) {
    const supabase = await createAdminClient();
    let ordersQuery = supabase
      .from("orders")
      .select("id, status, created_at, grand_total");

    if (dateRange) {
      ordersQuery = ordersQuery
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());
    }

    const { data: orders } = await ordersQuery;

    const statusCounts: Record<string, number> = {
      pending: 0,
      processing: 0,
      packed: 0,
      shipped: 0,
      delivered: 0,
      returned: 0,
      cancelled: 0,
    };

    let totalRefunds = 0;
    let refundedOrdersCount = 0;

    orders?.forEach((order) => {
      const normalizedStatus = order.status?.toLowerCase() || "pending";
      if (statusCounts[normalizedStatus] !== undefined) {
        statusCounts[normalizedStatus]++;
      } else {
        statusCounts[normalizedStatus] = 1;
      }

      if (normalizedStatus === "returned" || normalizedStatus === "cancelled") {
        totalRefunds += Number(order.grand_total) || 0;
        refundedOrdersCount++;
      }
    });

    const statuses = Object.keys(statusCounts).map((name) => ({
      name,
      value: statusCounts[name],
    }));

    return {
      statuses,
      statusCounts,
      refundStatistics: {
        totalAmount: totalRefunds,
        count: refundedOrdersCount,
        rate: orders?.length ? (refundedOrdersCount / orders.length) * 100 : 0,
      },
      total: orders?.length || 0,
    };
  }

  /**
   * Customer Analytics
   */
  static async getCustomerAnalytics(dateRange?: DateRange) {
    const supabase = await createAdminClient();

    let customersQuery = supabase
      .from("customer_profiles")
      .select("id, created_at");
    if (dateRange) {
      customersQuery = customersQuery
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());
    }

    const { data: customers } = await customersQuery;
    const { data: orders } = await supabase
      .from("orders")
      .select("customer_id, grand_total");

    const customerGrowthByDate: Record<string, number> = {};
    customers?.forEach((c) => {
      const date = new Date(c.created_at).toISOString().split("T")[0];
      customerGrowthByDate[date] = (customerGrowthByDate[date] || 0) + 1;
    });

    const customerGrowth = Object.keys(customerGrowthByDate)
      .map((date) => ({
        date,
        customers: customerGrowthByDate[date],
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Lifetime Value and Top Customers
    const customerSpend: Record<string, number> = {};
    const orderCount: Record<string, number> = {};

    orders?.forEach((o) => {
      if (o.customer_id) {
        customerSpend[o.customer_id] =
          (customerSpend[o.customer_id] || 0) + (Number(o.grand_total) || 0);
        orderCount[o.customer_id] = (orderCount[o.customer_id] || 0) + 1;
      }
    });

    let returningCustomers = 0;
    let newCustomers = 0;

    Object.values(orderCount).forEach((count) => {
      if (count > 1) returningCustomers++;
      else newCustomers++;
    });

    const averageLTV =
      Object.values(customerSpend).length > 0
        ? Object.values(customerSpend).reduce((a, b) => a + b, 0) /
          Object.values(customerSpend).length
        : 0;

    return {
      totalCustomers: customers?.length || 0,
      newCustomers,
      returningCustomers,
      customerGrowth,
      averageLifetimeValue: averageLTV,
      customerSegments: [
        { name: "New (1 order)", value: newCustomers },
        { name: "Returning (>1 order)", value: returningCustomers },
      ],
    };
  }

  /**
   * Product & Inventory Analytics
   */
  static async getProductAnalytics() {
    const supabase = await createAdminClient();

    // Query inventory, products, orders, and order items concurrently
    const [invRes, productsRes, itemsRes, ordersRes] = await Promise.all([
      supabase
        .from("inventory_levels")
        .select("variant_id, quantity_available, reorder_point"),
      supabase
        .from("products")
        .select("id, name, created_at"),
      supabase
        .from("order_items")
        .select("id, order_id, product_id, product_name, quantity, unit_price, line_total"),
      supabase
        .from("orders")
        .select("id, status"),
    ]);

    const inventory = invRes.data || [];
    const products = productsRes.data || [];
    const orderItems = itemsRes.data || [];
    const orders = ordersRes.data || [];

    let outOfStock = 0;
    let lowStock = 0;
    let inStock = 0;

    inventory.forEach((item) => {
      if ((item.quantity_available || 0) <= 0) outOfStock++;
      else if ((item.quantity_available || 0) <= (item.reorder_point || 5)) lowStock++;
      else inStock++;
    });

    // Valid non-cancelled orders filter
    const validOrderIds = new Set(
      orders
        .filter((o) => {
          const s = (o.status || "").toLowerCase();
          return s !== "cancelled" && s !== "returned";
        })
        .map((o) => o.id)
    );

    const productMap = new Map(products.map((prod) => [prod.id, prod.name]));

    // Aggregate Best Sellers & Sales by Product
    const productSales: Record<
      string,
      { id: string; name: string; quantitySold: number; revenue: number }
    > = {};

    orderItems.forEach((item) => {
      // If order_id exists, only include non-cancelled orders
      if (item.order_id && !validOrderIds.has(item.order_id)) return;

      const key = item.product_id || item.product_name || item.id;
      const name =
        (item.product_id && productMap.get(item.product_id)) ||
        item.product_name ||
        "Product";

      if (!productSales[key]) {
        productSales[key] = {
          id: key,
          name,
          quantitySold: 0,
          revenue: 0,
        };
      }

      const qty = Number(item.quantity) || 1;
      const rev =
        Number(item.line_total) ||
        qty * (Number(item.unit_price) || 0);

      productSales[key].quantitySold += qty;
      productSales[key].revenue += rev;
    });

    // Best Sellers sorted primarily by Revenue (Highest revenue generating products), then Qty Sold
    const salesArray = Object.values(productSales).sort(
      (a, b) => b.revenue - a.revenue || b.quantitySold - a.quantitySold
    );

    // Worst Sellers (products with lowest sales)
    const worstSellers = [...salesArray].reverse().slice(0, 10);

    // Most active products (or newly added products as traffic proxy)
    const mostViewed = products
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        views: 0,
      }));

    return {
      stockLevels: [
        { name: "In Stock", value: inStock },
        { name: "Low Stock", value: lowStock },
        { name: "Out of Stock", value: outOfStock },
      ],
      lowStockProducts: lowStock,
      outOfStockProducts: outOfStock,
      totalItems: inventory.length || 0,
      bestSellers: salesArray.slice(0, 10),
      worstSellers: worstSellers,
      mostViewedProducts: mostViewed,
    };
  }

  /**
   * Marketing Analytics
   */
  static async getMarketingAnalytics(dateRange?: DateRange) {
    const supabase = await createAdminClient();

    let couponsQuery = supabase
      .from("coupon_usages")
      .select("discount_applied, created_at, code");
    if (dateRange) {
      couponsQuery = couponsQuery
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());
    }
    const { data: coupons } = await couponsQuery;

    const { data: customers } = await supabase
      .from("customer_profiles")
      .select("accepts_marketing");

    const totalDiscountGiven =
      coupons?.reduce((acc, c) => acc + (c.discount_applied || 0), 0) || 0;

    const newsletterSubscribers =
      customers?.filter((c) => c.accepts_marketing).length || 0;

    const couponUsageStats: Record<string, number> = {};
    coupons?.forEach((c) => {
      if (c.code) {
        couponUsageStats[c.code] = (couponUsageStats[c.code] || 0) + 1;
      }
    });

    const topCoupons = Object.keys(couponUsageStats)
      .map((code) => ({
        code,
        uses: couponUsageStats[code],
      }))
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 5);

    return {
      couponsUsed: coupons?.length || 0,
      totalDiscountGiven,
      newsletterSubscribers,
      topCoupons,
    };
  }

  /**
   * Alias for Inventory Analytics
   */
  static async getInventoryAnalytics() {
    return this.getProductAnalytics();
  }
}
