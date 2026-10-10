"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useOrders, useOrderMetrics } from "@/hooks/oms/use-orders";
import { updateOrderStatusAction } from "@/app/actions/oms/order.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatus } from "@/types/oms";
import { exportToCsv } from "@/lib/utils/export";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Download,
  RotateCcw,
  Search,
  Filter,
  ShoppingBag,
  Clock,
  PackageCheck,
  CheckCircle2,
  XCircle,
  Eye,
  MoreHorizontal,
  FileText,
  Phone,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  MapPin,
  Loader2,
  MessageSquare,
} from "lucide-react";

type TabKey = "all" | "pending" | "processing" | "completed" | "cancelled";

function AdminOrdersContent({ defaultTab = "all" }: { defaultTab?: TabKey }) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const tabFromUrl = (searchParams?.get("tab") as TabKey) || defaultTab || "all";

  // Filters & Pagination State
  const [activeTab, setActiveTab] = useState<TabKey>(tabFromUrl);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status Change Dialog State
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<OrderStatus | "">("");
  const [statusReason, setStatusReason] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  React.useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
      setPage(1);
    }
  }, [tabFromUrl]);

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Map Tab to Order Status parameter
  const statusParam = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return "pending";
      case "processing":
        return "processing";
      case "completed":
        return "completed";
      case "cancelled":
        return "cancelled";
      default:
        return undefined;
    }
  }, [activeTab]);

  // Fetch Orders
  const { data, isLoading, isFetching, error, refetch } = useOrders({
    page,
    limit: pageSize,
    status: statusParam,
    search: debouncedSearch || undefined,
    paymentMethod: paymentMethod !== "all" ? paymentMethod : undefined,
    paymentStatus: paymentStatus !== "all" ? paymentStatus : undefined,
  });

  // Fetch KPI Metrics
  const { data: metrics, isLoading: isMetricsLoading } = useOrderMetrics();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    if (data?.data && data.data.length > 0) {
      const exportRows = data.data.map((o: any) => ({
        "Order #": o.order_number,
        "Date": new Date(o.created_at).toLocaleString(),
        "Customer": o.customer_name || "Guest",
        "Phone": o.customer_phone || "",
        "City": o.customer_city || "",
        "Items": o.items_count || 1,
        "Total (BDT)": o.grand_total,
        "Payment Method": o.payment_method || "COD",
        "Payment Status": o.payment_status || "PENDING",
        "Status": o.status,
      }));
      exportToCsv(`anchor_fashion_orders_${new Date().toISOString().split("T")[0]}.csv`, exportRows);
      toast.success("Orders exported successfully");
    } else {
      toast.error("No orders to export");
    }
  };

  const handleOpenStatusDialog = (order: any, nextStatus: OrderStatus) => {
    setSelectedOrder(order);
    setTargetStatus(nextStatus);
    setStatusReason("");
    setStatusDialogOpen(true);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedOrder || !targetStatus) return;
    setIsUpdatingStatus(true);
    try {
      const res = await updateOrderStatusAction({
        order_id: selectedOrder.id,
        new_status: targetStatus,
        reason: statusReason || undefined,
      });

      if (res.success) {
        toast.success(`Order ${selectedOrder.order_number} status updated to ${targetStatus}`);
        setStatusDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["order-metrics"] });
      } else {
        toast.error(res.error || "Failed to update order status");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const resetFilters = () => {
    setActiveTab("all");
    setSearchInput("");
    setDebouncedSearch("");
    setPaymentMethod("all");
    setPaymentStatus("all");
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "confirmed":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25">Confirmed</Badge>;
      case "preparing":
      case "processing":
      case "picking":
      case "packing":
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/25">Processing</Badge>;
      case "ready_for_shipment":
      case "shipped":
      case "out_for_delivery":
        return <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25">In Transit</Badge>;
      case "completed":
      case "delivered":
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Delivered</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "pending_payment":
      case "draft":
      case "pending":
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25">Pending</Badge>;
      case "returned":
      case "refund_requested":
      case "refunded":
        return <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/25">Returned</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status?: string | null) => {
    const s = (status || "").toUpperCase();
    if (s === "CAPTURED" || s === "PAID" || s === "COMPLETED") {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Paid</span>;
    }
    if (s === "FAILED") {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">Failed</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Pending</span>;
  };

  const totalPages = Math.ceil((data?.count || 0) / pageSize) || 1;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Order Management
            </h1>
            <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-semibold bg-primary/5 text-primary border-primary/20">
              {metrics?.totalOrders || data?.count || 0} Total Orders
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time tracking, customer notifications, and fulfillment operations across Bangladesh.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9"
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!data?.data || data.data.length === 0}
            className="h-9"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* 2. Interactive KPI Metrics Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Orders & Revenue */}
        <Card
          onClick={() => { setActiveTab("all"); setPage(1); }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === "all" ? "ring-2 ring-primary/60 border-primary/40 shadow-sm" : ""
          }`}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">All Orders</span>
              <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {isMetricsLoading ? <Skeleton className="h-8 w-16" /> : (metrics?.totalOrders ?? 0)}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              Rev: {isMetricsLoading ? "..." : formatCurrency(metrics?.totalRevenue ?? 0)}
            </div>
          </CardContent>
        </Card>

        {/* Pending Verification / Payment */}
        <Card
          onClick={() => { setActiveTab("pending"); setPage(1); }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === "pending" ? "ring-2 ring-amber-500/60 border-amber-500/40 shadow-sm" : ""
          }`}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending</span>
              <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {isMetricsLoading ? <Skeleton className="h-8 w-12" /> : (metrics?.pendingOrders ?? 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Awaiting confirmation</div>
          </CardContent>
        </Card>

        {/* Processing / Confirmed */}
        <Card
          onClick={() => { setActiveTab("processing"); setPage(1); }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === "processing" ? "ring-2 ring-blue-500/60 border-blue-500/40 shadow-sm" : ""
          }`}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Processing</span>
              <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <PackageCheck className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {isMetricsLoading ? <Skeleton className="h-8 w-12" /> : (metrics?.processingOrders ?? 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Packing & dispatching</div>
          </CardContent>
        </Card>

        {/* Completed / Delivered */}
        <Card
          onClick={() => { setActiveTab("completed"); setPage(1); }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === "completed" ? "ring-2 ring-emerald-500/60 border-emerald-500/40 shadow-sm" : ""
          }`}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Delivered</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isMetricsLoading ? <Skeleton className="h-8 w-12" /> : (metrics?.completedOrders ?? 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Successfully fulfilled</div>
          </CardContent>
        </Card>

        {/* Cancelled / Returns */}
        <Card
          onClick={() => { setActiveTab("cancelled"); setPage(1); }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === "cancelled" ? "ring-2 ring-rose-500/60 border-rose-500/40 shadow-sm" : ""
          }`}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cancelled</span>
              <div className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {isMetricsLoading ? <Skeleton className="h-8 w-12" /> : (metrics?.cancelledOrders ?? 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Cancelled or returned</div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Data Card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60 backdrop-blur">
        {/* Navigation Tabs Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 pt-3">
          <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center space-x-1 sm:space-x-2">
              {[
                { key: "all", label: "All Orders", count: metrics?.totalOrders },
                { key: "pending", label: "Pending", count: metrics?.pendingOrders },
                { key: "processing", label: "Processing", count: metrics?.processingOrders },
                { key: "completed", label: "Completed", count: metrics?.completedOrders },
                { key: "cancelled", label: "Cancelled", count: metrics?.cancelledOrders },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key as TabKey); setPage(1); }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      activeTab === tab.key
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by order #, customer, phone (017...)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-9"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Payment Method Filter */}
              <select
                value={paymentMethod}
                onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Payment Methods</option>
                <option value="COD">Cash on Delivery (COD)</option>
                <option value="SSLCOMMERZ">SSLCommerz</option>
                <option value="bKash">bKash</option>
              </select>

              {/* Payment Status Filter */}
              <select
                value={paymentStatus}
                onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Payment Statuses</option>
                <option value="CAPTURED">Paid / Captured</option>
                <option value="PENDING">Pending Payment</option>
                <option value="FAILED">Failed</option>
              </select>

              {/* Reset button */}
              {(debouncedSearch || paymentMethod !== "all" || paymentStatus !== "all" || activeTab !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-9 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 4. Orders Data Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-transparent">
                  <TableHead className="w-[180px] font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Order Details
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Customer
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Items
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Payment & Total
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Fulfillment Status
                  </TableHead>
                  <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.data && data.data.length > 0 ? (
                  data.data.map((order: any) => {
                    const formattedDate = new Date(order.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    const formattedTime = new Date(order.created_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <TableRow
                        key={order.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Order Number & Timestamp */}
                        <TableCell className="align-top py-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="font-mono text-sm font-semibold text-slate-900 dark:text-white hover:text-primary transition-colors underline-offset-4 hover:underline"
                              >
                                {order.order_number}
                              </Link>
                              <button
                                onClick={() => handleCopy(order.order_number, order.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                title="Copy order number"
                              >
                                {copiedId === order.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {formattedDate} · {formattedTime}
                            </div>
                            {order.order_source && (
                              <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {order.order_source}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Customer Info */}
                        <TableCell className="align-top py-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <AvatarFallback>
                                  {(order.customer_name || "G").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {order.customer_name || "Guest Customer"}
                              </span>
                            </div>
                            {order.customer_phone && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                                <Phone className="h-3 w-3 text-slate-400" />
                                <span>{order.customer_phone}</span>
                              </div>
                            )}
                            {order.customer_city && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <MapPin className="h-3 w-3" />
                                <span>{order.customer_city}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Items Summary */}
                        <TableCell className="align-top py-3.5">
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {order.items_count || 1} {order.items_count === 1 ? "item" : "items"}
                            </span>
                            {order.items_preview && (
                              <p className="text-xs text-slate-500 max-w-[200px] truncate" title={order.items_preview}>
                                {order.items_preview}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Payment & Grand Total */}
                        <TableCell className="align-top py-3.5">
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatCurrency(order.grand_total ?? order.total_amount ?? 0)}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                {order.payment_method || "COD"}
                              </span>
                              <span>·</span>
                              {getPaymentStatusBadge(order.payment_status)}
                            </div>
                          </div>
                        </TableCell>

                        {/* Order Fulfillment Status */}
                        <TableCell className="align-top py-3.5">
                          <div className="space-y-1.5">
                            {getStatusBadge(order.status)}
                            {order.confirmation_sms_sent && (
                              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                                <MessageSquare className="h-3 w-3" />
                                <span>SMS Sent</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="align-top py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/admin/orders/${order.id}`}>
                              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium">
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                View
                              </Button>
                            </Link>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/orders/${order.id}`} className="cursor-pointer">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Order Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/orders/${order.id}/invoice`} target="_blank" className="cursor-pointer">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Print Invoice
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-slate-400">Change Status</DropdownMenuLabel>
                                {order.status !== "confirmed" && (
                                  <DropdownMenuItem onClick={() => handleOpenStatusDialog(order, "confirmed")}>
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                                    Mark Confirmed
                                  </DropdownMenuItem>
                                )}
                                {order.status !== "preparing" && order.status !== "processing" && (
                                  <DropdownMenuItem onClick={() => handleOpenStatusDialog(order, "preparing")}>
                                    <PackageCheck className="h-4 w-4 mr-2 text-blue-600" />
                                    Mark Processing
                                  </DropdownMenuItem>
                                )}
                                {order.status !== "completed" && (
                                  <DropdownMenuItem onClick={() => handleOpenStatusDialog(order, "completed")}>
                                    <Check className="h-4 w-4 mr-2 text-green-600" />
                                    Mark Completed
                                  </DropdownMenuItem>
                                )}
                                {order.status !== "cancelled" && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenStatusDialog(order, "cancelled")}
                                    className="text-rose-600 focus:text-rose-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2 text-rose-600" />
                                    Cancel Order
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <div className="mx-auto max-w-sm flex flex-col items-center justify-center space-y-3">
                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                          <ShoppingBag className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                            No orders found
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {debouncedSearch || paymentMethod !== "all" || paymentStatus !== "all"
                              ? "No orders match your active filter criteria."
                              : "No orders have been recorded in this category yet."}
                          </p>
                        </div>
                        {(debouncedSearch || paymentMethod !== "all" || paymentStatus !== "all" || activeTab !== "all") && (
                          <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs">
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* 5. Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Showing</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {data?.data?.length ? (page - 1) * pageSize + 1 : 0}
              </span>
              <span>to</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {Math.min(page * pageSize, data?.count || 0)}
              </span>
              <span>of</span>
              <span className="font-semibold text-slate-900 dark:text-white">{data?.count || 0}</span>
              <span>orders</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="h-8 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xs px-2 font-medium">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. Quick Status Update Confirmation Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Update status for order <strong className="font-mono text-slate-900 dark:text-white">{selectedOrder?.order_number}</strong> to <strong className="uppercase text-primary">{targetStatus}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Status Change Reason / Internal Note (Optional)
            </label>
            <Input
              placeholder="e.g. Verified by phone, ready for packaging"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              className="text-sm"
            />
            {targetStatus === "confirmed" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                An automatic SMS confirmation will be sent to the customer if configured.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmStatusUpdate}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminOrdersPage(props: { defaultTab?: TabKey }) {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AdminOrdersContent {...props} />
    </React.Suspense>
  );
}

