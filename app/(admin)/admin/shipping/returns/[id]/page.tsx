"use client";

import { use } from "react";
import {
  useReturnDetail,
  useApproveReturn,
  useRejectReturn,
  useMarkReturnReceived,
  useSyncReturnInventory,
  useCompleteReturn,
} from "@/hooks/shipping/use-returns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { RotateCcw, CheckCircle2, XCircle, Package } from "lucide-react";
import { ReturnStatus } from "@/types/shipping.types";

const STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  pickup_scheduled: "Pickup Scheduled",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  received: "Received",
  inventory_synced: "Inventory Synced",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<ReturnStatus, string> = {
  requested: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  pickup_scheduled: "bg-indigo-100 text-indigo-700",
  picked_up: "bg-purple-100 text-purple-700",
  in_transit: "bg-orange-100 text-orange-700",
  received: "bg-teal-100 text-teal-700",
  inventory_synced: "bg-emerald-100 text-emerald-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function ReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: returnRecord, isLoading, error } = useReturnDetail(id);

  const approve = useApproveReturn();
  const reject = useRejectReturn();
  const markReceived = useMarkReturnReceived();
  const syncInventory = useSyncReturnInventory();
  const complete = useCompleteReturn();

  if (isLoading)
    return <div className="p-8 text-muted-foreground">Loading return…</div>;
  if (error || !returnRecord)
    return (
      <div className="p-8 space-y-3">
        <div className="text-red-500 font-medium">Error loading return: {error?.message || "Return not found."}</div>
        <Link href="/admin/shipping/returns" className="text-sm text-primary hover:underline block">
          ← Back to Returns List
        </Link>
      </div>
    );

  const statusColor =
    STATUS_COLORS[returnRecord.status as ReturnStatus] ??
    "bg-gray-100 text-gray-700";
  const statusLabel =
    STATUS_LABELS[returnRecord.status as ReturnStatus] ?? returnRecord.status;

  const handleApprove = async () => {
    try {
      await approve.mutateAsync(id);
      toast.success("Return approved");
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleReject = async () => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try {
      await reject.mutateAsync({ returnId: id, reason });
      toast.success("Return rejected");
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleReceived = async () => {
    try {
      await markReceived.mutateAsync(id);
      toast.success("Marked as received");
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleSyncInventory = async () => {
    try {
      await syncInventory.mutateAsync(id);
      toast.success("Inventory synced");
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleComplete = async () => {
    try {
      await complete.mutateAsync(id);
      toast.success("Return completed");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/shipping/returns"
            className="mb-2 block text-sm text-blue-600 hover:underline"
          >
            ← Returns
          </Link>
          <h1 className="text-2xl font-bold">{returnRecord.return_number}</h1>
          <p className="text-sm text-muted-foreground">
            Order: <span className="font-medium">{returnRecord.order_id}</span>
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Return Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="h-4 w-4" /> Return Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Reason:</span>{" "}
            <span>{returnRecord.reason}</span>
          </div>
          {returnRecord.notes && (
            <div>
              <span className="text-muted-foreground">Notes:</span>{" "}
              <span>{returnRecord.notes}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Requested:</span>{" "}
            <span>{new Date(returnRecord.created_at).toLocaleString()}</span>
          </div>
          {returnRecord.received_at && (
            <div>
              <span className="text-muted-foreground">Received:</span>{" "}
              <span>{new Date(returnRecord.received_at).toLocaleString()}</span>
            </div>
          )}
          {returnRecord.completed_at && (
            <div>
              <span className="text-muted-foreground">Completed:</span>{" "}
              <span>
                {new Date(returnRecord.completed_at).toLocaleString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      {returnRecord.items && returnRecord.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" /> Returned Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {returnRecord.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b pb-2 text-sm last:border-0"
                >
                  <div>
                    <div className="font-medium">{item.product_name}</div>
                    <div className="text-xs text-muted-foreground">
                      SKU: {item.sku} · Condition:{" "}
                      <span className="capitalize">{item.condition}</span>
                    </div>
                    {item.reason && (
                      <div className="text-xs text-muted-foreground">
                        Reason: {item.reason}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div>× {item.quantity}</div>
                    {item.restocked && (
                      <div className="text-xs text-green-600">✓ Restocked</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {returnRecord.status === "requested" && (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={approve.isPending}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleReject}
                  disabled={reject.isPending}
                >
                  <XCircle className="mr-1 h-4 w-4" /> Reject
                </Button>
              </>
            )}
            {returnRecord.status === "picked_up" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReceived}
                disabled={markReceived.isPending}
              >
                <Package className="mr-1 h-4 w-4" /> Mark Received
              </Button>
            )}
            {returnRecord.status === "received" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncInventory}
                disabled={syncInventory.isPending}
              >
                <RotateCcw className="mr-1 h-4 w-4" /> Sync Inventory
              </Button>
            )}
            {returnRecord.status === "inventory_synced" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleComplete}
                disabled={complete.isPending}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" /> Complete Return
              </Button>
            )}
            {["delivered", "cancelled", "completed", "rejected"].includes(
              returnRecord.status
            ) && (
              <p className="text-sm italic text-muted-foreground">
                This return is in a terminal state — no further actions
                available.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
