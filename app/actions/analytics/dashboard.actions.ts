"use server";

import { AnalyticsService } from "@/services/analytics.service";
import { DateRange } from "@/repositories/analytics.repository";

export async function getExecutiveSummaryAction(dateRange?: DateRange) {
  try {
    const data = await AnalyticsService.getExecutiveSummary(dateRange);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSalesAnalyticsAction(dateRange?: DateRange) {
  try {
    const data = await AnalyticsService.getSalesAnalytics(dateRange);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getOrderAnalyticsAction(dateRange?: DateRange) {
  try {
    const data = await AnalyticsService.getOrderAnalytics(dateRange);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCustomerAnalyticsAction(dateRange?: DateRange) {
  try {
    const data = await AnalyticsService.getCustomerAnalytics(dateRange);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProductAnalyticsAction() {
  try {
    const data = await AnalyticsService.getProductAnalytics();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getInventoryAnalyticsAction() {
  try {
    const data = await AnalyticsService.getInventoryAnalytics();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMarketingAnalyticsAction(dateRange?: DateRange) {
  try {
    const data = await AnalyticsService.getMarketingAnalytics(dateRange);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAiInsightsAction() {
  try {
    const data = await AnalyticsService.getExecutiveSummary();
    
    // Generate deterministic insights based on real data
    const revenueTrend = data.revenueTrend || 0;
    const summary = revenueTrend >= 0 
      ? `Revenue is up ${revenueTrend}% this period, showing solid growth across key categories.`
      : `Revenue is down ${Math.abs(revenueTrend)}% this period, indicating a need for targeted marketing interventions.`;

    const risks = [];
    if (data.revenueTrend < 0) risks.push("Overall revenue is trending downwards compared to the previous period.");
    if (data.ordersTrend < 0) risks.push("Order volume has decreased, potentially indicating reduced customer intent.");
    if (risks.length === 0) risks.push("No critical risks identified in the current period.");

    const recommendations = [];
    if (data.inventoryValue > 100000) {
      recommendations.push({
        type: "Inventory",
        action: "High inventory value detected. Consider discounting slow-moving stock.",
      });
    }
    if (data.customersTrend < 0) {
      recommendations.push({
        type: "Marketing",
        action: "Active customers are down. Launch a re-engagement email campaign with targeted offers.",
      });
    }
    if (recommendations.length === 0) {
      recommendations.push({
        type: "Strategy",
        action: "Maintain current trajectory. Conversion rates and sales are stable.",
      });
    }

    return { 
      success: true, 
      data: {
        summary,
        risks,
        recommendations
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCustomReportAction() {
  try {
    const salesData = await AnalyticsService.getSalesAnalytics();
    
    // Transform paymentMethodSales to custom report format
    const rows = salesData.paymentMethodSales.map((pm: any) => [
      pm.name || "Unknown",
      pm.value
    ]);

    return {
      success: true,
      data: {
        reportName: "Sales by Payment Method (Real Data)",
        columns: ["Payment Method", "Total Sales"],
        rows: rows
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
