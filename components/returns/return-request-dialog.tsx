"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  RefreshCcw,
  Upload,
  AlertCircle,
  CheckCircle2,
  Package,
  ShieldCheck,
  Wallet,
  CreditCard,
  Image as ImageIcon,
  X,
  Loader2,
} from "lucide-react";
import {
  useReturnEligibility,
  useSubmitCustomerReturn,
} from "@/hooks/shipping/use-returns";
import { uploadReturnProofAction } from "@/actions/returns.actions";
import { formatCurrency } from "@/lib/utils";

interface ReturnRequestDialogProps {
  orderId: string;
  orderNumber?: string;
  trigger?: React.ReactNode;
}

const RETURN_REASONS = [
  "Wrong size",
  "Wrong item received",
  "Damaged item",
  "Defective item",
  "Product not as described",
  "Quality issue",
  "Changed my mind",
  "Other",
];

export function ReturnRequestDialog({
  orderId,
  orderNumber,
  trigger,
}: ReturnRequestDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Queries & Mutations
  const { data: eligibility, isLoading, error: queryError } = useReturnEligibility(
    open ? orderId : undefined
  );
  const submitReturn = useSubmitCustomerReturn();

  // Form State
  const [selectedItems, setSelectedItems] = useState<
    Record<string, { selected: boolean; quantity: number; reason?: string }>
  >({});
  const [overallReason, setOverallReason] = useState<string>("Wrong size");
  const [customerNote, setCustomerNote] = useState<string>("");
  const [refundMethod, setRefundMethod] = useState<"WALLET" | "ORIGINAL_PAYMENT">(
    "WALLET"
  );
  const [isExchange, setIsExchange] = useState<boolean>(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedReturn, setSubmittedReturn] = useState<{
    returnId: string;
    returnNumber: string;
  } | null>(null);

  // Initialize selected items when eligibility data loads
  React.useEffect(() => {
    if (eligibility?.items) {
      const initial: Record<string, { selected: boolean; quantity: number }> = {};
      for (const item of eligibility.items) {
        if (item.isEligible) {
          initial[item.orderItemId] = {
            selected: false,
            quantity: 1,
          };
        }
      }
      setSelectedItems(initial);
    }
  }, [eligibility]);

  const toggleItemSelect = (orderItemId: string) => {
    setSelectedItems((prev) => {
      const curr = prev[orderItemId] || { selected: false, quantity: 1 };
      return {
        ...prev,
        [orderItemId]: {
          ...curr,
          selected: !curr.selected,
        },
      };
    });
  };

  const updateItemQty = (orderItemId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(1, Math.min(qty, maxQty));
    setSelectedItems((prev) => ({
      ...prev,
      [orderItemId]: {
        ...(prev[orderItemId] || { selected: true }),
        quantity: validQty,
      },
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedPhotos.length + files.length > 5) {
      setFormError("Maximum 5 proof photos allowed.");
      return;
    }

    setIsUploadingPhoto(true);
    setFormError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds 5MB limit.`);
        }
        const formData = new FormData();
        formData.append("file", file);

        const res = await uploadReturnProofAction(formData);
        if (!res.success) throw new Error(res.error);
        if (res.data?.url) {
          setUploadedPhotos((prev) => [...prev, res.data.url]);
        }
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to upload photo proof");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate dynamic estimated refund
  const estimatedRefund = React.useMemo(() => {
    if (!eligibility?.items) return 0;
    let total = 0;
    for (const item of eligibility.items) {
      const sel = selectedItems[item.orderItemId];
      if (sel?.selected) {
        total += item.netRefundablePerUnit * sel.quantity;
      }
    }
    return Math.min(Number(total.toFixed(2)), eligibility.maxRefundableAmount);
  }, [eligibility, selectedItems]);

  const anyItemSelected = Object.values(selectedItems).some((it) => it.selected);

  const handleSubmit = async () => {
    setFormError(null);

    const chosenItems = Object.entries(selectedItems)
      .filter(([_, val]) => val.selected)
      .map(([orderItemId, val]) => ({
        orderItemId,
        quantity: val.quantity,
        reason: overallReason,
      }));

    if (chosenItems.length === 0) {
      setFormError("Please select at least one item to return or exchange.");
      return;
    }

    const isDamagedOrDefective = [
      "damaged item",
      "defective item",
      "wrong item received",
    ].includes(overallReason.toLowerCase());

    if (isDamagedOrDefective && uploadedPhotos.length === 0) {
      setFormError(
        `Photo proof is required when selecting '${overallReason}'. Please upload at least one image.`
      );
      return;
    }

    try {
      const res = await submitReturn.mutateAsync({
        orderId,
        reason: overallReason,
        customerNote: customerNote.trim() || undefined,
        refundMethod: isExchange ? "MANUAL" : refundMethod,
        exchangeRequested: isExchange,
        photoUrls: uploadedPhotos,
        items: chosenItems,
      });

      setSubmittedReturn(res);
    } catch (err: any) {
      setFormError(err.message || "Failed to submit return request");
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (submittedReturn) {
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as any)
          ) : (
            <Button variant="outline" size="sm">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Return / Exchange
            </Button>
          )
        }
      />

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <RefreshCcw className="h-5 w-5 text-primary" />
            Request Return / Exchange
          </DialogTitle>
          <DialogDescription>
            Order {orderNumber ? `#${orderNumber}` : ""} · Anchor Fashion
            Customer Self-Service Portal
          </DialogDescription>
        </DialogHeader>

        {submittedReturn ? (
          <div className="space-y-6 py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Return Request Submitted!</h3>
              <p className="mt-1 text-sm text-slate-500">
                Your return number is{" "}
                <span className="font-semibold text-slate-900">
                  {submittedReturn.returnNumber}
                </span>
              </p>
            </div>

            <div className="rounded-lg border bg-slate-50 p-4 text-left text-sm text-slate-700">
              <p className="font-semibold text-slate-900">What happens next?</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Our QA department will review your submission within 24-48 hours.</li>
                <li>Once approved, a pickup representative will contact you.</li>
                <li>
                  {isExchange
                    ? "Your replacement variant will be dispatched upon item inspection."
                    : refundMethod === "WALLET"
                    ? "Your refund will be instantly credited to your Customer Wallet upon inspection."
                    : "Your refund will be remitted to your original payment method."}
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                variant="default"
                onClick={() => {
                  handleClose();
                  router.push(`/account/returns/${submittedReturn.returnId}`);
                }}
              >
                View Return Details
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm">Verifying order return eligibility...</p>
          </div>
        ) : queryError || !eligibility?.isOrderEligible ? (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">Order Ineligible for Return</p>
                <p className="mt-1 text-sm">
                  {eligibility?.ineligibilityReason ||
                    (queryError as any)?.message ||
                    "This order cannot be returned because it does not meet our return policy requirements."}
                </p>
              </div>
            </div>

            {eligibility?.hasActiveReturn && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleClose();
                    router.push(
                      eligibility.activeReturnId
                        ? `/account/returns/${eligibility.activeReturnId}`
                        : "/account/returns"
                    );
                  }}
                >
                  View Existing Return Request
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Policy Banner */}
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span>
                  Return Window: <strong>{eligibility.returnWindowDays} Days</strong>
                </span>
              </div>
              <div>
                Expires:{" "}
                <span className="font-medium">
                  {eligibility.windowExpiresAt
                    ? new Date(eligibility.windowExpiresAt).toLocaleDateString()
                    : "Active"}
                </span>
              </div>
            </div>

            {/* Step 1: Select Items */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                1. Select Items to Return or Exchange
              </Label>
              <div className="divide-y rounded-lg border">
                {eligibility.items.map((item) => {
                  const isSelected = selectedItems[item.orderItemId]?.selected ?? false;
                  const currentQty = selectedItems[item.orderItemId]?.quantity ?? 1;

                  return (
                    <div
                      key={item.orderItemId}
                      className={`flex flex-col gap-3 p-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                        !item.isEligible
                          ? "bg-slate-50 opacity-60"
                          : isSelected
                          ? "bg-slate-50/80"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`item-${item.orderItemId}`}
                          disabled={!item.isEligible}
                          checked={isSelected}
                          onCheckedChange={() => toggleItemSelect(item.orderItemId)}
                          className="mt-1"
                        />
                        <div>
                          <Label
                            htmlFor={`item-${item.orderItemId}`}
                            className="cursor-pointer font-medium text-slate-900"
                          >
                            {item.productName}
                          </Label>
                          {item.variantName && (
                            <p className="text-xs text-slate-500">{item.variantName}</p>
                          )}
                          <p className="text-xs text-slate-500">
                            Purchased: {item.purchasedQuantity} · Unit Price:{" "}
                            {formatCurrency(item.unitPrice)}
                            {item.returnedQuantity > 0 && (
                              <span className="text-amber-600">
                                {" "}
                                ({item.returnedQuantity} already returned)
                              </span>
                            )}
                          </p>
                          <p className="text-xs font-semibold text-slate-700">
                            Refund Value: {formatCurrency(item.netRefundablePerUnit)} /
                            unit
                          </p>
                        </div>
                      </div>

                      {item.isEligible ? (
                        <div className="flex items-center gap-2 pl-7 sm:pl-0">
                          <Label className="text-xs text-slate-500">Qty:</Label>
                          <Select
                            disabled={!isSelected}
                            value={String(currentQty)}
                            onValueChange={(val) => {
                              if (val) {
                                updateItemQty(
                                  item.orderItemId,
                                  parseInt(val),
                                  item.eligibleQuantity
                                );
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-16 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from(
                                { length: item.eligibleQuantity },
                                (_, i) => i + 1
                              ).map((q) => (
                                <SelectItem key={q} value={String(q)}>
                                  {q}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs text-slate-400">
                          Already Returned
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Reason & Resolution */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">2. Reason for Return</Label>
                <Select
                  value={overallReason}
                  onValueChange={(val) => {
                    if (val) setOverallReason(val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Resolution</Label>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exchange-checkbox"
                      checked={isExchange}
                      onCheckedChange={(c) => setIsExchange(Boolean(c))}
                    />
                    <Label
                      htmlFor="exchange-checkbox"
                      className="cursor-pointer text-sm font-medium"
                    >
                      Exchange for different size/variant
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Refund Method (if not exchange) */}
            {!isExchange && (
              <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
                <Label className="text-sm font-semibold">Refund Method</Label>
                <RadioGroup
                  value={refundMethod}
                  onValueChange={(val: any) => setRefundMethod(val)}
                  className="mt-2 space-y-2"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="WALLET" id="method-wallet" />
                    <Label
                      htmlFor="method-wallet"
                      className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                    >
                      <Wallet className="h-4 w-4 text-emerald-600" />
                      <span>Customer Wallet (Instant Store Credit)</span>
                      <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-700">
                        Recommended · Fast
                      </Badge>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="ORIGINAL_PAYMENT" id="method-original" />
                    <Label
                      htmlFor="method-original"
                      className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                    >
                      <CreditCard className="h-4 w-4 text-slate-600" />
                      <span>
                        {eligibility.paymentMethod === "COD"
                          ? "Cash Refund (Bank Transfer/Courier Manual Payout)"
                          : "Original Payment Method (" + eligibility.paymentMethod + ")"}
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Customer Note */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Customer Notes / Details (Optional)
              </Label>
              <Textarea
                placeholder="Provide additional details regarding fit, defects, or replacement sizing..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                className="h-20 text-sm"
              />
            </div>

            {/* Photo Proof Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Photo Proof{" "}
                  {["damaged item", "defective item", "wrong item received"].includes(
                    overallReason.toLowerCase()
                  ) ? (
                    <span className="text-red-500">* (Required for damaged/defective items)</span>
                  ) : (
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  )}
                </Label>
                <span className="text-xs text-slate-500">
                  {uploadedPhotos.length}/5 photos
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {uploadedPhotos.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative h-16 w-16 overflow-hidden rounded-md border bg-slate-100"
                  >
                    <img
                      src={url}
                      alt="Proof preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {uploadedPhotos.length < 5 && (
                  <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100">
                    {isUploadingPhoto ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span className="mt-1 text-[10px]">Add</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Estimated Refund Summary */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs text-slate-500">
                  {isExchange ? "Resolution" : "Estimated Proportional Refund"}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {isExchange ? "Exchange Request" : formatCurrency(estimatedRefund)}
                </p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!anyItemSelected || submitReturn.isPending || isUploadingPhoto}
                className="px-6"
              >
                {submitReturn.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>

            {formError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {formError}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
