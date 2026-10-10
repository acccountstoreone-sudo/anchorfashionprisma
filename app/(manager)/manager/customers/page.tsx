import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { fetchCustomersAction } from "@/app/actions/crm/customer.actions";
import { CustomersList } from "@/features/crm/components/CustomersList";
import { CustomerSearch } from "@/features/crm/components/customer-search";
import { ExportCustomersButton } from "./ExportCustomersButton";

export const metadata: Metadata = {
  title: "Customers | Manager Dashboard",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { data: customers } = await fetchCustomersAction(20, q);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your customer base and view their order history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCustomersButton customers={customers || []} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <CustomerSearch />
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <CustomersList customers={customers || []} />
    </div>
  );
}
