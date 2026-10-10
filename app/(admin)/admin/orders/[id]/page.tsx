"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useOrderDetails } from "@/hooks/oms/use-order-details";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrderStatus, OrderWithDetails } from "@/types/oms";
import {
  approveManualPaymentAction,
  rejectManualPaymentAction,
} from "@/lib/actions/payment.actions";
import { OrderSmsCard } from "@/components/admin/orders/order-sms-card";
import {
  Printer,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ShoppingBag,
  ShieldCheck,
  Smartphone,
  Landmark,
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Loader2,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const orderId = params.id as string;
  const queryClient = useQueryClient();
  const { order, isLoading, updateStatus, isUpdatingStatus } =
    useOrderDetails(orderId);

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [copiedTrx, setCopiedTrx] = useState(false);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading order details...</div>;
  if (!order) return <div className="p-8 text-destructive">Order not found</div>;

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    try {
      await updateStatus({ order_id: order.id, new_status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
    } catch (e: any) {
      toast.error(`Failed to update status: ${e.message}`);
    }
  };

  const handleCopyTrx = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrx(true);
    toast.success("Transaction ID copied to clipboard!");
    setTimeout(() => setCopiedTrx(false), 2000);
  };

  const handleApprovePayment = async () => {
    setIsApproving(true);
    try {
      const res = await approveManualPaymentAction(order.id, (order as any).manualPayment?.id);
      if (res.success) {
        toast.success("Payment verified and approved! Order marked as Paid & Confirmed.");
        queryClient.invalidateQueries({ queryKey: ["order", orderId] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      } else {
        toast.error(res.error || "Failed to approve payment");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please enter a reason for rejecting the payment.");
      return;
    }
    setIsRejecting(true);
    try {
      const res = await rejectManualPaymentAction(
        order.id,
        rejectReason.trim(),
        (order as any).manualPayment?.id
      );
      if (res.success) {
        toast.success("Payment rejected successfully.");
        setRejectDialogOpen(false);
        setRejectReason("");
        queryClient.invalidateQueries({ queryKey: ["order", orderId] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      } else {
        toast.error(res.error || "Failed to reject payment");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setIsRejecting(false);
    }
  };

  const typedOrder = order as unknown as OrderWithDetails;
  const customer = typedOrder.customer;
  const shipping = typedOrder.shippingAddress;
  const billing = typedOrder.billingAddress;
  const manualPayment = typedOrder.manualPayment;
  const paymentMethod = (order.payment_method || manualPayment?.provider_id || "").toUpperCase();
  const isManualPayment =
    ["BKASH", "NAGAD", "ROCKET", "BANK", "BANK_TRANSFER"].includes(paymentMethod) || !!manualPayment;

  const formatAddress = (addr: any) => {
    if (!addr) return null;
    const parts = [
      addr.address_line_1 || addr.street,
      addr.address_line_2,
      addr.city,
      addr.state,
      addr.zip || addr.postal_code,
      addr.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Order #{order.order_number}
            </h1>
            <Badge className="capitalize text-sm">{order.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Placed on {new Date(order.created_at).toLocaleString()}
          </p>
        </div>

        {/* Print Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            asChild
            className="gap-2"
          >
            <Link href={`/admin/orders/${order.id}/invoice`} target="_blank">
              <Printer className="h-4 w-4" />
              Print Invoice
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="gap-2"
          >
            <Link href={`/admin/orders/${order.id}/packing-slip`} target="_blank">
              <FileText className="h-4 w-4" />
              Print Packing Slip
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left Column: Order Items */}
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Order Items ({order.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!order.items || order.items.length === 0) ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400 flex items-start gap-3 text-sm">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">No items recorded for this order</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This order currently has 0 line items attached. Payment verification and order fulfillment require valid items.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {order.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                          SKU: {item.sku || "N/A"}{" "}
                          {item.variant_name ? `| ${item.variant_name}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          ${Number(item.unit_price).toFixed(2)} x {item.quantity}
                        </p>
                        <p className="font-bold text-foreground font-mono">
                          ${Number(item.line_total).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Financial Totals */}
              <div className="mt-6 flex justify-end border-t pt-4">
                <div className="w-72 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-mono">${Number(order.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(order.discount_total) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-mono">-${Number(order.discount_total).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping:</span>
                    <span className="font-mono">${Number(order.shipping_total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Estimated Tax:</span>
                    <span className="font-mono">${Number(order.tax_total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-lg font-bold">
                    <span>Total:</span>
                    <span className="font-mono text-primary">${Number(order.grand_total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Addresses Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                {shipping ? (
                  <>
                    <p className="font-semibold text-foreground">
                      {shipping.recipient_name || customer?.full_name || "Recipient"}
                    </p>
                    {shipping.phone && <p>Phone: {shipping.phone}</p>}
                    <p className="leading-relaxed">{formatAddress(shipping)}</p>
                  </>
                ) : (
                  <p className="italic">No shipping address recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Billing Address
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                {billing ? (
                  <>
                    <p className="font-semibold text-foreground">
                      {billing.recipient_name || customer?.full_name || "Customer"}
                    </p>
                    {billing.phone && <p>Phone: {billing.phone}</p>}
                    <p className="leading-relaxed">{formatAddress(billing)}</p>
                  </>
                ) : (
                  <p className="italic">Same as shipping address</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Status & Customer Details */}
        <div className="space-y-6">
          {/* Manual Payment Verification Card */}
          {isManualPayment && (
            <Card className="border-2 border-primary/20 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {paymentMethod === "BKASH" ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E2136E] text-white font-bold text-xs">
                        bK
                      </span>
                    ) : paymentMethod === "NAGAD" ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7941D] text-white font-bold text-xs">
                        ন
                      </span>
                    ) : paymentMethod === "ROCKET" ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8C3494] text-white font-bold text-xs">
                        R
                      </span>
                    ) : paymentMethod.includes("BANK") ? (
                      <Landmark className="h-6 w-6 text-sky-400" />
                    ) : (
                      <CreditCard className="h-6 w-6 text-primary" />
                    )}
                    <div>
                      <h3 className="font-bold text-sm tracking-wide">
                        {paymentMethod.replace(/_/g, " ")} Payment
                      </h3>
                      <p className="text-[11px] text-slate-300">Customer Submitted Details</p>
                    </div>
                  </div>

                  <Badge
                    className={
                      order.payment_status === "paid" ||
                      manualPayment?.status === "completed" ||
                      manualPayment?.status === "success"
                        ? "bg-emerald-500 text-white font-semibold"
                        : manualPayment?.status === "failed" || order.payment_status === "failed"
                        ? "bg-rose-500 text-white font-semibold"
                        : "bg-amber-500 text-white font-semibold animate-pulse"
                    }
                  >
                    {order.payment_status === "paid" ||
                    manualPayment?.status === "completed" ||
                    manualPayment?.status === "success"
                      ? "PAID / APPROVED"
                      : manualPayment?.status === "failed"
                      ? "REJECTED"
                      : "PENDING APPROVAL"}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4 space-y-3 text-xs">
                {/* Amount */}
                <div className="flex items-center justify-between p-2.5 rounded bg-muted/40">
                  <span className="text-muted-foreground font-medium">Payable Amount:</span>
                  <span className="text-sm font-bold font-mono text-foreground">
                    ৳ {Number(order.grand_total).toLocaleString()} BDT
                  </span>
                </div>

                {/* Sender Number / Account Holder */}
                <div className="grid grid-cols-2 gap-2 py-1 border-b">
                  <span className="text-muted-foreground">
                    {paymentMethod.includes("BANK") ? "Depositor / Account Name:" : "Sender Phone Number:"}
                  </span>
                  <span className="font-mono font-bold text-foreground text-right">
                    {manualPayment?.gateway_response?.sender_number ||
                      manualPayment?.reference_number ||
                      manualPayment?.gateway_response?.account_holder_name ||
                      shipping?.phone ||
                      customer?.phone ||
                      "—"}
                  </span>
                </div>

                {/* Transaction ID / Slip */}
                <div className="flex items-center justify-between py-1 border-b">
                  <span className="text-muted-foreground">Transaction ID (TrxID):</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded text-foreground">
                      {manualPayment?.gateway_transaction_id ||
                        manualPayment?.gateway_response?.transaction_id ||
                        (order.payment_status === "paid" ? "VERIFIED-MANUAL" : "—")}
                    </span>
                    {(manualPayment?.gateway_transaction_id || manualPayment?.gateway_response?.transaction_id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        type="button"
                        onClick={() =>
                          handleCopyTrx(
                            manualPayment?.gateway_transaction_id ||
                              manualPayment?.gateway_response?.transaction_id ||
                              ""
                          )
                        }
                      >
                        {copiedTrx ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Bank details if Bank transfer */}
                {paymentMethod.includes("BANK") && (
                  <>
                    <div className="grid grid-cols-2 gap-2 py-1 border-b">
                      <span className="text-muted-foreground">Sender Bank Name:</span>
                      <span className="font-semibold text-right text-foreground">
                        {manualPayment?.gateway_response?.bank_name || "—"}
                      </span>
                    </div>
                    {manualPayment?.gateway_response?.branch_name && (
                      <div className="grid grid-cols-2 gap-2 py-1 border-b">
                        <span className="text-muted-foreground">Branch:</span>
                        <span className="font-semibold text-right text-foreground">
                          {manualPayment.gateway_response.branch_name}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Customer note / Reference */}
                {manualPayment?.gateway_response?.notes && (
                  <div className="py-1 border-b">
                    <span className="text-muted-foreground block mb-0.5">Customer Note:</span>
                    <p className="bg-muted/60 p-2 rounded text-slate-700 dark:text-slate-300 italic text-[11px]">
                      "{manualPayment.gateway_response.notes}"
                    </p>
                  </div>
                )}

                {/* Submission timestamp */}
                {manualPayment?.created_at && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Submitted:
                    </span>
                    <span>{new Date(manualPayment.created_at).toLocaleString()}</span>
                  </div>
                )}

                {/* Action Buttons: Approve / Reject */}
                {order.payment_status !== "paid" ? (
                  <div className="pt-3 flex items-center gap-2 border-t">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 h-9"
                      onClick={handleApprovePayment}
                      disabled={isApproving || isRejecting || !order.items || order.items.length === 0}
                      title={!order.items || order.items.length === 0 ? "Cannot approve order with 0 items" : undefined}
                    >
                      {isApproving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Approve Payment
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 text-xs font-semibold gap-1.5 h-9"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={isApproving || isRejecting}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 border-t text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Payment Verified & Approved
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {/* COD Fraud Shield & Risk Assessment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  COD Fraud Shield
                </span>
                <Badge
                  className={
                    order.risk_level === "HIGH"
                      ? "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400"
                      : order.risk_level === "MEDIUM"
                      ? "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400"
                      : "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400"
                  }
                  variant="outline"
                >
                  Risk: {order.risk_level || "LOW"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-xs py-1 border-b">
                <span className="text-muted-foreground">Risk Score:</span>
                <span className="font-mono font-semibold">{order.risk_score ?? 0} / 100</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b">
                <span className="text-muted-foreground">Verification State:</span>
                <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                  {order.verification_status || "UNVERIFIED"}
                </Badge>
              </div>
              {order.verification_verified_at && (
                <div className="flex items-center justify-between text-xs py-1 border-b">
                  <span className="text-muted-foreground">Verified At:</span>
                  <span className="font-mono text-muted-foreground">
                    {new Date(order.verification_verified_at).toLocaleString()}
                  </span>
                </div>
              )}
              {Array.isArray(order.risk_reasons) && order.risk_reasons.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                    Explainable Risk Signals:
                  </p>
                  <ul className="space-y-1">
                    {order.risk_reasons.map((reason: string, idx: number) => (
                      <li
                        key={idx}
                        className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 flex items-start gap-1.5"
                      >
                        <span className="text-primary font-bold">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Transitions */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status & Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">Current State:</span>
                <Badge className="text-sm capitalize font-medium">{order.status.replace(/_/g, " ")}</Badge>
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Update Lifecycle State
                </p>
                <div className="flex flex-wrap gap-2">
                  {order.status === "paid" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate("confirmed")}
                      disabled={isUpdatingStatus}
                    >
                      Confirm Order
                    </Button>
                  )}
                  {order.status === "confirmed" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate("preparing")}
                      disabled={isUpdatingStatus}
                    >
                      Start Preparing
                    </Button>
                  )}
                  {order.status === "preparing" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate("picking")}
                      disabled={isUpdatingStatus}
                    >
                      Picking
                    </Button>
                  )}
                  {order.status === "picking" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate("packing")}
                      disabled={isUpdatingStatus}
                    >
                      Packing
                    </Button>
                  )}
                  {order.status === "packing" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate("ready_for_shipment")}
                      disabled={isUpdatingStatus}
                    >
                      Ready for Shipment
                    </Button>
                  )}
                  {order.status === "ready_for_shipment" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate("shipped")}
                      disabled={isUpdatingStatus}
                    >
                      Mark Shipped
                    </Button>
                  )}
                  {order.status === "shipped" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate("delivered")}
                      disabled={isUpdatingStatus}
                    >
                      Mark Delivered
                    </Button>
                  )}
                  {order.status !== "cancelled" && order.status !== "delivered" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleStatusUpdate("cancelled")}
                      disabled={isUpdatingStatus}
                    >
                      Cancel Order
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMS Notification Card (Alpha SMS) */}
          <OrderSmsCard
            orderId={order.id}
            orderStatus={order.status}
            customerPhone={shipping?.phone || customer?.phone}
          />

          {/* Real Customer Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Customer Information
                </span>
                {customer ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {customer.tier || "Account"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Guest
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {customer ? (
                <>
                  <div>
                    <p className="font-semibold text-foreground text-base">
                      {customer.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Customer ID: {customer.id.substring(0, 8)}...
                    </p>
                  </div>

                  {customer.email && (
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={`mailto:${customer.email}`}
                        className="hover:text-primary transition-colors font-mono text-muted-foreground hover:underline truncate"
                      >
                        {customer.email}
                      </a>
                    </div>
                  )}

                  {customer.phone && (
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={`tel:${customer.phone}`}
                        className="hover:text-primary transition-colors font-mono"
                      >
                        {customer.phone}
                      </a>
                    </div>
                  )}

                  {shipping?.recipient_name && shipping.recipient_name !== customer.full_name && (
                    <div className="pt-2 border-t text-xs">
                      <span className="text-muted-foreground">Shipment Recipient:</span>{" "}
                      <span className="font-medium text-foreground">{shipping.recipient_name}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs gap-1.5 h-8"
                      asChild
                    >
                      <Link href={`/admin/crm/customers?search=${encodeURIComponent(customer.email || customer.full_name)}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Customer in CRM
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <p className="font-semibold text-foreground text-base">
                      {shipping?.recipient_name || "Guest Shopper"}
                    </p>
                    <span className="inline-block mt-0.5 text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Unregistered Guest Customer
                    </span>
                  </div>
                  
                  {(shipping as any)?.email && (
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a href={`mailto:${(shipping as any).email}`} className="hover:text-primary font-mono text-muted-foreground">
                        {(shipping as any).email}
                      </a>
                    </div>
                  )}

                  {shipping?.phone && (
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a href={`tel:${shipping.phone}`} className="hover:text-primary">
                        {shipping.phone}
                      </a>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t">
                    This order was placed via guest checkout without creating a permanent account profile.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Payment Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject Manual Payment</DialogTitle>
            <DialogDescription>
              Please specify the reason for rejecting this payment submission (e.g., TrxID not found in statement, incorrect amount).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label htmlFor="reject-reason" className="text-xs font-semibold text-foreground">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <Input
              id="reject-reason"
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
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRejectPayment}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
