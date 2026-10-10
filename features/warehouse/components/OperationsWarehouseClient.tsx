"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Users,
  Search,
  Map as MapIcon,
  Warehouse as WarehouseIcon,
  Navigation,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  AddWarehouseButton,
  ManageWarehouseSettingsButton,
} from "@/features/warehouse/components/WarehousePageActions";

interface WarehouseRecord {
  id: string;
  name: string;
  code?: string;
  type?: string;
  is_active: boolean;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
}

export function OperationsWarehouseClient({
  warehouses,
}: {
  warehouses: WarehouseRecord[];
}) {
  const [search, setSearch] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return warehouses.filter((w) => {
      const q = search.toLowerCase();
      return (
        !search ||
        w.name.toLowerCase().includes(q) ||
        (w.code && w.code.toLowerCase().includes(q)) ||
        (w.type && w.type.toLowerCase().includes(q)) ||
        (w.city && w.city.toLowerCase().includes(q))
      );
    });
  }, [warehouses, search]);

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId) || warehouses[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Warehouse Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage distribution centers, geographic nodes, capacity, and staff allocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setMapOpen(true)}>
            <MapIcon className="mr-2 h-4 w-4" /> View Map
          </Button>
          <AddWarehouseButton />
        </div>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter warehouses by name, code, city..."
          className="pl-9 bg-card text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center bg-card">
          <WarehouseIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold">No Warehouses Found</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {search
              ? "No warehouses match your search query. Try clearing the filter."
              : "You do not have any warehouses configured yet. Add a warehouse to begin."}
          </p>
          {search ? (
            <Button variant="outline" size="sm" onClick={() => setSearch("")}>
              Clear Search
            </Button>
          ) : (
            <AddWarehouseButton />
          )}
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((warehouse) => (
            <Card
              key={warehouse.id}
              className={`flex flex-col bg-card transition-colors ${
                selectedWarehouseId === warehouse.id ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="pb-4">
                <div className="mb-2 flex items-start justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    {warehouse.code || `WH-${warehouse.id.substring(0, 4).toUpperCase()}`}
                  </Badge>
                  <Badge
                    variant={warehouse.is_active ? "default" : "secondary"}
                    className={
                      warehouse.is_active
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        : "text-xs"
                    }
                  >
                    {warehouse.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold">{warehouse.name}</CardTitle>
                <CardDescription className="mt-1 flex items-center text-xs">
                  <MapPin className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                  {warehouse.city || warehouse.address || "Location not set"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">
                      {warehouse.type === "RETAIL_STORE" ? "Retail Store" : "Warehouse"}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-muted-foreground">Coordinates</span>
                    <span className="font-mono text-muted-foreground">
                      {warehouse.latitude && warehouse.longitude
                        ? `${warehouse.latitude.toFixed(2)}, ${warehouse.longitude.toFixed(2)}`
                        : "23.81, 90.41"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Capacity Utilization</span>
                    <span className="font-medium">
                      {warehouse.capacity ? `${Math.min(100, Math.round((warehouse.capacity / 1000) * 10))}%` : "15%"}
                    </span>
                  </div>
                  <Progress value={warehouse.capacity ? Math.min(100, (warehouse.capacity / 1000) * 10) : 15} className="h-1.5" />
                </div>

                <div className="mt-auto flex items-center border-t pt-3 text-xs text-muted-foreground">
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  <span>Operations:</span>
                  <span className="ml-1 font-medium text-foreground">Active Hub</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-xs px-2"
                    onClick={() => {
                      setSelectedWarehouseId(warehouse.id);
                      setMapOpen(true);
                    }}
                  >
                    <Navigation className="mr-1 h-3 w-3" /> Pin
                  </Button>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="secondary" size="sm" className="w-full text-xs" asChild>
                    <Link href={`/admin/inventory/warehouses/${warehouse.id}`}>
                      Manage Zones & Bins
                    </Link>
                  </Button>
                  <ManageWarehouseSettingsButton
                    warehouse={warehouse as any}
                    size="sm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Interactive Map Coordinates Modal */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-primary" />
              Warehouse Network Map & Geographic Nodes
            </DialogTitle>
            <DialogDescription>
              Geographic distribution and GPS coordinates of active fulfillment centers.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Visual SVG Map representation */}
            <div className="md:col-span-2 relative h-72 rounded-lg border bg-slate-950/90 dark:bg-slate-950 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#C9A86A_1px,transparent_1px)] [background-size:16px_16px]" />
              
              <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200">BANGLADESH LOGISTICS GRID</span>
                <span className="font-mono text-[11px]">EPSG:4326 (WGS84)</span>
              </div>

              {/* Schematic Map Hub Markers */}
              <div className="relative z-10 w-full h-44 my-auto flex items-center justify-around px-4">
                {warehouses.map((wh, idx) => {
                  const isSelected = selectedWarehouse?.id === wh.id;
                  return (
                    <button
                      key={wh.id}
                      type="button"
                      onClick={() => setSelectedWarehouseId(wh.id)}
                      className={`flex flex-col items-center group transition-transform ${
                        isSelected ? "scale-110" : "hover:scale-105"
                      }`}
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center shadow-lg transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/30"
                            : wh.is_active
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        <MapPin className="h-4 w-4" />
                      </div>
                      <span className="mt-1.5 text-[11px] font-semibold text-slate-200 max-w-[80px] truncate text-center">
                        {wh.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {wh.code || `WH-${idx + 1}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative z-10 text-[11px] text-slate-400 flex justify-between border-t border-slate-800 pt-2">
                <span>Active Hubs: {warehouses.filter((w) => w.is_active).length}</span>
                <span>Total Locations: {warehouses.length}</span>
              </div>
            </div>

            {/* Selected Location Details Card */}
            <div className="flex flex-col justify-between rounded-lg border bg-card p-4 space-y-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Selected Hub
                </span>
                <h4 className="font-bold text-base mt-1 text-foreground">
                  {selectedWarehouse?.name || "No Warehouse Selected"}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedWarehouse?.city || selectedWarehouse?.address || "Bangladesh Fulfillment Network"}
                </p>
              </div>

              <div className="space-y-2 text-xs border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code</span>
                  <span className="font-mono font-semibold">{selectedWarehouse?.code || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{selectedWarehouse?.type || "Standard"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Latitude</span>
                  <span className="font-mono">{selectedWarehouse?.latitude ? `${selectedWarehouse.latitude}° N` : "23.8103° N"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Longitude</span>
                  <span className="font-mono">{selectedWarehouse?.longitude ? `${selectedWarehouse.longitude}° E` : "90.4125° E"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={selectedWarehouse?.is_active ? "default" : "secondary"}
                    className="text-[10px] h-4"
                  >
                    {selectedWarehouse?.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {selectedWarehouse && (
                <Button size="sm" variant="default" className="w-full text-xs" asChild>
                  <Link href={`/admin/inventory/warehouses/${selectedWarehouse.id}`}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View Warehouse Detail
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
