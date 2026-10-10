"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";
import { ShipmentStatus, CourierProviderCode } from "@/types/shipping.types";

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  created: "bg-slate-100 text-slate-700",
  pickup_requested: "bg-blue-100 text-blue-700",
  pickup_confirmed: "bg-blue-200 text-blue-800",
  picked_up: "bg-indigo-100 text-indigo-700",
  in_transit: "bg-yellow-100 text-yellow-700",
  hub_received: "bg-orange-100 text-orange-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  delivery_failed: "bg-red-100 text-red-700",
  returned_to_origin: "bg-red-200 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  created: "Created",
  pickup_requested: "Pickup Requested",
  pickup_confirmed: "Pickup Confirmed",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  hub_received: "Hub Received",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  delivery_failed: "Failed",
  returned_to_origin: "RTO",
  cancelled: "Cancelled",
};

const COURIER_LABELS: Record<string, string> = {
  steadfast: "Steadfast",
  pathao: "Pathao",
  redx: "RedX",
  paperfly: "Paperfly",
  sundarban: "Sundarban",
  ecourier: "eCourier",
  dhl: "DHL",
  fedex: "FedEx",
  ups: "UPS",
  sandbox: "Sandbox",
};

export default function AdminShippingPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ShipmentStatus | undefined>();
  const [search, setSearch] = useState("");
  const [courierCode, setCourierCode] = useState<
    CourierProviderCode | undefined
  >();

  const { data, isLoading } = useShipments({
    page,
    limit: 20,
    status,
    search: search || undefined,
    courierCode,
  });
  const shipments = data?.data ?? [];
  const total = data?.total ?? 0;

  const [globalStats, setGlobalStats] = useState({
    total: 0,
    delivered: 0,
    failed: 0,
    inTransit: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shipping/analytics?days=30")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          const bd = json.data.statusBreakdown || {};
          setGlobalStats({
            total: json.data.total || 0,
            delivered: bd["delivered"] || 0,
            failed: (bd["delivery_failed"] || 0) + (bd["returned_to_origin"] || 0),
            inTransit: (bd["in_transit"] || 0) + (bd["out_for_delivery"] || 0) + (bd["picked_up"] || 0),
          });
        }
        setStatsLoading(false);
      })
      .catch(() => setStatsLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Shipment Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage courier assignments, labels, and tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/shipping/zones">
            <Button variant="outline" size="sm">
              Delivery Zones
            </Button>
          </Link>
          <Link href="/admin/shipping/providers">
            <Button variant="outline" size="sm">
              Courier Providers
            </Button>
          </Link>
          <Link href="/admin/shipping/analytics">
            <Button variant="outline" size="sm">
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Shipments</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : globalStats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2">
                <Truck className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : globalStats.inTransit}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : globalStats.delivered}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed/RTO</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : globalStats.failed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="flex gap-3">
        <Link href="/admin/shipping/tracking">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" /> Tracking Dashboard
          </Button>
        </Link>
        <Link href="/admin/shipping/returns">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" /> Returns / RTO
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Queue</CardTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input
              placeholder="Search shipment #, tracking #, name..."
              className="max-w-xs"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={status ?? ""}
              onChange={(e) => {
                setStatus((e.target.value as ShipmentStatus) || undefined);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={courierCode ?? ""}
              onChange={(e) => {
                setCourierCode(
                  (e.target.value as CourierProviderCode) || undefined
                );
                setPage(1);
              }}
            >
              <option value="">All Couriers</option>
              {Object.entries(COURIER_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading shipments…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment #</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>COD</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No shipments found.
                    </TableCell>
                  </TableRow>
                )}
                {shipments.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/shipping/${s.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {s.shipment_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${s.order_id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {s.order_number || "—"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium">
                        {s.courier_provider_code
                          ? (COURIER_LABELS[s.courier_provider_code] ??
                            s.courier_provider_code)
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{s.recipient_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.recipient_city}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">
                        {s.tracking_number ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.is_cod ? (
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                          ৳{s.cod_amount?.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${STATUS_COLORS[s.status as ShipmentStatus] ?? ""}`}
                      >
                        {STATUS_LABELS[s.status as ShipmentStatus] ?? s.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/shipping/${s.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} · {total} total
            </span>
            <Button
              variant="outline"
              disabled={!data || shipments.length < 20}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
