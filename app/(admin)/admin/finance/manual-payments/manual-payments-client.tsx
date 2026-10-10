"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  approveManualPaymentAction,
  rejectManualPaymentAction,
} from "@/lib/actions/payment.actions";
import {
  Smartphone,
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Search,
  ExternalLink,
  Loader2,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ManualPaymentsClient({
  initialTransactions,
}: {
  initialTransactions: any[];
}) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>(initialTransactions);
  const [searchQuery, setSearchQuery] = useState("");
  const [gatewayFilter, setGatewayFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);
  const [isRejectingId, setIsRejectingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [targetTx, setTargetTx] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (tx: any) => {
    setIsApprovingId(tx.id);
    try {
      const res = await approveManualPaymentAction(tx.order_id, tx.id);
      if (res.success) {
        toast.success(`Payment approved for order #${tx.order?.order_number || tx.order_id}!`);
        setTransactions((prev) =>
          prev.map((item) =>
            item.id === tx.id
              ? {
                  ...item,
                  status: "success",
                  order: item.order ? { ...item.order, payment_status: "paid", status: "confirmed" } : item.order,
                }
              : item
          )
        );
        router.refresh();
      } else {
        toast.error(res.error || "Failed to approve payment");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setIsApprovingId(null);
    }
  };

  const handleOpenReject = (tx: any) => {
    setTargetTx(tx);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!targetTx) return;
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }

    setIsRejectingId(targetTx.id);
    try {
      const res = await rejectManualPaymentAction(
        targetTx.order_id,
        rejectReason.trim(),
        targetTx.id
      );
      if (res.success) {
        toast.success("Payment rejected successfully.");
        setTransactions((prev) =>
          prev.map((item) =>
            item.id === targetTx.id
              ? {
                  ...item,
                  status: "failed",
                  error_message: rejectReason.trim(),
                  order: item.order ? { ...item.order, payment_status: "unpaid" } : item.order,
                }
              : item
          )
        );
        setRejectDialogOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to reject payment");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setIsRejectingId(null);
    }
  };

  // Metrics
  const totalPending = transactions.filter(
    (t) => t.status === "pending" && t.order?.payment_status !== "paid"
  ).length;
  const totalApproved = transactions.filter(
    (t) =>
      t.status === "completed" ||
      t.status === "success" ||
      t.order?.payment_status === "paid"
  ).length;
  const totalRejected = transactions.filter((t) => t.status === "failed").length;

  // Filtered rows
  const filtered = transactions.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const orderNum = t.order?.order_number?.toLowerCase() || "";
    const sender = (t.reference_number || t.gateway_response?.sender_number || "").toLowerCase();
    const trx = (t.gateway_transaction_id || t.gateway_response?.transaction_id || "").toLowerCase();
    const matchesSearch =
      !q || orderNum.includes(q) || sender.includes(q) || trx.includes(q);

    const provider = (
      t.provider_id ||
      t.gateway_response?.payment_method ||
      t.order?.payment_method ||
      ""
    ).toLowerCase();
    const matchesGateway =
      gatewayFilter === "ALL" ||
      (gatewayFilter === "BKASH" && provider.includes("bkash")) ||
      (gatewayFilter === "NAGAD" && provider.includes("nagad")) ||
      (gatewayFilter === "ROCKET" && provider.includes("rocket")) ||
      (gatewayFilter === "BANK" && (provider.includes("bank") || provider === "wire"));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PENDING" && t.status === "pending" && t.order?.payment_status !== "paid") ||
      (statusFilter === "PAID" &&
        (t.status === "completed" || t.status === "success" || t.order?.payment_status === "paid")) ||
      (statusFilter === "REJECTED" && t.status === "failed");

    return matchesSearch && matchesGateway && matchesStatus;
  });

  const renderProviderBadge = (providerId?: string) => {
    const p = (providerId || "").toLowerCase();
    if (p.includes("bkash")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-pink-100 text-[#E2136E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E2136E]" /> bKash
        </span>
      );
    }
    if (p.includes("nagad")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-[#F7941D]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F7941D]" /> Nagad
        </span>
      );
    }
    if (p.includes("rocket")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-[#8C3494]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8C3494]" /> Rocket
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
        <Landmark className="h-3 w-3" /> Bank Wire
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Pending Verification</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">
              {totalPending}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Awaiting admin review & approval</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Approved Payments</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {totalApproved}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Verified and converted to confirmed orders</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Rejected / Invalid</CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600">
              {totalRejected}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Invalid TrxID or mismatched amounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Order #, Sender Phone, or TrxID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={gatewayFilter} onValueChange={(val) => setGatewayFilter(val || "ALL")}>
            <SelectTrigger className="w-[140px] text-xs h-9">
              <SelectValue placeholder="All Gateways" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Gateways</SelectItem>
              <SelectItem value="BKASH" className="text-xs">bKash</SelectItem>
              <SelectItem value="NAGAD" className="text-xs">Nagad</SelectItem>
              <SelectItem value="ROCKET" className="text-xs">Rocket</SelectItem>
              <SelectItem value="BANK" className="text-xs">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
            <SelectTrigger className="w-[130px] text-xs h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Status</SelectItem>
              <SelectItem value="PENDING" className="text-xs">Pending</SelectItem>
              <SelectItem value="PAID" className="text-xs">Approved</SelectItem>
              <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-9 px-2.5"
            onClick={() => router.refresh()}
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-xs">
              <TableHead className="w-[120px]">Order #</TableHead>
              <TableHead className="w-[110px]">Gateway</TableHead>
              <TableHead className="w-[150px]">Sender Number / Name</TableHead>
              <TableHead className="w-[160px]">TrxID / Reference</TableHead>
              <TableHead className="w-[110px]">Amount</TableHead>
              <TableHead className="w-[140px]">Date & Time</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                  No manual payment submissions found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tx) => {
                const orderNum = tx.order?.order_number || tx.order_id?.substring(0, 8);
                const sender =
                  tx.gateway_response?.sender_number ||
                  tx.reference_number ||
                  tx.gateway_response?.account_holder_name ||
                  "—";
                const trxId =
                  tx.gateway_transaction_id ||
                  tx.gateway_response?.transaction_id ||
                  "—";
                const isApproved =
                  tx.status === "completed" ||
                  tx.status === "success" ||
                  tx.order?.payment_status === "paid";
                const isFailed = tx.status === "failed";
                const isPending = !isApproved && !isFailed;
                const hasNoItems = tx.item_count === 0;

                return (
                  <TableRow key={tx.id} className="text-xs hover:bg-muted/30 transition-colors">
                    {/* Order # */}
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/orders/${tx.order_id}`}
                        className="text-primary font-mono font-bold hover:underline flex items-center gap-1"
                      >
                        #{orderNum}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </Link>
                      {hasNoItems && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 mt-0.5">
                          0 Items
                        </span>
                      )}
                    </TableCell>

                    {/* Gateway */}
                    <TableCell>{renderProviderBadge(tx.provider_id)}</TableCell>

                    {/* Sender */}
                    <TableCell className="font-mono font-medium text-foreground">
                      {sender}
                    </TableCell>

                    {/* TrxID with Copy */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground">
                          {trxId}
                        </span>
                        {trxId !== "—" && (
                          <button
                            type="button"
                            onClick={() => handleCopy(trxId, tx.id)}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                            title="Copy TrxID"
                          >
                            {copiedId === tx.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="font-mono font-bold text-foreground">
                      ৳ {Number(tx.amount || tx.order?.grand_total || 0).toLocaleString()}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-muted-foreground text-[11px]">
                      {new Date(tx.created_at).toLocaleString()}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        className={
                          isApproved
                            ? "bg-emerald-500 text-white font-semibold text-[10px]"
                            : isFailed
                            ? "bg-rose-500 text-white font-semibold text-[10px]"
                            : "bg-amber-500 text-white font-semibold text-[10px] animate-pulse"
                        }
                      >
                        {isApproved
                          ? "Approved"
                          : isFailed
                          ? "Rejected"
                          : "Pending"}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPending ? (
                          <>
                            <Button
                              size="sm"
                              className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold gap-1"
                              onClick={() => handleApprove(tx)}
                              disabled={isApprovingId === tx.id || isRejectingId === tx.id || hasNoItems}
                              title={hasNoItems ? "Cannot approve order with 0 items" : undefined}
                            >
                              {isApprovingId === tx.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold gap-1"
                              onClick={() => handleOpenReject(tx)}
                              disabled={isApprovingId === tx.id || isRejectingId === tx.id}
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px]"
                          >
                            <Link href={`/admin/orders/${tx.order_id}`}>
                              View Order
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reject Payment Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject Manual Payment</DialogTitle>
            <DialogDescription>
              Order #{targetTx?.order?.order_number || targetTx?.order_id?.substring(0, 8)} - Enter the reason for rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label htmlFor="modal-reject-reason" className="text-xs font-semibold text-foreground">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <Input
              id="modal-reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Transaction ID was not found in statement"
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isRejectingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmReject}
              disabled={isRejectingId !== null || !rejectReason.trim()}
            >
              {isRejectingId !== null && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
