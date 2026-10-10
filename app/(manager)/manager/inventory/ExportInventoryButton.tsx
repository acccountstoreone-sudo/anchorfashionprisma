"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function ExportInventoryButton({ items = [] }: { items?: any[] }) {
  const handleExport = () => {
    try {
      if (!items || items.length === 0) {
        toast.error("No inventory records to export");
        return;
      }

      const headers = ["SKU", "Product Name", "Warehouse", "Available", "Reserved", "Status"];
      const csvData = items.map((i) => [
        `"${(i.sku || "").replace(/"/g, '""')}"`,
        `"${(i.name || "").replace(/"/g, '""')}"`,
        `"${(i.warehouse || "").replace(/"/g, '""')}"`,
        i.available ?? 0,
        i.reserved ?? 0,
        `"${(i.status || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `inventory_export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Inventory exported successfully");
    } catch {
      toast.error("Failed to export inventory");
    }
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export
    </Button>
  );
}
