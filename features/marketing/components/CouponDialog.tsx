"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createCouponAction } from "@/actions/marketing.actions";
import { CouponRecord } from "@/lib/repositories/marketing/coupon.repository";

const couponFormSchema = z
  .object({
    code: z
      .string()
      .min(3, "Coupon code must be at least 3 characters")
      .max(30)
      .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, hyphens, and underscores"),
    discount_type: z.enum(["PERCENTAGE", "FIXED"]),
    value: z.coerce.number().min(1, "Value must be greater than 0"),
    min_order_value: z.coerce.number().optional().nullable(),
    max_discount: z.coerce.number().optional().nullable(),
    usage_limit: z.coerce.number().optional().nullable(),
    valid_from: z.string().min(1, "Valid from date is required"),
    valid_until: z.string().min(1, "Valid until date is required"),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      const start = new Date(data.valid_from).getTime();
      const end = new Date(data.valid_until).getTime();
      return !isNaN(start) && !isNaN(end) && start < end;
    },
    {
      message: "Expiration date must be after valid from date",
      path: ["valid_until"],
    }
  );

type CouponFormValues = z.infer<typeof couponFormSchema>;

interface CouponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newCoupon: CouponRecord) => void;
}

export function CouponDialog({ open, onOpenChange, onSuccess }: CouponDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: "",
      discount_type: "PERCENTAGE",
      value: 15,
      min_order_value: 0,
      max_discount: 0,
      usage_limit: 100,
      valid_from: new Date().toISOString().split("T")[0],
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      is_active: true,
    },
  });

  const onSubmit = async (values: CouponFormValues) => {
    setSubmitting(true);
    try {
      const res = await createCouponAction({
        code: values.code,
        discount_type: values.discount_type,
        value: values.value,
        min_order_value: values.min_order_value || undefined,
        max_discount: values.max_discount || undefined,
        usage_limit: values.usage_limit || undefined,
        valid_from: values.valid_from,
        valid_until: values.valid_until,
        is_active: values.is_active,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to create coupon");
        return;
      }

      toast.success(`Coupon "${values.code}" created successfully!`);
      if (res.data) onSuccess?.(res.data);
      form.reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Create Coupon Code
          </DialogTitle>
          <DialogDescription>
            Configure a promotional voucher code with custom discount rules.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupon Code <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. FLASH25"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type & Value */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discount_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                        <SelectItem value="FIXED">Fixed Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Value <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Usage Limit & Min Order */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="usage_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usage Limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Unlimited"
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
                name="min_order_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Order Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Active Switch */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Active Status</FormLabel>
                    <FormDescription className="text-xs">
                      Coupon is ready to be redeemed at checkout.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                    Creating...
                  </>
                ) : (
                  "Create Coupon"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
