import React from "react";
import { getLeadsAction } from "@/actions/crm.actions";
import { LeadsClient } from "@/features/crm/components/LeadsClient";

export const metadata = {
  title: "Leads Management | CRM | Anchor Fashion Enterprise",
};

export const dynamic = "force-dynamic";

export default async function LeadsManagementPage() {
  const { data: leads, error } = await getLeadsAction();

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-semibold">Failed to load CRM leads</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return <LeadsClient initialLeads={leads || []} />;
}
