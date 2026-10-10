"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adjustStockAction } from "@/app/actions/manager/inventory.actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdjustStockDialogProps {
  inventoryId: string;
  sku: string;
  productName: string;
  currentAvailable: number;
  currentReserved: number;
}

export function AdjustStockDialog({
  inventoryId,
  sku,
  productName,
  currentAvailable,
  currentReserved,
}: AdjustStockDialogProps) {
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(currentAvailable);
  const [reserved, setReserved] = useState(currentReserved);
  const [reason, setReason] = useState("Cycle count / physical stock verification");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (available < 0 || reserved < 0) {
      toast.error("Stock quantities cannot be negative");
      return;
    }

    setLoading(true);
    try {
      const res = await adjustStockAction(inventoryId, available, reserved, reason);
      if (res.success) {
        toast.success(`Stock adjusted successfully for SKU ${sku}`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to adjust stock");
      }
    } catch {
      toast.error("Failed to adjust stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Adjust
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleAdjust}>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Update stock counts for <span className="font-semibold text-foreground">{productName}</span> ({sku}).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="available" className="text-right text-xs font-medium">
                Available
              </Label>
              <Input
                id="available"
                type="number"
                min={0}
                value={available}
                onChange={(e) => setAvailable(parseInt(e.target.value, 10) || 0)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reserved" className="text-right text-xs font-medium">
                Reserved
              </Label>
              <Input
                id="reserved"
                type="number"
                min={0}
                value={reserved}
                onChange={(e) => setReserved(parseInt(e.target.value, 10) || 0)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right text-xs font-medium">
                Reason
              </Label>
              <Input
                id="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for adjustment"
                className="col-span-3"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
