"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function NewsletterExportButton({ subscribers }: { subscribers: any[] }) {
  const handleExport = () => {
    try {
      if (!subscribers || subscribers.length === 0) {
        toast.error("No subscribers to export.");
        return;
      }

      // Prepare CSV content
      const headers = ["Email", "First Name", "Last Name", "Source", "Status", "Subscribed At"];
      
      const rows = subscribers.map(sub => [
        sub.email,
        sub.first_name || "",
        sub.last_name || "",
        sub.source || "",
        sub.status || "",
        sub.subscribed_at ? new Date(sub.subscribed_at).toISOString() : ""
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export CSV.");
    }
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" /> Export CSV
    </Button>
  );
}
