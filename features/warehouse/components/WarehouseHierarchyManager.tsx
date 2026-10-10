"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Layers,
  Grid,
  Box,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  ChevronRight,
  FolderTree,
  Loader2,
  CheckCircle2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { WarehouseZone, WarehouseBin, WarehouseRack } from "@/types/inventory.types";
import {
  createWarehouseZoneAction,
  updateWarehouseZoneAction,
  deleteWarehouseZoneAction,
  createRackAction,
  deleteRackAction,
  createWarehouseBinAction,
  updateWarehouseBinAction,
  deleteWarehouseBinAction,
} from "@/actions/warehouse.actions";

interface ZoneWithBins extends WarehouseZone {
  bins?: WarehouseBin[];
}

interface WarehouseHierarchyManagerProps {
  warehouseId: string;
  zones: ZoneWithBins[];
}

export function WarehouseHierarchyManager({
  warehouseId,
  zones: initialZones,
}: WarehouseHierarchyManagerProps) {
  const router = useRouter();

  // Dialog States
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<WarehouseZone | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneType, setZoneType] = useState("STORAGE");
  const [zoneDescription, setZoneDescription] = useState("");
  const [zoneLoading, setZoneLoading] = useState(false);

  // Rack Modal State
  const [rackModalOpen, setRackModalOpen] = useState(false);
  const [targetZoneForRack, setTargetZoneForRack] = useState<string>("");
  const [rackName, setRackName] = useState("");
  const [rackCode, setRackCode] = useState("");
  const [rackShelves, setRackShelves] = useState(4);
  const [rackCapacity, setRackCapacity] = useState(200);
  const [rackLoading, setRackLoading] = useState(false);

  // Bin/Shelf Modal State
  const [binModalOpen, setBinModalOpen] = useState(false);
  const [targetZoneForBin, setTargetZoneForBin] = useState<string>("");
  const [binCode, setBinCode] = useState("");
  const [binCapacity, setBinCapacity] = useState(50);
  const [binBarcode, setBinBarcode] = useState("");
  const [binLoading, setBinLoading] = useState(false);

  // Active expanded zone
  const [activeZoneId, setActiveZoneId] = useState<string>(initialZones[0]?.id || "");

  // Zone handlers
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      toast.error("Zone name is required");
      return;
    }
    setZoneLoading(true);

    if (editingZone) {
      const res = await updateWarehouseZoneAction(editingZone.id, warehouseId, {
        name: zoneName.trim(),
        type: zoneType,
        description: zoneDescription.trim() || undefined,
      });
      setZoneLoading(false);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Zone updated successfully");
        setZoneModalOpen(false);
        router.refresh();
      }
    } else {
      const res = await createWarehouseZoneAction({
        warehouse_id: warehouseId,
        name: zoneName.trim(),
        type: zoneType,
        description: zoneDescription.trim() || undefined,
      });
      setZoneLoading(false);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Zone created successfully");
        setZoneModalOpen(false);
        setZoneName("");
        setZoneDescription("");
        router.refresh();
      }
    }
  };

  const handleDeleteZone = async (zone: WarehouseZone) => {
    if (!confirm(`Are you sure you want to delete zone "${zone.name}"?`)) return;
    const res = await deleteWarehouseZoneAction(zone.id, warehouseId);
    if (res.success) {
      toast.success("Zone deleted");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to delete zone");
    }
  };

  // Rack handlers
  const handleCreateRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetZoneForRack) {
      toast.error("Please select a target zone");
      return;
    }
    if (!rackName.trim() && !rackCode.trim()) {
      toast.error("Rack name or code is required");
      return;
    }

    setRackLoading(true);
    const res = await createRackAction(targetZoneForRack, warehouseId, {
      name: rackName.trim() || `Rack ${rackCode.toUpperCase()}`,
      code: rackCode.trim().toUpperCase(),
      shelves_count: rackShelves,
      capacity: rackCapacity,
    });
    setRackLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Rack "${res.data?.name}" created with ${rackShelves} shelves`);
      setRackModalOpen(false);
      setRackName("");
      setRackCode("");
      router.refresh();
    }
  };

  const handleDeleteRack = async (zoneId: string, rackCode: string) => {
    if (!confirm(`Delete rack "${rackCode}" and all its shelves?`)) return;
    const res = await deleteRackAction(zoneId, rackCode, warehouseId);
    if (res.success) {
      toast.success("Rack deleted");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to delete rack");
    }
  };

  // Shelf/Bin handlers
  const handleCreateBin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetZoneForBin) {
      toast.error("Target zone is required");
      return;
    }
    if (!binCode.trim()) {
      toast.error("Shelf/Bin code is required");
      return;
    }

    setBinLoading(true);
    const res = await createWarehouseBinAction({
      zone_id: targetZoneForBin,
      code: binCode.trim().toUpperCase(),
      capacity_volume: binCapacity,
      barcode: binBarcode.trim() || binCode.trim().toUpperCase(),
      warehouseId,
    });
    setBinLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Shelf/Bin "${binCode.toUpperCase()}" created`);
      setBinModalOpen(false);
      setBinCode("");
      setBinBarcode("");
      router.refresh();
    }
  };

  const handleDeleteBin = async (binId: string) => {
    if (!confirm("Are you sure you want to delete this bin?")) return;
    const res = await deleteWarehouseBinAction(binId, warehouseId);
    if (res.success) {
      toast.success("Bin deleted");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to delete bin");
    }
  };

  // Group bins in each zone by Rack
  const getZoneRacks = (bins: WarehouseBin[] = []) => {
    const rackMap = new Map<string, WarehouseBin[]>();
    bins.forEach((b) => {
      const parts = b.code.split("-");
      const rackCode = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : parts[0];
      if (!rackMap.has(rackCode)) {
        rackMap.set(rackCode, []);
      }
      rackMap.get(rackCode)!.push(b);
    });
    return Array.from(rackMap.entries());
  };

  const activeZone = initialZones.find((z) => z.id === activeZoneId) || initialZones[0];

  return (
    <div className="space-y-6">
      {/* Top Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-primary" />
            Storage Hierarchy: Zones, Racks & Shelves/Bins
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize the warehouse floor into distinct operational zones, physical racks, and individual picking shelves.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              setEditingZone(null);
              setZoneName("");
              setZoneType("STORAGE");
              setZoneDescription("");
              setZoneModalOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Zone
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={initialZones.length === 0}
            onClick={() => {
              setTargetZoneForRack(activeZone?.id || initialZones[0]?.id || "");
              setRackModalOpen(true);
            }}
            className="gap-1.5"
          >
            <Grid className="h-4 w-4" /> Add Rack
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={initialZones.length === 0}
            onClick={() => {
              setTargetZoneForBin(activeZone?.id || initialZones[0]?.id || "");
              setBinModalOpen(true);
            }}
            className="gap-1.5"
          >
            <Box className="h-4 w-4" /> Add Shelf/Bin
          </Button>
        </div>
      </div>

      {initialZones.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CardContent className="space-y-3">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div className="space-y-1">
              <h3 className="font-semibold text-base">No Storage Zones Defined</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Zones partition your warehouse into functional areas such as Bulk Storage, Picking, Receiving, or Cold Storage.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingZone(null);
                setZoneModalOpen(true);
              }}
              size="sm"
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Create First Zone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Zone Selector Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
              Zones ({initialZones.length})
            </div>
            {initialZones.map((z) => {
              const isSelected = (activeZone?.id === z.id);
              const bins = z.bins || [];
              const racks = getZoneRacks(bins);

              return (
                <div
                  key={z.id}
                  onClick={() => setActiveZoneId(z.id)}
                  className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary font-semibold shadow-sm"
                      : "bg-card hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Layers className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="truncate text-left">
                      <div className="truncate text-sm">{z.name}</div>
                      <div className="text-[11px] font-normal text-muted-foreground flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 uppercase">
                          {z.type}
                        </Badge>
                        <span>{racks.length} racks • {bins.length} bins</span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingZone(z);
                          setZoneName(z.name);
                          setZoneType(z.type);
                          setZoneDescription(z.description || "");
                          setZoneModalOpen(true);
                        }}
                      >
                        <Edit className="mr-2 h-3.5 w-3.5" /> Edit Zone
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteZone(z)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Zone
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>

          {/* Active Zone Detail & Racks/Bins Grid */}
          <div className="lg:col-span-3 space-y-4">
            {activeZone && (
              <Card>
                <CardHeader className="pb-3 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold">{activeZone.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {activeZone.type}
                        </Badge>
                        <Badge variant={activeZone.status === "ACTIVE" ? "default" : "outline"} className="text-xs">
                          {activeZone.status || "ACTIVE"}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1 text-xs">
                        {activeZone.description || "No zone description specified."}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTargetZoneForRack(activeZone.id);
                          setRackModalOpen(true);
                        }}
                        className="gap-1 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Rack to Zone
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTargetZoneForBin(activeZone.id);
                          setBinModalOpen(true);
                        }}
                        className="gap-1 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Single Bin
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-6">
                  {/* Racks list */}
                  {getZoneRacks(activeZone.bins).length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-xs space-y-2">
                      <Grid className="h-8 w-8 mx-auto text-muted-foreground/40" />
                      <p>No racks or shelves configured in this zone yet.</p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setTargetZoneForRack(activeZone.id);
                          setRackModalOpen(true);
                        }}
                      >
                        Add Rack to {activeZone.name}
                      </Button>
                    </div>
                  ) : (
                    getZoneRacks(activeZone.bins).map(([rackCode, shelfBins]) => (
                      <div key={rackCode} className="border rounded-lg p-4 bg-muted/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Grid className="h-4 w-4 text-primary" />
                            <span className="font-bold text-sm text-foreground">
                              Rack: {rackCode}
                            </span>
                            <Badge variant="outline" className="text-[11px] font-mono">
                              {shelfBins.length} Shelves
                            </Badge>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteRack(activeZone.id, rackCode)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Rack
                          </Button>
                        </div>

                        {/* Shelf / Bin chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                          {shelfBins.map((bin) => (
                            <div
                              key={bin.id}
                              className="group relative flex flex-col p-2.5 rounded-md border bg-card hover:border-primary/50 transition-colors shadow-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-foreground truncate">
                                  {bin.code}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
                                  onClick={() => handleDeleteBin(bin.id)}
                                  title="Delete bin"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Cap: {bin.capacity_volume || 50}u</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT ZONE MODAL ──────────────────────────────────────────────── */}
      <Dialog open={zoneModalOpen} onOpenChange={setZoneModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingZone ? "Edit Storage Zone" : "Create Storage Zone"}</DialogTitle>
            <DialogDescription>
              Define a functional zone area within the warehouse floor layout.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveZone} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Zone Name *</Label>
              <Input
                placeholder="e.g. Zone A - Apparel Storage"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Zone Type *</Label>
              <Select value={zoneType} onValueChange={(v) => setZoneType(v || "STORAGE")}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STORAGE">Storage (Default / Bulk)</SelectItem>
                  <SelectItem value="PICKING">Picking Area (Fast Moving)</SelectItem>
                  <SelectItem value="RETURNS">Returns Area</SelectItem>
                  <SelectItem value="COLD_STORAGE">Cold Storage (Temperature Controlled)</SelectItem>
                  <SelectItem value="QUARANTINE">Quarantine / Damaged Goods</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Description (Optional)</Label>
              <Textarea
                placeholder="Zone layout details, temperature constraints, racking type..."
                value={zoneDescription}
                onChange={(e) => setZoneDescription(e.target.value)}
                rows={2}
                className="mt-1 text-xs resize-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setZoneModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={zoneLoading} className="gap-2">
                {zoneLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingZone ? "Update Zone" : "Create Zone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── ADD RACK MODAL ───────────────────────────────────────────────────── */}
      <Dialog open={rackModalOpen} onOpenChange={setRackModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Rack to Zone</DialogTitle>
            <DialogDescription>
              Generates physical vertical racking structure with automated shelf code allocation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRack} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Target Zone *</Label>
              <Select value={targetZoneForRack} onValueChange={(v) => setTargetZoneForRack(v || "")}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue placeholder="Select Zone" />
                </SelectTrigger>
                <SelectContent>
                  {initialZones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.name} ({z.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Rack Name *</Label>
                <Input
                  placeholder="e.g. Rack A-01"
                  value={rackName}
                  onChange={(e) => {
                    setRackName(e.target.value);
                    if (!rackCode) {
                      const auto = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                      setRackCode(auto ? `RACK-${auto}` : "");
                    }
                  }}
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Rack Code *</Label>
                <Input
                  placeholder="e.g. RACK-A01"
                  value={rackCode}
                  onChange={(e) => setRackCode(e.target.value.toUpperCase())}
                  className="mt-1 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Number of Shelves</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={rackShelves}
                  onChange={(e) => setRackShelves(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Total Capacity (units)</Label>
                <Input
                  type="number"
                  min={10}
                  value={rackCapacity}
                  onChange={(e) => setRackCapacity(Math.max(10, parseInt(e.target.value) || 10))}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <div className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span>
                Shelves will be automatically generated with sequential codes:{" "}
                <strong>{rackCode || "RACK-A01"}-S01</strong> to <strong>{rackCode || "RACK-A01"}-S0{rackShelves}</strong>.
              </span>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRackModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={rackLoading} className="gap-2">
                {rackLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Rack
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── ADD SINGLE SHELF/BIN MODAL ───────────────────────────────────────── */}
      <Dialog open={binModalOpen} onOpenChange={setBinModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Shelf / Bin Location</DialogTitle>
            <DialogDescription>
              Add an individual storage bin or custom location tag into a zone.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBin} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Target Zone *</Label>
              <Select value={targetZoneForBin} onValueChange={(v) => setTargetZoneForBin(v || "")}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue placeholder="Select Zone" />
                </SelectTrigger>
                <SelectContent>
                  {initialZones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.name} ({z.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Shelf / Bin Code *</Label>
              <Input
                placeholder="e.g. RACK-B02-S04 or BIN-FAST-01"
                value={binCode}
                onChange={(e) => setBinCode(e.target.value.toUpperCase())}
                className="mt-1 text-sm font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Max Capacity (Units)</Label>
                <Input
                  type="number"
                  min={1}
                  value={binCapacity}
                  onChange={(e) => setBinCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">Barcode (Optional)</Label>
                <Input
                  placeholder="Default to Code"
                  value={binBarcode}
                  onChange={(e) => setBinBarcode(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setBinModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={binLoading} className="gap-2">
                {binLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Shelf/Bin
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
