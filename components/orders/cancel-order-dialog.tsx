"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cancelCustomerOrderAction } from "@/app/actions/oms/order.actions";

interface CancelOrderDialogProps {
  orderId: string;
  orderNumber: string;
}

const CANCELLATION_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price",
  "Wrong size/item selected",
  "Delivery taking too long",
  "Payment issue",
  "Duplicate order",
  "Other",
];

export function CancelOrderDialog({ orderId, orderNumber }: CancelOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const router = useRouter();

  const handleCancel = async () => {
    if (!reason) {
      toast.error("Please select a cancellation reason");
      return;
    }
    if (reason === "Other" && !note.trim()) {
      toast.error("Please provide a note for 'Other' reason");
      return;
    }

    setLoading(true);
    try {
      const res = await cancelCustomerOrderAction(orderId, reason, note.trim());
      if (res.success) {
        toast.success("Order cancelled successfully");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to cancel order");
        // We still refresh to get the latest authoritative state
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Order
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cancel Order {orderNumber}</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this order? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for cancellation <span className="text-destructive">*</span></Label>
            <Select value={reason} onValueChange={(val) => setReason(val || "")}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {(reason === "Other" || reason) && (
            <div className="grid gap-2">
              <Label htmlFor="note">
                Additional Note {reason === "Other" && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Please provide any additional details..."
                className="col-span-3"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Close
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading || !reason || (reason === 'Other' && !note.trim())}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
