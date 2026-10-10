"use client";

import { useState } from "react";
import { updateOrderStatusAction } from "@/app/actions/oms/order.actions";
import { OrderStatus } from "@/types/oms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function OrderStatusUpdater({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState<string>(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleUpdate = async () => {
    if (status === currentStatus) return;
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const result = await updateOrderStatusAction({
      order_id: orderId,
      new_status: status as OrderStatus,
    });

    setIsLoading(false);
    if (result.success) {
      setSuccessMessage("Status updated successfully.");
    } else {
      setError(result.error || "Failed to update status");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Order Status</label>
        <Select value={status} onValueChange={(val) => { if (val) setStatus(val); }} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_payment">Pending Payment</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {successMessage && <p className="text-sm text-green-500">{successMessage}</p>}
      <Button 
        className="w-full" 
        onClick={handleUpdate} 
        disabled={isLoading || status === currentStatus}
      >
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
