import { Metadata } from "next";
import { getAuditByIdAction, getAuditItemsAction, updateAuditStatusAction } from "@/app/actions/manager/inventory.actions";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AuditPerformForm } from "@/features/inventory/components/audit-perform-form";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Perform Audit | Manager Dashboard",
};

export default async function PerformAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const [auditRes, itemsRes] = await Promise.all([
    getAuditByIdAction(id),
    getAuditItemsAction(id)
  ]);

  if (!auditRes.success || !auditRes.data) {
    notFound();
  }

  const audit = auditRes.data;
  const items = itemsRes.data || [];
  
  // If the audit is PLANNED and someone opens it, automatically mark it IN_PROGRESS
  if (audit.status === "PLANNED") {
    await updateAuditStatusAction(audit.id, "IN_PROGRESS");
    audit.status = "IN_PROGRESS";
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/manager/inventory/audits">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Audit #{audit.id.slice(0, 8)}</h1>
              <Badge variant={audit.status === "COMPLETED" ? "default" : "secondary"}>
                {audit.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Warehouse: {audit.warehouse?.name}
            </p>
          </div>
        </div>
      </div>

      <AuditPerformForm audit={audit} items={items} />
    </div>
  );
}
