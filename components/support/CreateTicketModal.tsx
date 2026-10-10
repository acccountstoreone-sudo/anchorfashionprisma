"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createTicketAction } from "@/app/actions/support/ticket.actions";

const ticketModalSchema = z.object({
  customerId: z.string().trim().min(1, "Customer profile ID is required"),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters"),
  category: z.enum(["general", "order", "payment", "technical"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
});

type TicketModalFormValues = z.infer<typeof ticketModalSchema>;

export function CreateTicketModal() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TicketModalFormValues>({
    resolver: zodResolver(ticketModalSchema),
    defaultValues: {
      customerId: "",
      subject: "",
      category: "general",
      priority: "medium",
      description: "",
    },
  });

  const onSubmit = (values: TicketModalFormValues) => {
    startTransition(async () => {
      try {
        const res = await createTicketAction({
          customerId: values.customerId,
          subject: values.subject,
          category: values.category.toUpperCase(),
          priority: values.priority,
          description: values.description,
        });

        if (res && !res.success) {
          toast.error(res.error || "Failed to create support ticket");
          return;
        }

        toast.success("Support ticket created successfully");
        reset();
        setOpen(false);
      } catch (err: any) {
        toast.error(err.message || "Something went wrong creating ticket");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) reset();
      }}
    >
      <DialogTrigger render={<Button />}>Create Ticket</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Support Ticket</DialogTitle>
        </DialogHeader>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="customerId">Customer Profile ID</Label>
            <Input
              id="customerId"
              placeholder="Enter customer profile ID"
              {...register("customerId")}
              className={errors.customerId ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.customerId && (
              <p className="text-xs text-destructive">{errors.customerId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Brief description of the issue"
              {...register("subject")}
              className={errors.subject ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.subject && (
              <p className="text-xs text-destructive">{errors.subject.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="order">Order Issue</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
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
              {errors.priority && (
                <p className="text-xs text-destructive">{errors.priority.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Detailed explanation..."
              className={`min-h-[100px] ${
                errors.description ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Ticket"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
