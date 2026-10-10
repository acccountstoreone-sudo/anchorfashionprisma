"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  useReturnDetail, 
  useApproveReturn, 
  useRejectReturn, 
  useMarkReturnReceived, 
  useSyncReturnInventory, 
  useCompleteReturn, 
  useProcessReturnRefund,
  useResolveReturnRefund
} from "@/hooks/shipping/use-returns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

import Link from "next/link";
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Wallet } from "lucide-react";

export default function AdminReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: returnReq, isLoading, error, refetch } = useReturnDetail(id);

  const approveReturn = useApproveReturn();
  const rejectReturn = useRejectReturn();
  const markReceived = useMarkReturnReceived();
  const syncInventory = useSyncReturnInventory();
  const completeReturn = useCompleteReturn();
  const processRefund = useProcessReturnRefund();
  const resolveRefund = useResolveReturnRefund();

  const [isProcessing, setIsProcessing] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground gap-3">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <p>Loading return details...</p>
      </div>
    );
  }

  if (error || !returnReq) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Link href="/admin/orders/returns" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Returns
        </Link>
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <CardTitle className="text-lg">Error Loading Return Details</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              {error?.message || "The requested return record could not be found or you do not have permission to view it."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link href="/admin/orders/returns">View All Returns</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAction = async (actionFn: any, payload?: any, successMessage = "Action completed") => {
    setIsProcessing(true);
    try {
      await actionFn.mutateAsync(payload ?? id);
      toast.success(successMessage);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "requested": return <Badge variant="secondary">Requested</Badge>;
      case "approved": return <Badge variant="default">Approved</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      case "received": return <Badge variant="outline">Received</Badge>;
      case "inventory_synced": return <Badge variant="outline">Inventory Synced</Badge>;
      case "completed": return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <Link href="/admin/orders/returns" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to Returns
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Return #{returnReq.return_number}</h1>
          <p className="text-muted-foreground mt-1">
            Order:{" "}
            {returnReq.order_id ? (
              <Link href={`/admin/orders/${returnReq.order_id}`} className="text-primary hover:underline font-mono">
                {returnReq.order_id}
              </Link>
            ) : (
              "N/A"
            )}{" "}
            • Created: {new Date(returnReq.created_at).toLocaleString()}
          </p>
        </div>
        <div>{getStatusBadge(returnReq.status)}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Return Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {returnReq.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg bg-gray-50/50">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">SKU: {item.sku} • Qty: {item.quantity}</p>
                      <p className="text-sm text-muted-foreground mt-1">Condition: <span className="capitalize">{item.condition}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">৳{item.refund_amount?.toFixed(2) || "0.00"}</p>
                      {item.restocked && <Badge variant="outline" className="mt-2 text-xs">Restocked</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {returnReq.photo_urls && returnReq.photo_urls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Photo Proof</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {returnReq.photo_urls.map((url: string, idx: number) => (
                    <div key={idx} className="relative w-48 h-48 flex-shrink-0 border rounded-lg overflow-hidden">
                      <Image src={url} alt={`Proof ${idx + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Customer Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                {returnReq.customer_note || returnReq.notes || "No notes provided."}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Progress the return lifecycle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {returnReq.status === "requested" && (
                <>
                  <Button 
                    className="w-full" 
                    disabled={isProcessing}
                    onClick={() => handleAction(approveReturn, id, "Return approved")}
                  >
                    Approve Request
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="destructive"
                    disabled={isProcessing}
                    onClick={() => {
                      const reason = window.prompt("Rejection reason:");
                      if (reason) handleAction(rejectReturn, { returnId: id, reason }, "Return rejected");
                    }}
                  >
                    Reject Request
                  </Button>
                </>
              )}

              {(returnReq.status === "approved" || returnReq.status === "picked_up" || returnReq.status === "in_transit") && (
                <Button 
                  className="w-full" 
                  disabled={isProcessing}
                  onClick={() => handleAction(markReceived, id, "Return marked as received")}
                >
                  Mark Received at Warehouse
                </Button>
              )}

              {returnReq.status === "received" && (
                <Button 
                  className="w-full" 
                  disabled={isProcessing}
                  onClick={() => {
                    // In a real flow, you'd have a modal to select condition for each item. 
                    // For simplicity, we just pass an empty obj to use existing item conditions.
                    handleAction(syncInventory, id, "Inventory synced");
                  }}
                >
                  Inspect & Sync Inventory
                </Button>
              )}

              {(returnReq.status === "inventory_synced" || returnReq.status === "received" || (returnReq.status !== "completed" && returnReq.status !== "requested" && returnReq.status !== "rejected" && returnReq.status !== "cancelled")) && (
                <div className="space-y-2 pt-3 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Resolution & Settlement
                  </p>
                  
                  {returnReq.refund_status !== "PROCESSED" && (
                    <>
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                        disabled={isProcessing}
                        onClick={() => {
                          if (window.confirm(`Confirm settling refund of ৳${returnReq.refund_amount} and marking this return as Completed & Resolved?`)) {
                            handleAction(resolveRefund, { returnId: id, refundMethod: "GATEWAY_CONFIRMED" }, "Refund marked as settled and return resolved!");
                          }
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Settle Refund & Complete Return (৳{returnReq.refund_amount})
                      </Button>

                      <Button 
                        className="w-full" 
                        variant="secondary"
                        disabled={isProcessing}
                        onClick={() => {
                          if (window.confirm(`Refund ৳${returnReq.refund_amount} as store credit directly to customer's Anchor Wallet and resolve return?`)) {
                            handleAction(resolveRefund, { returnId: id, refundMethod: "WALLET" }, "Store credit credited to customer wallet and return resolved!");
                          }
                        }}
                      >
                        <Wallet className="mr-2 h-4 w-4" />
                        Credit Customer Wallet & Resolve
                      </Button>

                      <Button 
                        className="w-full" 
                        variant="outline"
                        disabled={isProcessing}
                        onClick={() => handleAction(processRefund, id, "Automated refund triggered")}
                      >
                        Automated Gateway Refund (৳{returnReq.refund_amount})
                      </Button>
                    </>
                  )}

                  {returnReq.status !== "completed" && returnReq.refund_status === "PROCESSED" && (
                    <Button 
                      className="w-full" 
                      variant="default"
                      disabled={isProcessing}
                      onClick={() => handleAction(completeReturn, id, "Return marked as completed")}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark Return as Completed & Resolved
                    </Button>
                  )}
                </div>
              )}

              {returnReq.status === "completed" && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <span>Return Resolved & Closed</span>
                  </div>
                  <p className="text-xs text-green-700">
                    This return lifecycle is fully completed. Refund status: <strong>{returnReq.refund_status}</strong>.
                  </p>
                  {returnReq.completed_at && (
                    <p className="text-xs text-green-600">
                      Completed: {new Date(returnReq.completed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Requested Refund:</span>
                <span className="font-medium">৳{returnReq.refund_amount?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Refund Method:</span>
                <span className="font-medium capitalize">{returnReq.refund_method?.replace("_", " ")}</span>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {returnReq.refund_status === "PROCESSED" ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 w-max">Processed</Badge>
                ) : returnReq.refund_status === "PENDING" ? (
                  <Badge variant="secondary" className="w-max">Pending</Badge>
                ) : (
                  <Badge variant="outline" className="w-max">{returnReq.refund_status || "Not Started"}</Badge>
                )}
              </div>
              {returnReq.internal_note && (
                <div className="mt-4 p-3 bg-gray-50 border rounded text-xs text-muted-foreground">
                  <strong>System Note:</strong><br/>
                  {returnReq.internal_note}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
