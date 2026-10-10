"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Layers, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createWarehouseZoneAction,
  deleteWarehouseZoneAction,
  createWarehouseBinAction,
  deleteWarehouseBinAction,
} from "@/actions/warehouse.actions";
import { toast } from "sonner";

export function AddZoneButton({ warehouseId }: { warehouseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("PICKING");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a zone name");
      return;
    }
    setLoading(true);
    const res = await createWarehouseZoneAction({
      warehouse_id: warehouseId,
      name: name.trim(),
      type,
    });
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Zone "${name}" created successfully`);
      setOpen(false);
      setName("");
      router.refresh();
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="mr-1.5 h-4 w-4" /> Add Zone
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Create Storage Zone
            </DialogTitle>
            <DialogDescription>
              Define a physical area or sector in this warehouse (e.g., Aisle 1, Cold Bay, Staging).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zone_name">Zone Name</Label>
              <Input
                id="zone_name"
                placeholder="e.g. Zone A - Fast Moving"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone_type">Zone Type</Label>
              <Select value={type} onValueChange={(val) => setType(val || "PICKING")}>
                <SelectTrigger id="zone_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PICKING">Picking (Fast retrieval)</SelectItem>
                  <SelectItem value="BULK_STORAGE">Bulk Storage (Pallet racks)</SelectItem>
                  <SelectItem value="RECEIVING">Receiving / Inbound Staging</SelectItem>
                  <SelectItem value="PACKING">Packing & Sorting</SelectItem>
                  <SelectItem value="RETURNS">Customer Returns</SelectItem>
                  <SelectItem value="COLD_STORAGE">Temperature Controlled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Zone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AddBinButton({
  zoneId,
  zoneName,
  warehouseId,
}: {
  zoneId: string;
  zoneName: string;
  warehouseId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [volume, setVolume] = useState("");
  const [maxWeight, setMaxWeight] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter a bin code");
      return;
    }
    setLoading(true);
    const res = await createWarehouseBinAction(
      {
        zone_id: zoneId,
        code: code.trim(),
        barcode: barcode.trim() || undefined,
        capacity_volume: volume ? parseFloat(volume) : undefined,
        capacity_weight: maxWeight ? parseFloat(maxWeight) : undefined,
      },
      warehouseId
    );
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Bin "${code}" added to ${zoneName}`);
      setOpen(false);
      setCode("");
      setBarcode("");
      setVolume("");
      setMaxWeight("");
      router.refresh();
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Add Bin
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5 text-primary" />
              Add Storage Bin ({zoneName})
            </DialogTitle>
            <DialogDescription>
              Assign a distinct bin, shelf, or rack identifier within this zone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bin_code">Bin Code <span className="text-destructive">*</span></Label>
              <Input
                id="bin_code"
                placeholder="e.g. BIN-A1-01"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (!barcode) setBarcode(e.target.value.toUpperCase());
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode Identifier</Label>
              <Input
                id="barcode"
                placeholder="e.g. BAR-001298"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="volume">Volume (m³)</Label>
                <Input
                  id="volume"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 1.5"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxWeight">Max Weight (kg)</Label>
                <Input
                  id="maxWeight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 250"
                  value={maxWeight}
                  onChange={(e) => setMaxWeight(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Bin
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteZoneButton({
  zoneId,
  zoneName,
  warehouseId,
}: {
  zoneId: string;
  zoneName: string;
  warehouseId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete zone "${zoneName}" and all its bins?`)) return;
    setLoading(true);
    const res = await deleteWarehouseZoneAction(zoneId, warehouseId);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Zone "${zoneName}" deleted`);
      router.refresh();
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-destructive hover:bg-destructive/10"
      onClick={handleDelete}
      disabled={loading}
      title="Delete Zone"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

export function DeleteBinButton({
  binId,
  binCode,
  warehouseId,
}: {
  binId: string;
  binCode: string;
  warehouseId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete storage bin "${binCode}"?`)) return;
    setLoading(true);
    const res = await deleteWarehouseBinAction(binId, warehouseId);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Bin "${binCode}" deleted`);
      router.refresh();
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
      onClick={handleDelete}
      disabled={loading}
      title="Delete Bin"
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  );
}
