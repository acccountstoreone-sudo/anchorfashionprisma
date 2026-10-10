"use client";

import { useState } from "react";
import { useOrders } from "@/hooks/oms/use-orders";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  ArrowRight,
  Package,
  Calendar,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function getStatusBadge(status?: string) {
  const s = (status || "pending").toLowerCase();
  if (s === "completed" || s === "delivered") {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 capitalize font-medium">
        {s.replace(/_/g, " ")}
      </Badge>
    );
  }
  if (s === "shipped" || s === "in_transit") {
    return (
      <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 capitalize font-medium">
        {s.replace(/_/g, " ")}
      </Badge>
    );
  }
  if (s === "cancelled") {
    return (
      <Badge variant="destructive" className="capitalize font-medium">
        {s.replace(/_/g, " ")}
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 capitalize font-medium">
      {s.replace(/_/g, " ")}
    </Badge>
  );
}

export default function CustomerOrdersPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data, isLoading, error, refetch } = useOrders({ page, limit });

  const orders = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">
            My Orders
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track shipments, review past purchases, and download official invoices.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/products" className="inline-flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <h3 className="font-semibold text-foreground">Failed to Load Orders</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              We encountered a problem loading your order history. Please try refreshing.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2 inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/60 py-4 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium text-foreground">Order History</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {totalCount > 0 ? `${totalCount} order${totalCount > 1 ? "s" : ""} placed` : "All your previous orders"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 w-full bg-muted/40 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No orders yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  You haven't placed any orders yet. Discover our latest collections and find something you love.
                </p>
                <Button asChild className="mt-6" size="sm">
                  <Link href="/products" className="inline-flex items-center gap-2">
                    Start Shopping <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Order #</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Date</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Total</TableHead>
                        <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order: any) => (
                        <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-foreground">
                            <Link
                              href={`/account/orders/${order.id}`}
                              className="hover:underline font-mono text-xs font-semibold text-primary"
                            >
                              {order.order_number || order.id.slice(0, 8)}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.status)}
                          </TableCell>
                          <TableCell className="font-medium text-foreground text-sm">
                            {formatCurrency(Number(order.grand_total ?? order.total_amount) || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" asChild className="h-8 text-xs font-medium">
                              <Link href={`/account/orders/${order.id}`}>
                                View Details
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card List View */}
                <div className="md:hidden divide-y divide-border/60">
                  {orders.map((order: any) => (
                    <div key={order.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/account/orders/${order.id}`}
                          className="font-mono text-sm font-semibold text-primary hover:underline"
                        >
                          {order.order_number || order.id.slice(0, 8)}
                        </Link>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {order.created_at
                              ? new Date(order.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </span>
                        </div>
                        <div className="font-semibold text-sm text-foreground">
                          {formatCurrency(Number(order.grand_total ?? order.total_amount) || 0)}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild className="w-full text-xs font-medium h-9">
                        <Link href={`/account/orders/${order.id}`}>
                          View Order Details
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {orders.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border/60 bg-muted/10 text-xs sm:text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2 sm:px-3 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <span className="text-muted-foreground">
                  Page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{totalPages}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || orders.length < limit}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 px-2 sm:px-3 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
