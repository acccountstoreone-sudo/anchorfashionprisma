"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
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
import { toast } from "sonner";
import { createTicketAction } from "@/app/actions/customer.actions";
import { MessageSquare, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const ticketSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters"),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export function TicketsList({ initialTickets }: { initialTickets: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: "",
      description: "",
    },
  });

  const onSubmit = (values: TicketFormValues) => {
    const formData = new FormData();
    formData.append("subject", values.subject);
    formData.append("description", values.description);

    startTransition(async () => {
      try {
        await createTicketAction(formData);
        toast.success("Support ticket created successfully");
        reset();
        setIsOpen(false);
      } catch (error: any) {
        toast.error(error.message || "Failed to create ticket");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Dialog
          open={isOpen}
          onOpenChange={(val) => {
            setIsOpen(val);
            if (!val) reset();
          }}
        >
          <DialogTrigger render={<Button>Open New Ticket</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Open Support Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticket_subject">Subject</Label>
                <Input
                  id="ticket_subject"
                  placeholder="Brief description of the issue"
                  {...register("subject")}
                  className={errors.subject ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.subject && (
                  <p className="text-xs text-destructive">{errors.subject.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket_description">Description</Label>
                <Textarea
                  id="ticket_description"
                  placeholder="Provide details about your issue..."
                  rows={5}
                  {...register("description")}
                  className={errors.description ? "border-destructive focus-visible:ring-destructive" : ""}
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
      </div>

      <div className="grid gap-4">
        {initialTickets.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              You don't have any support tickets yet.
            </p>
          </div>
        ) : (
          initialTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="transition-colors hover:border-primary/50"
            >
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                  <CardDescription>
                    Ticket #{ticket.id.split("-")[0]}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                      ? "secondary"
                      : "default"
                  }
                >
                  {ticket.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {ticket.description}
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Opened on {new Date(ticket.created_at).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="justify-end pt-0">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/account/support/${ticket.id}`}>
                    View Details
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
