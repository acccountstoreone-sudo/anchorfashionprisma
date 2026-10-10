"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

function getCustomerName(t: any): string {
  if (t.customer_name && typeof t.customer_name === "string") return t.customer_name;
  if (typeof t.customer === "string") return t.customer;
  if (t.customer && typeof t.customer === "object") {
    return t.customer.full_name || t.customer.name || t.customer.phone || "Customer";
  }
  return "Guest";
}

export function ExportTicketsButton({ tickets = [] }: { tickets?: any[] }) {
  const handleExport = () => {
    try {
      if (!tickets || tickets.length === 0) {
        toast.error("No tickets to export");
        return;
      }

      const headers = ["Ticket ID", "Subject", "Customer", "Priority", "Status", "Created At"];
      const csvData = tickets.map((t) => [
        `"${String(t.ticket_number || t.id || "").replace(/"/g, '""')}"`,
        `"${String(t.subject || "").replace(/"/g, '""')}"`,
        `"${getCustomerName(t).replace(/"/g, '""')}"`,
        `"${String(t.priority || "MEDIUM").toUpperCase()}"`,
        `"${String(t.status || "OPEN").toUpperCase()}"`,
        `"${new Date(t.created_at || Date.now()).toLocaleDateString()}"`,
      ]);

      const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `tickets_export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Tickets exported successfully");
    } catch (err: any) {
      toast.error("Failed to export tickets: " + (err.message || "Unknown error"));
    }
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export Data
    </Button>
  );
}
