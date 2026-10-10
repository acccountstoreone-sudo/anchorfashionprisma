"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Package,
  DollarSign,
  Clock,
  ArrowRight,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getOperationsReturnsAction,
  createOperationsReturnAction,
  updateOperationsReturnStatusAction,
  getOrdersForReturnAction,
} from "@/actions/admin/returns-operations.actions";
import { formatCurrency } from "@/lib/utils";

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; border: string; bg: string }
> = {
  REQUESTED: {
    label: "Requested",
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
  },
  APPROVED: {
    label: "Approved",
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
  },
  REJECTED: {
    label: "Rejected",
    badge: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    border: "border-rose-500/30",
    bg: "bg-rose-500/5",
  },
  RECEIVED: {
    label: "Received",
    badge: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
  },
  REFUNDED: {
    label: "Refunded",
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-green-500/10 text-green-500 border-green-500/20",
    border: "border-green-500/30",
    bg: "bg-green-500/5",
  },
};

const RETURN_REASONS = [
  "Wrong size",
  "Damaged item",
  "Defective item",
  "Wrong item received",
  "Product not as described",
  "Quality issue",
  "Changed my mind",
  "Other",
];

export function OperationsReturnsClient() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [orderResults, setOrderResults] = useState<any[]>([]);
  const [searchingOrders, setSearchingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Form State
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [customerName, setCustomerName] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    Array<{
      sku: string;
      productName: string;
      quantity: number;
      condition: "good" | "damaged" | "defective";
      refundAmount: number;
    }>
  >([
    {
      sku: "",
      productName: "",
      quantity: 1,
      condition: "good",
      refundAmount: 0,
    },
  ]);

  // View / Workflow Modal
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [workflowNote, setWorkflowNote] = useState("");

  const loadReturns = async () => {
    setLoading(true);
    const res = await getOperationsReturnsAction({
      status: statusFilter,
      search: search || undefined,
    });
    if (res.success) {
      setReturns(res.data || []);
    } else {
      toast.error(res.error || "Failed to load returns");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReturns();
  }, [statusFilter]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      loadReturns();
    }
  };

  // Order lookup
  const searchOrders = async (val: string) => {
    setOrderQuery(val);
    if (!val.trim()) {
      setOrderResults([]);
      return;
    }
    setSearchingOrders(true);
    const res = await getOrdersForReturnAction(val);
    if (res.success) {
      setOrderResults(res.data || []);
    }
    setSearchingOrders(false);
  };

  const handleSelectOrder = (o: any) => {
    setSelectedOrder(o);
    const cust = o.profiles
      ? `${o.profiles.first_name || ""} ${o.profiles.last_name || ""}`.trim() || o.profiles.email
      : "";
    if (cust) setCustomerName(cust);
    if (o.total_amount) setRefundAmount(String(o.total_amount));
    setOrderResults([]);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        sku: "",
        productName: "",
        quantity: 1,
        condition: "good",
        refundAmount: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: string, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast.error("Please specify a return reason");
      return;
    }

    const validItems = items.filter((i) => i.sku.trim() || i.productName.trim());
    if (validItems.length === 0) {
      toast.error("Please add at least one item with SKU or product name");
      return;
    }

    setSubmitting(true);
    const res = await createOperationsReturnAction({
      orderId: selectedOrder?.id,
      customerId: selectedOrder?.customer_id,
      customerName: customerName || undefined,
      reason,
      notes: notes || undefined,
      refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
      items: validItems,
    });
    setSubmitting(false);

    if (res.success) {
      toast.success(`Return request #${res.data.return_number} created successfully`);
      setCreateOpen(false);
      resetForm();
      loadReturns();
    } else {
      toast.error(res.error || "Failed to create return");
    }
  };

  const resetForm = () => {
    setSelectedOrder(null);
    setOrderQuery("");
    setCustomerName("");
    setReason(RETURN_REASONS[0]);
    setRefundAmount("");
    setNotes("");
    setItems([
      {
        sku: "",
        productName: "",
        quantity: 1,
        condition: "good",
        refundAmount: 0,
      },
    ]);
  };

  const handleStatusTransition = async (
    newStatus: "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED" | "COMPLETED"
  ) => {
    if (!selectedReturn) return;
    setActionLoading(true);
    const res = await updateOperationsReturnStatusAction(
      selectedReturn.id,
      newStatus,
      workflowNote || undefined
    );
    setActionLoading(false);

    if (res.success) {
      toast.success(`Status updated to ${newStatus}`);
      setSelectedReturn(res.data);
      setWorkflowNote("");
      loadReturns();
    } else {
      toast.error(res.error || "Failed to update return status");
    }
  };

  // Metrics
  const totalCount = returns.length;
  const pendingCount = returns.filter(
    (r) => (r.status || "").toUpperCase() === "REQUESTED"
  ).length;
  const receivedCount = returns.filter(
    (r) => (r.status || "").toUpperCase() === "RECEIVED"
  ).length;
  const completedCount = returns.filter((r) =>
    ["REFUNDED", "COMPLETED"].includes((r.status || "").toUpperCase())
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Return Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage customer return requests, inspection conditions, and refund workflows.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#C9A86A] text-white hover:bg-[#b09156] transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Return Request
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Returns
            </CardTitle>
            <RotateCcw className="h-4 w-4 text-[#C9A86A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Recorded in system</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Needs Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting decision</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Refund
            </CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{receivedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Items received in warehouse</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{completedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Refunded or resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1 bg-muted/40 max-w-full overflow-x-auto">
          {[
            "ALL",
            "REQUESTED",
            "APPROVED",
            "REJECTED",
            "RECEIVED",
            "REFUNDED",
            "COMPLETED",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === tab
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "ALL" ? "All Returns" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search return #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-8 bg-background"
          />
        </div>
      </div>

      {/* Returns Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="font-semibold">Return #</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Customer / Order</TableHead>
                  <TableHead className="font-semibold">Reason</TableHead>
                  <TableHead className="font-semibold">Items</TableHead>
                  <TableHead className="font-semibold">Refund Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2 text-[#C9A86A]" />
                      Loading return records...
                    </TableCell>
                  </TableRow>
                ) : returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      <RotateCcw className="mx-auto h-8 w-8 opacity-40 mb-2" />
                      No returns found matching your filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  returns.map((ret) => {
                    const statusKey = (ret.status || "REQUESTED").toUpperCase();
                    const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.REQUESTED;
                    const itemsCount = ret.items?.length || 1;

                    return (
                      <TableRow
                        key={ret.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-mono font-medium text-slate-900 dark:text-slate-100">
                          {ret.return_number}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(ret.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">
                            {ret.customer?.name || "Direct Customer"}
                          </div>
                          {ret.order_id && (
                            <div className="text-xs text-muted-foreground">
                              Order ID: {ret.order_id.slice(0, 8)}...
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate">
                          {ret.reason || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {itemsCount} item{itemsCount !== 1 ? "s" : ""}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          ৳{parseFloat(ret.refund_amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`border text-xs font-semibold ${statusCfg.badge}`}
                          >
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReturn(ret)}
                            className="h-8 text-xs font-medium hover:border-[#C9A86A] hover:text-[#C9A86A]"
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Return Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-[#C9A86A]" />
              New Return Request
            </DialogTitle>
            <DialogDescription>
              Create a formal return ticket for reverse logistics and refund management.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReturn} className="space-y-4 pt-2">
            {/* Order Lookup */}
            <div className="space-y-2">
              <Label>Link Existing Order (Optional)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type order number to search..."
                  value={orderQuery}
                  onChange={(e) => searchOrders(e.target.value)}
                  className="pl-8"
                />
              </div>
              {searchingOrders && (
                <div className="text-xs text-muted-foreground">Searching orders...</div>
              )}
              {orderResults.length > 0 && (
                <div className="rounded-md border border-border bg-card p-2 shadow-lg space-y-1 max-h-36 overflow-y-auto">
                  {orderResults.map((o) => (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => handleSelectOrder(o)}
                      className="w-full text-left p-2 rounded hover:bg-muted text-xs flex justify-between items-center"
                    >
                      <span className="font-semibold">{o.order_number}</span>
                      <span className="text-muted-foreground">
                        ৳{parseFloat(o.total_amount || 0).toLocaleString()} • {o.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {selectedOrder && (
                <div className="rounded-md bg-muted/60 p-2 text-xs flex justify-between items-center">
                  <span>
                    Linked Order: <strong>{selectedOrder.order_number}</strong>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-rose-500 hover:text-rose-600"
                    onClick={() => setSelectedOrder(null)}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {/* Customer & Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason">Return Reason</Label>
                <select
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Return Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItemRow}
                  className="h-7 text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" /> Add Item
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-muted/30 p-2 rounded-md border border-border"
                  >
                    <div className="col-span-4">
                      <Input
                        placeholder="SKU (e.g. TSH-BLK-M)"
                        value={item.sku}
                        onChange={(e) => updateItemRow(idx, "sku", e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        placeholder="Product Name"
                        value={item.productName}
                        onChange={(e) => updateItemRow(idx, "productName", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemRow(idx, "quantity", parseInt(e.target.value) || 1)
                        }
                        className="h-8 text-xs text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={item.condition}
                        onChange={(e) => updateItemRow(idx, "condition", e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="good">Good</option>
                        <option value="damaged">Damaged</option>
                        <option value="defective">Defective</option>
                      </select>
                    </div>
                    <div className="col-span-1 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length <= 1}
                        className="h-7 w-7 text-rose-500 hover:bg-rose-500/10"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Refund Amount & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="refundAmount">Estimated Refund Amount (৳)</Label>
                <Input
                  id="refundAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Internal Notes</Label>
                <Input
                  id="notes"
                  placeholder="Notes on condition, courier, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#C9A86A] text-white hover:bg-[#b09156]"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Return Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Workflow Details Dialog */}
      {selectedReturn && (
        <Dialog open={!!selectedReturn} onOpenChange={(o) => !o && setSelectedReturn(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-[#C9A86A]" />
                  Return #{selectedReturn.return_number}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={
                    (
                      STATUS_CONFIG[
                        (selectedReturn.status || "REQUESTED").toUpperCase()
                      ] || STATUS_CONFIG.REQUESTED
                    ).badge
                  }
                >
                  {(selectedReturn.status || "REQUESTED").toUpperCase()}
                </Badge>
              </div>
              <DialogDescription>
                Created on {new Date(selectedReturn.created_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Summary details */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Customer:</span>
                  <div className="font-semibold">
                    {selectedReturn.customer?.name || "Direct Customer"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Reason:</span>
                  <div className="font-semibold">{selectedReturn.reason || "N/A"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Refund Total:</span>
                  <div className="font-semibold text-[#C9A86A]">
                    ৳{parseFloat(selectedReturn.refund_amount || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Linked Order:</span>
                  <div className="font-mono text-xs">
                    {selectedReturn.order_id || "Unlinked"}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Returned Items
                </h4>
                <div className="rounded-md border border-border divide-y divide-border">
                  {(selectedReturn.items || []).length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground">
                      No item details attached to this record.
                    </div>
                  ) : (
                    selectedReturn.items.map((it: any) => (
                      <div
                        key={it.id}
                        className="p-3 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium font-mono text-slate-900 dark:text-slate-100">
                            {it.sku || "SKU N/A"}
                          </div>
                          <div className="text-muted-foreground">
                            Condition:{" "}
                            <strong className="capitalize">{it.condition || "good"}</strong>
                            {it.restocked && (
                              <span className="ml-2 text-emerald-500 font-semibold">
                                ✓ Restocked
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="font-semibold">
                          Qty: {it.quantity || 1}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedReturn.notes && (
                <div className="rounded-md bg-muted/40 p-3 text-xs">
                  <span className="font-semibold text-muted-foreground block mb-1">
                    Notes / Comments:
                  </span>
                  <p>{selectedReturn.notes}</p>
                </div>
              )}

              {/* Status Progression Controls */}
              <div className="space-y-3 pt-2 border-t border-border">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status Workflow Actions
                </h4>

                <div className="space-y-2">
                  <Input
                    placeholder="Optional workflow audit note..."
                    value={workflowNote}
                    onChange={(e) => setWorkflowNote(e.target.value)}
                    className="text-xs"
                  />

                  <div className="flex flex-wrap gap-2">
                    {selectedReturn.status === "REQUESTED" && (
                      <>
                        <Button
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleStatusTransition("APPROVED")}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve Return
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionLoading}
                          onClick={() => handleStatusTransition("REJECTED")}
                          className="text-xs"
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject Return
                        </Button>
                      </>
                    )}

                    {selectedReturn.status === "APPROVED" && (
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleStatusTransition("RECEIVED")}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                      >
                        <Package className="mr-1.5 h-3.5 w-3.5" /> Mark Received & Restock
                      </Button>
                    )}

                    {selectedReturn.status === "RECEIVED" && (
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleStatusTransition("REFUNDED")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      >
                        <DollarSign className="mr-1.5 h-3.5 w-3.5" /> Issue Refund
                      </Button>
                    )}

                    {["RECEIVED", "REFUNDED"].includes(selectedReturn.status) && (
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleStatusTransition("COMPLETED")}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark Completed
                      </Button>
                    )}

                    {["REJECTED", "COMPLETED"].includes(selectedReturn.status) && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> This return request is finalized.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setSelectedReturn(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
