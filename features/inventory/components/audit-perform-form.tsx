"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateAuditItemCountAction, updateAuditStatusAction } from "@/app/actions/manager/inventory.actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function AuditPerformForm({ audit, items }: { audit: any; items: any[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCountSubmit(itemId: string, countedQuantity: number) {
    if (isNaN(countedQuantity) || countedQuantity < 0) {
      toast.error("Invalid quantity");
      return;
    }
    
    setLoading(itemId);
    const res = await updateAuditItemCountAction(itemId, countedQuantity, audit.id);
    setLoading(null);

    if (res.success) {
      toast.success("Count updated");
    } else {
      toast.error(res.error || "Failed to update count");
    }
  }

  async function handleCompleteAudit() {
    if (!confirm("Are you sure you want to complete this audit? This action cannot be undone.")) return;
    
    setLoading("complete");
    const res = await updateAuditStatusAction(audit.id, "COMPLETED");
    setLoading(null);

    if (res.success) {
      toast.success("Audit completed");
    } else {
      toast.error(res.error || "Failed to complete audit");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {audit.status !== "COMPLETED" && audit.status !== "CANCELLED" && (
          <Button onClick={handleCompleteAudit} disabled={loading === "complete"}>
            {loading === "complete" ? "Completing..." : "Complete Audit"}
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Counted</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  No items in this audit.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.variant?.sku}</TableCell>
                  <TableCell>{item.variant?.product?.name}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.expected_quantity}
                  </TableCell>
                  <TableCell className="text-right max-w-[120px]">
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const count = parseInt(formData.get("counted") as string);
                        handleCountSubmit(item.id, count);
                      }}
                      className="flex gap-2 justify-end"
                    >
                      <Input 
                        name="counted" 
                        type="number" 
                        min="0" 
                        defaultValue={item.counted_quantity ?? ""}
                        className="w-20 text-right"
                        disabled={audit.status === "COMPLETED"}
                      />
                      {audit.status !== "COMPLETED" && (
                        <Button type="submit" variant="secondary" size="sm" disabled={loading === item.id}>
                          Save
                        </Button>
                      )}
                    </form>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={item.variance > 0 ? "text-green-500" : item.variance < 0 ? "text-red-500" : ""}>
                      {item.variance !== null && item.variance !== undefined ? (item.variance > 0 ? `+${item.variance}` : item.variance) : "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "DISCREPANCY" ? "destructive" : item.status === "COUNTED" || item.status === "RESOLVED" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.status === "DISCREPANCY" && audit.status !== "COMPLETED" && (
                      <Button variant="outline" size="sm" onClick={() => handleCountSubmit(item.id, item.expected_quantity)}>
                        Accept Expected
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
