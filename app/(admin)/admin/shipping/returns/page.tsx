"use client";

import { useState } from "react";
import {
  useReturns,
  useApproveReturn,
  useRejectReturn,
  useMarkReturnReceived,
  useCompleteReturn,
} from "@/hooks/shipping/use-returns";
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
import { Input } from "@/components/ui/input";
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

export default function AdminReturnsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReturnStatus | undefined>();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useReturns({
    page,
    limit: 20,
    status,
    search: search || undefined,
  });
  const approveReturn = useApproveReturn();
  const rejectReturn = useRejectReturn();
  const markReceived = useMarkReturnReceived();
  const completeReturn = useCompleteReturn();

  const returns = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleApprove = async (returnId: string) => {
    try {
      await approveReturn.mutateAsync(returnId);
      toast.success("Return approved");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReject = async (returnId: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try {
      await rejectReturn.mutateAsync({ returnId, reason });
      toast.success("Return rejected");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleMarkReceived = async (returnId: string) => {
    try {
      await markReceived.mutateAsync(returnId);
      toast.success("Marked as received");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleComplete = async (returnId: string) => {
    try {
      await completeReturn.mutateAsync(returnId);
      toast.success("Return completed");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Returns & RTO</h1>
          <p className="mt-1 text-muted-foreground">
            Manage customer return requests and reverse logistics
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/shipping">
            <Button variant="outline" size="sm">
              ← Shipments
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(
          ["requested", "approved", "received", "completed"] as ReturnStatus[]
        ).map((s) => (
          <Card key={s}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {STATUS_LABELS[s]}
                  </p>
                  <p className="text-xl font-bold">
                    {returns.filter((r: any) => r.status === s).length}
                  </p>
                </div>
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Return Requests</CardTitle>
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="Search return number…"
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
                setStatus((e.target.value as ReturnStatus) || undefined);
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
                  <TableHead>Return #</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No returns found.
                    </TableCell>
                  </TableRow>
                )}
                {returns.map((ret: any) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/shipping/returns/${ret.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {ret.return_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${ret.order_id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {ret.order_id?.slice(0, 8)}…
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${STATUS_COLORS[ret.status as ReturnStatus] ?? ""}`}
                      >
                        {STATUS_LABELS[ret.status as ReturnStatus] ??
                          ret.status}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {ret.reason}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(ret.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {ret.status === "requested" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-200 text-green-600"
                              onClick={() => handleApprove(ret.id)}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600"
                              onClick={() => handleReject(ret.id)}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {ret.status === "picked_up" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkReceived(ret.id)}
                          >
                            <Package className="mr-1 h-3 w-3" /> Received
                          </Button>
                        )}
                        {ret.status === "inventory_synced" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleComplete(ret.id)}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
                          </Button>
                        )}
                        <Link href={`/admin/shipping/returns/${ret.id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

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
              disabled={!data || returns.length < 20}
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
