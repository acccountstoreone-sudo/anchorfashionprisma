"use client";

import { useState } from "react";
import { useShipments } from "@/hooks/shipping/use-shipments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCcw,
  TrendingUp,
  Truck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useSyncTracking } from "@/hooks/shipping/use-shipments";
import { toast } from "sonner";

const ACTIVE_STATUSES = [
  "pickup_requested",
  "pickup_confirmed",
  "picked_up",
  "in_transit",
  "hub_received",
  "out_for_delivery",
];

export default function AdminTrackingDashboard() {
  const syncTracking = useSyncTracking();
  const [search, setSearch] = useState("");

  const { data: allData, isLoading } = useShipments({ limit: 100, page: 1 });
  const allShipments = allData?.data ?? [];
  const active = allShipments.filter((s: any) =>
    ACTIVE_STATUSES.includes(s.status)
  );

  const filtered = (search.trim() ? allShipments : active).filter((s: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.shipment_number?.toLowerCase().includes(q) ||
      s.tracking_number?.toLowerCase().includes(q) ||
      s.recipient_name?.toLowerCase().includes(q) ||
      s.courier_provider_code?.toLowerCase().includes(q) ||
      s.status?.toLowerCase().includes(q)
    );
  });

  const handleSyncAll = async () => {
    let synced = 0;
    let failed = 0;
    for (const s of active.slice(0, 10)) {
      try {
        await syncTracking.mutateAsync(s.id);
        synced++;
      } catch (err: any) {
        failed++;
        toast.error(`Sync failed for ${s.shipment_number}: ${err.message}`);
      }
    }
    if (synced > 0) {
      toast.success(`Synced tracking for ${synced} shipments`);
    }
    if (failed > 0) {
      toast.error(`Failed to sync ${failed} shipments. Check courier credentials.`);
    }
  };

  const statCards = [
    {
      label: "Active Shipments",
      value: active.length,
      icon: Truck,
      bgClass: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    },
    {
      label: "Out for Delivery",
      value: active.filter((s: any) => s.status === "out_for_delivery").length,
      icon: TrendingUp,
      bgClass: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
    },
    {
      label: "In Transit",
      value: active.filter((s: any) => s.status === "in_transit").length,
      icon: CheckCircle2,
      bgClass: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    },
    {
      label: "Pickup Pending",
      value: active.filter((s: any) => s.status === "pickup_requested").length,
      icon: AlertTriangle,
      bgClass: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Live Tracking Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Monitor all in-transit shipments in real time
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncAll}
            disabled={syncTracking.isPending}
            className="flex items-center gap-1"
          >
            <RefreshCcw className={`h-4 w-4 ${syncTracking.isPending ? "animate-spin" : ""}`} /> Sync All
          </Button>
          <Link href="/admin/shipping">
            <Button variant="outline" size="sm">
              ← Shipments
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, bgClass }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bgClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{search ? "Matching Shipments" : "In-Transit Shipments"}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {search ? `Showing results matching "${search}"` : "Showing active in-transit shipments"}
            </p>
          </div>
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search tracking, order, recipient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">
              Loading…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment #</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Est. Delivery</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {search ? `No shipments matching "${search}".` : "No active shipments."}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">
                      <Link
                        href={`/admin/shipping/${s.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {s.shipment_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {s.courier_provider_code ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {s.tracking_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.recipient_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {s.status?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.estimated_delivery_date ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          syncTracking
                            .mutateAsync(s.id)
                            .then(() => toast.success("Synced"))
                            .catch((e) => toast.error(e.message))
                        }
                        disabled={syncTracking.isPending}
                      >
                        <RefreshCcw className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
