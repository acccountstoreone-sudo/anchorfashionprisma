"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function ExportOrdersButton({ orders = [] }: { orders?: any[] }) {
  const handleExport = () => {
    try {
      if (!orders || orders.length === 0) {
        toast.error("No orders to export");
        return;
      }

      const headers = ["Order Number", "Customer", "Date", "Status", "Total Amount"];
      const csvData = orders.map((o) => [
        `"${(o.order_number || o.id || "").replace(/"/g, '""')}"`,
        `"${(o.customer_name || o.customer_id || "Guest").replace(/"/g, '""')}"`,
        `"${new Date(o.created_at).toLocaleDateString()}"`,
        `"${(o.status || "").toUpperCase()}"`,
        o.grand_total || 0,
      ]);

      const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `orders_export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Orders exported successfully");
    } catch {
      toast.error("Failed to export orders");
    }
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
