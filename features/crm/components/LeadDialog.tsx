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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus, Pencil, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createCRMLeadSchema } from "@/schemas/crm.schema";
import { CRMLead } from "@/types/crm.types";
import { createLeadAction, updateLeadAction } from "@/actions/crm.actions";
import { z } from "zod";

type LeadFormValues = z.infer<typeof createCRMLeadSchema>;

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  initialData?: CRMLead | null;
  onSuccess?: (lead: CRMLead) => void;
}

const SOURCES = [
  "Direct",
  "Website Inquiry",
  "Referral",
  "Marketing Campaign",
  "Social Media",
  "Retail Store Visit",
  "Trade Show",
  "Other",
];

export function LeadDialog({
  open,
  onOpenChange,
  mode = "create",
  initialData,
  onSuccess,
}: LeadDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(createCRMLeadSchema),
    mode: "onTouched",
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company_name: "",
      status: "new",
      source: "Direct",
      score: 0,
      notes: "",
      custom_fields: {},
    },
  });

  useEffect(() => {
    if (open) {
      form.clearErrors();
      if (mode === "edit" && initialData) {
        form.reset({
          first_name: initialData.first_name || "",
          last_name: initialData.last_name || "",
          email: initialData.email,
          phone: initialData.phone || "",
          company_name: initialData.company_name || "",
          status: initialData.status as any,
          source: initialData.source || "Direct",
          score: initialData.score || 0,
          custom_fields: initialData.custom_fields || {},
        });
      } else {
        form.reset({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          company_name: "",
          status: "new",
          source: "Direct",
          score: 0,
          notes: "",
          custom_fields: {},
        });
      }
    }
  }, [open, mode, initialData, form]);

  const onSubmit = async (values: LeadFormValues) => {
    setSubmitting(true);
    form.clearErrors();
    try {
      if (mode === "edit" && initialData?.id) {
        const res = await updateLeadAction(initialData.id, values);
        if (res.error) {
          if (
            res.error.toLowerCase().includes("email") ||
            res.error.toLowerCase().includes("already exists")
          ) {
            form.setError("email", { type: "server", message: res.error });
          } else {
            form.setError("root", { type: "server", message: res.error });
          }
          toast.error(res.error || "Failed to update lead");
          return;
        }
        toast.success("Lead details updated successfully");
        if (res.data) onSuccess?.(res.data);
      } else {
        const res = await createLeadAction(values);
        if (res.error) {
          if (
            res.error.toLowerCase().includes("email") ||
            res.error.toLowerCase().includes("already exists")
          ) {
            form.setError("email", { type: "server", message: res.error });
          } else {
            form.setError("root", { type: "server", message: res.error });
          }
          toast.error(res.error || "Failed to create lead");
          return;
        }
        toast.success("Prospective lead registered successfully");
        if (res.data) onSuccess?.(res.data);
      }
      onOpenChange(false);
    } catch (err: any) {
      form.setError("root", {
        type: "server",
        message: err.message || "An unexpected error occurred",
      });
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "edit" ? (
              <>
                <Pencil className="h-5 w-5 text-primary" />
                Edit Prospective Lead
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 text-primary" />
                Register New Lead
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update contact details and conversion qualification status."
              : "Capture a prospective wholesale or retail client into the CRM pipeline."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {form.formState.errors.root && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{form.formState.errors.root.message}</span>
              </div>
            )}

            {/* Name: First and Last */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      First Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Ahsan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Habib" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email Address <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="client@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+880 1712 345678"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Company & Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization / Company</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Silk & Style Retail"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Source</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "Direct"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select acquisition channel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOURCES.map((src) => (
                          <SelectItem key={src} value={src}>
                            {src}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualification Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select lead stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="new">New Prospect</SelectItem>
                      <SelectItem value="contacted">Contacted / In Discussion</SelectItem>
                      <SelectItem value="qualified">Qualified Opportunity</SelectItem>
                      <SelectItem value="converted">Converted to Customer</SelectItem>
                      <SelectItem value="lost">Lost / Unresponsive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any initial discussion details, requirements, or sourcing requests..."
                      className="resize-none"
                      rows={3}
                      {...field}
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
                  "Update Lead"
                ) : (
                  "Add Lead"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
