"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  CheckCircle,
  RotateCcw,
  ArrowLeft,
  Lock,
  MessageSquare,
  Loader2,
  Calendar,
  AlertCircle,
  ExternalLink,
  Edit3,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  replyTicketAction,
  addInternalNoteAction,
  changeTicketStatusAction,
  changeTicketPriorityAction,
  deleteTicketAction,
} from "@/app/actions/support/ticket.actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditTicketDialog } from "../EditTicketDialog";

interface TicketDetailClientProps {
  initialTicket: any;
  currentUserId?: string;
  agents?: any[];
}

export function TicketDetailClient({
  initialTicket,
  currentUserId,
  agents = [],
}: TicketDetailClientProps) {
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(initialTicket);
  const [messages, setMessages] = useState<any[]>(
    initialTicket.ticket_messages || []
  );
  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const customer =
    ticket.customer ||
    ticket.customer_profiles || {
      first_name: "Customer",
      email: "Unassigned",
    };

  const isResolvedOrClosed =
    ticket.status?.toLowerCase() === "resolved" ||
    ticket.status?.toLowerCase() === "closed";

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyText.trim()) {
      toast.error("Please enter a message before sending");
      return;
    }

    startTransition(async () => {
      const senderId =
        currentUserId && UUID_REGEX.test(currentUserId.trim())
          ? currentUserId.trim()
          : ticket.assigned_agent_id && UUID_REGEX.test(ticket.assigned_agent_id.trim())
          ? ticket.assigned_agent_id.trim()
          : undefined;

      if (isInternalNote) {
        const res = await addInternalNoteAction(ticket.id, replyText.trim(), senderId);
        if (res.success) {
          toast.success("Internal note added");
          setMessages((prev) => [
            ...prev,
            res.data || {
              id: `temp-${Date.now()}`,
              ticket_id: ticket.id,
              sender_id: senderId,
              sender_type: "AGENT",
              message: replyText.trim(),
              is_internal_note: true,
              created_at: new Date().toISOString(),
            },
          ]);
          setReplyText("");
          setIsInternalNote(false);
        } else {
          toast.error(res.error || "Failed to add internal note");
        }
      } else {
        const res = await replyTicketAction(ticket.id, replyText.trim(), senderId, "AGENT");
        if (res.success) {
          toast.success("Reply sent to customer");
          setMessages((prev) => [
            ...prev,
            res.data || {
              id: `temp-${Date.now()}`,
              ticket_id: ticket.id,
              sender_id: senderId,
              sender_type: "AGENT",
              message: replyText.trim(),
              is_internal_note: false,
              created_at: new Date().toISOString(),
            },
          ]);
          setReplyText("");
          setTicket((prev: any) => ({ ...prev, status: "waiting_for_customer" }));
        } else {
          toast.error(res.error || "Failed to send reply");
        }
      }
    });
  };

  const handleToggleResolve = () => {
    startTransition(async () => {
      const nextStatus = isResolvedOrClosed ? "open" : "resolved";
      const res = await changeTicketStatusAction(ticket.id, nextStatus);
      if (res.success) {
        setTicket((prev: any) => ({ ...prev, status: nextStatus }));
        toast.success(
          nextStatus === "resolved" ? "Ticket marked as Resolved" : "Ticket Reopened"
        );
      } else {
        toast.error(res.error || "Failed to update ticket status");
      }
    });
  };

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      const res = await changeTicketStatusAction(ticket.id, newStatus);
      if (res.success) {
        setTicket((prev: any) => ({ ...prev, status: newStatus }));
        toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
      } else {
        toast.error(res.error || "Failed to update status");
      }
    });
  };

  const handlePriorityChange = (newPriority: string) => {
    startTransition(async () => {
      const res = await changeTicketPriorityAction(ticket.id, newPriority);
      if (res.success) {
        setTicket((prev: any) => ({ ...prev, priority: newPriority }));
        toast.success(`Priority updated to ${newPriority}`);
      } else {
        toast.error(res.error || "Failed to update priority");
      }
    });
  };

  const handleDeleteTicket = () => {
    startTransition(async () => {
      const res = await deleteTicketAction(ticket.id);
      if (res.success) {
        toast.success("Ticket deleted successfully");
        router.push("/admin/support/tickets");
      } else {
        toast.error(res.error || "Failed to delete ticket");
      }
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/support/tickets"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mr-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Tickets
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Ticket #{ticket.id.substring(0, 8)}
            </h1>
            <Badge variant="outline" className="capitalize text-xs font-medium">
              {ticket.status?.replace(/_/g, " ")}
            </Badge>
            <Badge
              variant={
                ticket.priority === "critical"
                  ? "destructive"
                  : ticket.priority === "urgent" || ticket.priority === "high"
                  ? "default"
                  : "secondary"
              }
              className="capitalize text-xs font-medium"
            >
              {ticket.priority} Priority
            </Badge>
          </div>
          <p className="text-base sm:text-lg font-medium text-foreground">
            {ticket.subject}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
            disabled={isPending}
            className="gap-1.5"
          >
            <Edit3 className="h-4 w-4" /> Edit Ticket
          </Button>

          <Button
            variant={isResolvedOrClosed ? "outline" : "default"}
            size="sm"
            onClick={handleToggleResolve}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isResolvedOrClosed ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4" /> Reopen Ticket
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" /> Resolve Ticket
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isPending}
            className="text-destructive hover:bg-destructive/10 gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Main Grid: Responsive 1 column on mobile/tablet, 3 columns on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Conversation Thread */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Conversation Thread
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {messages.length} {messages.length === 1 ? "message" : "messages"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-4 sm:p-6">
              {ticket.description && (
                <div className="rounded-lg border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Original Request
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-foreground">
                    {ticket.description}
                  </p>
                </div>
              )}

              {messages.length === 0 && !ticket.description && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No messages logged yet. Use the response form below.
                </div>
              )}

              {messages.map((msg: any) => {
                const isAgent = msg.sender_type === "AGENT";
                const isInternal = !!msg.is_internal_note;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isAgent && !isInternal ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback
                        className={`text-xs ${
                          isInternal
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : isAgent
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {isInternal ? "N" : isAgent ? "A" : (customer.first_name?.charAt(0) || "C")}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`flex-1 max-w-[85%] sm:max-w-[75%] space-y-1.5 ${
                        isAgent && !isInternal ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 text-xs ${
                          isAgent && !isInternal ? "flex-row-reverse" : ""
                        }`}
                      >
                        <span className="font-semibold text-foreground">
                          {isInternal
                            ? "Internal Staff Note"
                            : isAgent
                            ? "Support Agent"
                            : customer.first_name || "Customer"}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          • {new Date(msg.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div
                        className={`rounded-xl p-3.5 text-sm leading-relaxed ${
                          isInternal
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                            : isAgent
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted text-foreground border border-border rounded-tl-none"
                        }`}
                      >
                        {isInternal && (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                            <Lock className="h-3 w-3" /> Private internal note (not visible to customer)
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.message || msg.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>

            <Separator />

            {/* Reply Form */}
            <CardFooter className="p-4 sm:p-6 block">
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={!isInternalNote ? "default" : "outline"}
                    onClick={() => setIsInternalNote(false)}
                    className="text-xs h-8"
                  >
                    Public Reply
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={isInternalNote ? "secondary" : "outline"}
                    onClick={() => setIsInternalNote(true)}
                    className="text-xs h-8 gap-1.5"
                  >
                    <Lock className="h-3 w-3" /> Internal Note
                  </Button>
                </div>

                <Textarea
                  placeholder={
                    isInternalNote
                      ? "Add an internal note only visible to staff and managers..."
                      : `Write a reply to ${customer.first_name || "the customer"}...`
                  }
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className={`min-h-[110px] resize-none ${
                    isInternalNote
                      ? "border-amber-400 focus-visible:ring-amber-400 bg-amber-50/30 dark:bg-amber-950/20"
                      : ""
                  }`}
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {isInternalNote ? "Locked to internal team" : "Customer will receive notification"}
                  </span>
                  <Button type="submit" disabled={isPending || !replyText.trim()} size="sm">
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {isInternalNote ? "Save Note" : "Send Reply"}
                  </Button>
                </div>
              </form>
            </CardFooter>
          </Card>
        </div>

        {/* Right Sidebar: Details & Metadata */}
        <div className="space-y-6 lg:col-span-1">
          {/* Ticket Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="outline" className="capitalize">
                  {ticket.category || "General"}
                </Badge>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">Priority</span>
                <Select
                  value={ticket.priority || "medium"}
                  onValueChange={handlePriorityChange}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-7 w-[130px] text-xs font-semibold capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">Status</span>
                <Select
                  value={ticket.status?.toLowerCase() || "open"}
                  onValueChange={handleStatusChange}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-7 w-[140px] text-xs font-semibold capitalize">
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
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium text-foreground">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
              {ticket.sla_breach_at && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">SLA Breach</span>
                  <span className="font-medium text-rose-500">
                    {new Date(ticket.sla_breach_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Profile Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs sm:text-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {customer.first_name?.charAt(0) || "C"}
                  </AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <p className="font-medium text-foreground truncate">
                    {[customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {customer.email || "No email"}
                  </p>
                </div>
              </div>

              {customer.phone && (
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium text-foreground">{customer.phone}</span>
                </div>
              )}

              {(ticket.customer_id || ticket.profile_id) && (
                <Link
                  href={`/admin/customers/${ticket.customer_id || ticket.profile_id}`}
                  className="block pt-2"
                >
                  <Button variant="outline" size="sm" className="w-full gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> View Full Profile
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Related Order Card */}
          {ticket.order_id && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Related Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono font-semibold text-primary">
                    {ticket.order_id}
                  </span>
                </div>
                <Link href={`/admin/operations/fulfillment/orders`} className="block">
                  <Button variant="secondary" size="sm" className="w-full">
                    View Orders
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Ticket Dialog */}
      {editDialogOpen && (
        <EditTicketDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          ticket={ticket}
          agents={agents}
          onTicketUpdated={(updated) => {
            setTicket((prev: any) => ({ ...prev, ...updated }));
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Support Ticket
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete ticket{" "}
              <span className="font-semibold text-foreground">
                #{ticket?.id?.substring(0, 8)}
              </span>
              ? All message replies and internal notes will also be removed.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTicket}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
