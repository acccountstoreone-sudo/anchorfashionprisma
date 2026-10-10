"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ExpenseFormSchema, ExpenseFormValues } from "@/schemas/finance.schema";
import { Expense } from "@/types/finance.types";
import { createExpenseAction, updateExpenseAction } from "@/actions/finance.actions";

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  initialData?: Expense | null;
  warehouses?: { id: string; name: string }[];
  branches?: { id: string; name: string }[];
  onSuccess?: (expense: Expense) => void;
}

const CATEGORIES = [
  "Rent & Lease",
  "Utilities & Internet",
  "Logistics & Shipping",
  "Payroll & Wages",
  "Marketing & Advertising",
  "Inventory & Packaging",
  "Office Supplies",
  "Repairs & Maintenance",
  "Software & Subscriptions",
  "Legal & Professional",
  "Taxes & Duties",
  "Miscellaneous",
];

const PAYMENT_METHODS = [
  { label: "Cash on Hand", value: "CASH" },
  { label: "Bank Transfer", value: "BANK_TRANSFER" },
  { label: "Company Credit Card", value: "CREDIT_CARD" },
  { label: "Mobile Banking (bKash/Nagad)", value: "MOBILE_BANKING" },
  { label: "Bank Cheque", value: "CHEQUE" },
  { label: "Other / Petty Cash", value: "OTHER" },
];

export function ExpenseDialog({
  open,
  onOpenChange,
  mode = "create",
  initialData,
  warehouses = [],
  branches = [],
  onSuccess,
}: ExpenseDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseFormSchema),
    defaultValues: {
      amount: initialData?.amount ?? ("" as any),
      category: initialData?.category ?? "Office Supplies",
      date: initialData?.date ?? new Date().toISOString().split("T")[0],
      description: initialData?.description ?? "",
      vendor: initialData?.vendor ?? "",
      status: initialData?.status ?? "paid",
      paymentMethod: (initialData?.paymentMethod as any) ?? "CASH",
      warehouseId: initialData?.warehouseId ?? "",
      branchId: initialData?.branchId ?? "",
      notes: initialData?.notes ?? "",
      receiptUrl: initialData?.receiptUrl ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData && mode === "edit") {
        form.reset({
          amount: Number(initialData.amount),
          category: initialData.category,
          date: initialData.date,
          description: initialData.description,
          vendor: initialData.vendor || "",
          status: initialData.status,
          paymentMethod: (initialData.paymentMethod as any) || "CASH",
          warehouseId: initialData.warehouseId || "",
          branchId: initialData.branchId || "",
          notes: initialData.notes || "",
          receiptUrl: initialData.receiptUrl || "",
        });
      } else {
        form.reset({
          amount: "" as any,
          category: "Office Supplies",
          date: new Date().toISOString().split("T")[0],
          description: "",
          vendor: "",
          status: "paid",
          paymentMethod: "CASH",
          warehouseId: "",
          branchId: "",
          notes: "",
          receiptUrl: "",
        });
      }
    }
  }, [open, initialData, mode, form]);

  const onSubmit = async (values: ExpenseFormValues) => {
    setSubmitting(true);
    try {
      if (mode === "edit" && initialData?.id) {
        const res = await updateExpenseAction(initialData.id, values);
        if (!res.success) {
          toast.error(res.error || "Failed to update expense");
          return;
        }
        toast.success("Expense record updated successfully");
        if (res.data) onSuccess?.(res.data);
      } else {
        const res = await createExpenseAction(values);
        if (!res.success) {
          toast.error(res.error || "Failed to record expense");
          return;
        }
        toast.success("Expense recorded successfully");
        if (res.data) onSuccess?.(res.data);
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Expense Entry" : "Record New Expense"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Modify the existing operational expenditure or vendor payment details."
              : "Log a real operational cost, vendor bill, or facility expenditure to the general ledger."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Amount & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Amount <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Category <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Expense Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Vendor / Payee & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor / Payee</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Office Central Ltd, DESCO, DHL"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method / Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((pm) => (
                          <SelectItem key={pm.value} value={pm.value}>
                            {pm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Warehouse & Branch (Architecture supported) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associated Warehouse</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Corporate / None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Corporate HQ / Unassigned</SelectItem>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associated Branch / Store</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Corporate / None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Corporate HQ / Unassigned</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description / Purpose <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Monthly electricity bill for Uttara distribution hub"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes / Memos */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes / Bill Reference</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any voucher codes, PO references, or approval notes..."
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : mode === "edit" ? (
                  "Save Changes"
                ) : (
                  "Record Expense"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
