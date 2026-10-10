"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Plus,
  MoreHorizontal,
  AlertCircle,
  Search,
  CheckCircle,
  ArrowUpRight,
  UserCheck,
  LifeBuoy,
  Edit3,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  assignTicketAction,
  changeTicketStatusAction,
  changeTicketPriorityAction,
  deleteTicketAction,
} from "@/app/actions/support/ticket.actions";
import { CreateTicketDialog } from "./CreateTicketDialog";
import { EditTicketDialog } from "./EditTicketDialog";

interface TicketsClientProps {
  initialTickets: any[];
  currentUserId?: string;
  customers: any[];
  agents: any[];
}

export function TicketsClient({
  initialTickets,
  currentUserId,
  customers = [],
  agents = [],
}: TicketsClientProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>(initialTickets);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<any | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchSearch =
        !search.trim() ||
        ticket.id.toLowerCase().includes(search.toLowerCase()) ||
        (ticket.subject || "").toLowerCase().includes(search.toLowerCase()) ||
        (ticket.customer?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (ticket.customer_profiles?.first_name || "").toLowerCase().includes(search.toLowerCase());

      const normalizedStatus = (ticket.status || "").toLowerCase();
      const matchStatus =
        statusFilter === "all" ||
        normalizedStatus === statusFilter.toLowerCase();

      const normalizedPriority = (ticket.priority || "").toLowerCase();
      const matchPriority =
        priorityFilter === "all" ||
        normalizedPriority === priorityFilter.toLowerCase();

      return matchSearch && matchStatus && matchPriority;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  const handleAssignToMe = (ticketId: string) => {
    if (!currentUserId) {
      toast.error("Could not identify current logged in user.");
      return;
    }

    startTransition(async () => {
      const res = await assignTicketAction(ticketId, currentUserId);
      if (res.success) {
        toast.success("Ticket assigned to you");
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, assigned_agent_id: currentUserId, status: "in_progress" } : t
          )
        );
      } else {
        toast.error(res.error || "Failed to assign ticket");
      }
    });
  };

  const handleChangeStatus = (ticketId: string, newStatus: string) => {
    startTransition(async () => {
      const res = await changeTicketStatusAction(ticketId, newStatus);
      if (res.success) {
        const savedStatus =
          res.data?.status ||
          (newStatus.toLowerCase() === "assigned" || newStatus.toLowerCase() === "escalated"
            ? "in_progress"
            : newStatus.toLowerCase());
        toast.success(`Status updated to ${savedStatus.replace(/_/g, " ")}`);
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: savedStatus } : t))
        );
      } else {
        toast.error(res.error || "Failed to update status");
      }
    });
  };

  const handleEscalate = (ticketId: string) => {
    startTransition(async () => {
      const res = await changeTicketPriorityAction(ticketId, "urgent");
      if (res.success) {
        await changeTicketStatusAction(ticketId, "in_progress");
        toast.success("Ticket escalated to Critical priority");
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, priority: "critical", status: "in_progress" } : t
          )
        );
      } else {
        toast.error(res.error || "Failed to escalate ticket");
      }
    });
  };

  const handleDeleteTicket = (ticketId: string) => {
    startTransition(async () => {
      const res = await deleteTicketAction(ticketId);
      if (res.success) {
        toast.success("Ticket deleted successfully");
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
        setDeletingTicket(null);
      } else {
        toast.error(res.error || "Failed to delete ticket");
      }
    });
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "destructive";
      case "urgent":
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage customer inquiries, service requests, and SLA resolutions.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Ticket
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets by ID, subject, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 bg-card"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val || "all")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Tickets</CardTitle>
              <CardDescription>
                Showing {filteredTickets.length} of {tickets.length} tickets
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Ticket ID</TableHead>
                  <TableHead>Subject / Customer</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Agent</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        <LifeBuoy className="h-6 w-6 text-muted-foreground/40 mb-1" />
                        <p className="font-semibold text-foreground">No tickets found</p>
                        <p className="text-xs">
                          {tickets.length === 0
                            ? "Use 'Create Ticket' to record a new request."
                            : "No tickets match your filter criteria."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket: any) => {
                    const customerName =
                      ticket.customer?.full_name ||
                      [ticket.customer_profiles?.first_name, ticket.customer_profiles?.last_name]
                        .filter(Boolean)
                        .join(" ") ||
                      "Customer";

                    return (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                          {ticket.id.substring(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/support/tickets/${ticket.id}`}
                            className="font-medium text-foreground hover:underline text-sm block"
                          >
                            {ticket.subject}
                          </Link>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {customerName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getPriorityBadgeVariant(ticket.priority)}
                            className="capitalize text-xs font-normal"
                          >
                            {ticket.priority}
                          </Badge>
                          {ticket.priority === "critical" &&
                            ticket.status !== "resolved" &&
                            ticket.status !== "closed" && (
                              <div className="mt-1 flex items-center text-[10px] font-bold text-destructive">
                                <AlertCircle className="mr-1 h-3 w-3" /> SLA Risk
                              </div>
                            )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs font-normal">
                            {ticket.status?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {ticket.assigned_agent_id ? (
                              <>
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {ticket.assigned_agent_id.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-foreground">Assigned</span>
                              </>
                            ) : (
                              <span className="text-xs italic text-muted-foreground">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {ticket.updated_at
                            ? new Date(ticket.updated_at).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => router.push(`/admin/support/tickets/${ticket.id}`)}
                                className="cursor-pointer"
                              >
                                View Ticket
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => setEditingTicket(ticket)}
                                className="cursor-pointer"
                              >
                                <Edit3 className="mr-2 h-3.5 w-3.5" />
                                Edit Ticket
                              </DropdownMenuItem>

                              {currentUserId && (
                                <DropdownMenuItem
                                  onClick={() => handleAssignToMe(ticket.id)}
                                  disabled={isPending}
                                  className="cursor-pointer"
                                >
                                  <UserCheck className="mr-2 h-3.5 w-3.5" />
                                  Assign to me
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="cursor-pointer">
                                  Change Status
                                </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                      onClick={() => handleChangeStatus(ticket.id, "open")}
                                    >
                                      Open
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleChangeStatus(ticket.id, "in_progress")}
                                    >
                                      In Progress
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleChangeStatus(ticket.id, "waiting_for_customer")}
                                    >
                                      Waiting on Customer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleChangeStatus(ticket.id, "resolved")}
                                    >
                                      Resolved
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleChangeStatus(ticket.id, "closed")}
                                    >
                                      Closed
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              <DropdownMenuItem
                                onClick={() => handleEscalate(ticket.id)}
                                disabled={isPending}
                                className="cursor-pointer"
                              >
                                <ArrowUpRight className="mr-2 h-3.5 w-3.5" />
                                Escalate Ticket
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => setDeletingTicket(ticket)}
                                disabled={isPending}
                                className="text-destructive focus:text-destructive cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete Ticket
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        customers={customers}
        agents={agents}
        onTicketCreated={(newTicket) => {
          setTickets((prev) => [newTicket, ...prev]);
        }}
      />

      {/* Edit Ticket Dialog */}
      {editingTicket && (
        <EditTicketDialog
          open={!!editingTicket}
          onOpenChange={(open) => !open && setEditingTicket(null)}
          ticket={editingTicket}
          agents={agents}
          onTicketUpdated={(updated) => {
            setTickets((prev) =>
              prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
            );
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingTicket}
        onOpenChange={(open) => !open && setDeletingTicket(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Support Ticket
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete ticket{" "}
              <span className="font-semibold text-foreground">
                #{deletingTicket?.id?.substring(0, 8)}
              </span>
              ? All conversation messages and internal notes will also be removed.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDeletingTicket(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteTicket(deletingTicket.id)}
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
