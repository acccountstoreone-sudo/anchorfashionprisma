"use client";

import React, { useEffect, useTransition } from "react";
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
import { Loader2, Edit3 } from "lucide-react";
import { updateTicketAction } from "@/app/actions/support/ticket.actions";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const editTicketSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters"),
  category: z.string().default("GENERAL"),
  priority: z.string().default("medium"),
  status: z.string().default("open"),
  agentId: z.string().optional().default("none"),
  description: z.string().trim().optional(),
});

type EditTicketFormValues = z.infer<typeof editTicketSchema>;

interface EditTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: any;
  agents?: Array<{ id: string; first_name?: string; last_name?: string; full_name?: string }>;
  onTicketUpdated?: (updatedTicket: any) => void;
}

export function EditTicketDialog({
  open,
  onOpenChange,
  ticket,
  agents = [],
  onTicketUpdated,
}: EditTicketDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<EditTicketFormValues>({
    resolver: zodResolver(editTicketSchema),
    defaultValues: {
      subject: ticket?.subject || "",
      category: ticket?.category || "GENERAL",
      priority: ticket?.priority || "medium",
      status: ticket?.status?.toLowerCase() || "open",
      agentId: ticket?.assigned_agent_id || "none",
      description: ticket?.description || "",
    },
    mode: "onTouched",
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  useEffect(() => {
    if (ticket) {
      reset({
        subject: ticket.subject || "",
        category: ticket.category || "GENERAL",
        priority: ticket.priority || "medium",
        status: ticket.status?.toLowerCase() || "open",
        agentId: ticket.assigned_agent_id || "none",
        description: ticket.description || "",
      });
    }
  }, [ticket, reset]);

  const onSubmit = (values: EditTicketFormValues) => {
    if (!ticket?.id) return;

    startTransition(async () => {
      const payload: Record<string, any> = {
        subject: values.subject.trim(),
        description: values.description ? values.description.trim() : null,
        priority: values.priority,
        category: values.category,
        status: values.status,
        assigned_agent_id: values.agentId && values.agentId !== "none" ? values.agentId : null,
      };

      const res = await updateTicketAction(ticket.id, payload);
      if (res.success) {
        toast.success("Ticket updated successfully");
        onOpenChange(false);
        if (onTicketUpdated) {
          onTicketUpdated(res.data);
        }
      } else {
        toast.error(res.error || "Failed to update ticket");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary" />
            Edit Ticket #{ticket?.id?.substring(0, 8)}
          </DialogTitle>
          <DialogDescription>
            Update ticket details, classification, priority level, or agent assignment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-ticket-subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-ticket-subject"
              placeholder="e.g., Order #4892 Delivery Delay Inquiry"
              {...register("subject")}
              className={errors.subject ? "border-rose-500 focus-visible:ring-rose-500" : ""}
            />
            {errors.subject && (
              <p className="text-xs text-rose-500 mt-1">{errors.subject.message}</p>
            )}
          </div>

          {/* Category & Status */}
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
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting_for_customer">Waiting on Customer</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Priority & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Assigned Agent</Label>
              <Controller
                name="agentId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to agent..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      <SelectItem value="none">Unassigned (Pool Queue)</SelectItem>
                      {agents.map((a) => {
                        const name = a.full_name || [a.first_name, a.last_name].filter(Boolean).join(" ") || a.id;
                        return (
                          <SelectItem key={a.id} value={a.id}>
                            {name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-ticket-description">Issue Description</Label>
            <Textarea
              id="edit-ticket-description"
              placeholder="Update problem description or additional context..."
              rows={4}
              {...register("description")}
            />
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
