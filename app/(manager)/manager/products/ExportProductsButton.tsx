"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function ExportProductsButton({ products }: { products: any[] }) {
  const handleExport = () => {
    try {
      if (products.length === 0) {
        toast.error("No products to export");
        return;
      }
      
      const headers = ["ID", "Name", "SKU", "Category", "Price", "Status"];
      const csvData = products.map(p => [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        p.sku || "",
        `"${(p.category?.name || "Uncategorized").replace(/"/g, '""')}"`,
        p.basePrice || p.base_price || 0,
        p.status
      ]);
      
      const csvContent = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Products exported successfully");
    } catch (error) {
      toast.error("Failed to export products");
    }
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export
    </Button>
  );
}
