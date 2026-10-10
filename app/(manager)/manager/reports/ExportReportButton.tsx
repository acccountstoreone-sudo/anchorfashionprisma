"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ExportReportButtonProps {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    aov: number;
    newCustomers: number;
  };
  topSellers: Array<{
    product_name: string;
    category_name: string;
    sold: number;
    earnings: number;
  }>;
  days?: number;
}

export function ExportReportButton({ kpis, topSellers, days = 30 }: ExportReportButtonProps) {
  const handleExport = () => {
    try {
      const summaryRows = [
        ["Report Summary", `Last ${days} Days`],
        ["Generated At", new Date().toLocaleString()],
        ["Total Revenue (BDT)", kpis.totalRevenue.toString()],
        ["Total Orders", kpis.totalOrders.toString()],
        ["Average Order Value (BDT)", kpis.aov.toString()],
        ["New Customers", kpis.newCustomers.toString()],
        [],
        ["Top Selling Products"],
        ["Product Name", "Category", "Units Sold", "Total Earnings (BDT)"],
      ];

      const productRows = (topSellers || []).map((p) => [
        `"${(p.product_name || "Unknown").replace(/"/g, '""')}"`,
        `"${(p.category_name || "Apparel").replace(/"/g, '""')}"`,
        (p.sold || 0).toString(),
        (p.earnings || 0).toString(),
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        summaryRows.map((r) => r.join(",")).join("\n") +
        "\n" +
        productRows.map((r) => r.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `business_report_${days}d_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Business report exported successfully");
    } catch (err: any) {
      toast.error("Failed to export report: " + (err.message || "Unknown error"));
    }
  };

  return (
    <Button onClick={handleExport} className="gap-2">
      <Download className="h-4 w-4" />
      Export Report
    </Button>
  );
}
