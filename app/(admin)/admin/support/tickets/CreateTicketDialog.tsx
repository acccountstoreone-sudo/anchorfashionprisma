"use client";

import React, { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { Loader2, LifeBuoy } from "lucide-react";
import { createTicketAction } from "@/app/actions/support/ticket.actions";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const createTicketSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters"),
  customerId: z.string().optional().default("none"),
  category: z.string().default("GENERAL"),
  priority: z.string().default("medium"),
  agentId: z.string().optional().default("none"),
  description: z.string().trim().min(10, "Please provide a detailed description (at least 10 characters)"),
});

type CreateTicketFormValues = z.infer<typeof createTicketSchema>;

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Array<{ id: string; first_name?: string; last_name?: string; email?: string }>;
  agents: Array<{ id: string; first_name?: string; last_name?: string; email?: string }>;
  onTicketCreated?: (newTicket: any) => void;
}

export function CreateTicketDialog({
  open,
  onOpenChange,
  customers = [],
  agents = [],
  onTicketCreated,
}: CreateTicketDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: "",
      customerId: "none",
      category: "GENERAL",
      priority: "medium",
      agentId: "none",
      description: "",
    },
    mode: "onTouched",
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  const onSubmit = (values: CreateTicketFormValues) => {
    startTransition(async () => {
      const payload: Record<string, any> = {
        subject: values.subject.trim(),
        description: values.description.trim(),
        priority: values.priority,
        category: values.category,
      };

      if (values.customerId && values.customerId !== "none") {
        payload.profile_id = values.customerId;
        payload.customer_id = values.customerId;
      }

      if (values.agentId && values.agentId !== "none") {
        payload.assigned_agent_id = values.agentId;
      }

      const res = await createTicketAction(payload);
      if (res.success) {
        toast.success("Support ticket created successfully");
        reset();
        onOpenChange(false);
        if (onTicketCreated) {
          onTicketCreated(res.data);
        }
      } else {
        toast.error(res.error || "Failed to create support ticket");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" />
            Create Support Ticket
          </DialogTitle>
          <DialogDescription>
            Open an internal or customer-facing support request with SLA tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ticket-subject"
              placeholder="e.g., Order #4892 Delivery Delay Inquiry"
              {...register("subject")}
              className={errors.subject ? "border-rose-500 focus-visible:ring-rose-500" : ""}
            />
            {errors.subject && (
              <p className="text-xs text-rose-500 mt-1">{errors.subject.message}</p>
            )}
          </div>

          {/* Customer Selection */}
          <div className="space-y-1.5">
            <Label>Customer Profile (Optional)</Label>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing customer or leave unassigned..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="none">None / Guest Customer</SelectItem>
                    {customers.map((c) => {
                      const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          {name ? `${name} (${c.email || "No email"})` : c.email || c.id}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General Inquiries</SelectItem>
                      <SelectItem value="ORDER_INQUIRY">Order & Shipping</SelectItem>
                      <SelectItem value="RETURNS_REFUNDS">Returns & Refunds</SelectItem>
                      <SelectItem value="BILLING">Payment & Invoicing</SelectItem>
                      <SelectItem value="PRODUCT_DEFECT">Product Quality</SelectItem>
                      <SelectItem value="TECHNICAL">Technical Issue</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Priority Level</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (48h SLA)</SelectItem>
                      <SelectItem value="medium">Medium (24h SLA)</SelectItem>
                      <SelectItem value="high">High (8h SLA)</SelectItem>
                      <SelectItem value="urgent">Urgent (4h SLA)</SelectItem>
                      <SelectItem value="critical">Critical (1h SLA)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <Label>Assign Support Agent (Optional)</Label>
            <Controller
              name="agentId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to agent or team member..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="none">Unassigned (Pool Queue)</SelectItem>
                    {agents.map((a) => {
                      const name = [a.first_name, a.last_name].filter(Boolean).join(" ");
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          {name || a.email || a.id}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-description">
              Issue Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ticket-description"
              placeholder="Provide full details, error messages, and customer requests..."
              rows={4}
              {...register("description")}
              className={errors.description ? "border-rose-500 focus-visible:ring-rose-500" : ""}
            />
            {errors.description && (
              <p className="text-xs text-rose-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
