"use client";

import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { exportToCsv } from "@/lib/utils/export";
import { toast } from "sonner";
import { CrmCustomer } from "@/features/crm/components/CustomersList";

interface CustomerPageActionsProps {
  customers: CrmCustomer[];
}

export function CustomerPageActions({ customers }: CustomerPageActionsProps) {
  const handleExport = () => {
    if (!customers || customers.length === 0) {
      toast.error("No customer data to export");
      return;
    }
    exportToCsv(
      `customers_export_${new Date().toISOString().split("T")[0]}.csv`,
      customers
    );
    toast.success("Customer data exported successfully");
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline">
        <Filter className="mr-2 h-4 w-4" />
        Filters
      </Button>
      <Button variant="outline" onClick={handleExport}>
        Export Data
      </Button>
    </div>
  );
}
