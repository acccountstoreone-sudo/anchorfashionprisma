"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function ExportCustomersButton({ customers = [] }: { customers?: any[] }) {
  const handleExport = () => {
    try {
      if (!customers || customers.length === 0) {
        toast.error("No customers to export");
        return;
      }

      const headers = ["Name", "Email", "VIP", "Lifecycle Stage", "Health Score"];
      const csvData = customers.map((c) => [
        `"${(`${c.first_name || ""} ${c.last_name || ""}`).trim().replace(/"/g, '""')}"`,
        `"${(c.email || "").replace(/"/g, '""')}"`,
        c.is_vip ? "YES" : "NO",
        `"${(c.customer_lifecycle_stage || "").replace(/"/g, '""')}"`,
        c.health_score ?? 0,
      ]);

      const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `customers_export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Customers exported successfully");
    } catch {
      toast.error("Failed to export customers");
    }
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
