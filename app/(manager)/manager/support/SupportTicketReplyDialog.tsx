"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { replyTicketAction, updateTicketAction } from "@/app/actions/support/ticket.actions";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

interface SupportTicketReplyDialogProps {
  ticket: {
    id: string;
    ticket_number?: string;
    subject: string;
    customer_name?: string;
    status: string;
    priority?: string;
    description?: string;
  };
}

export function SupportTicketReplyDialog({ ticket }: SupportTicketReplyDialogProps) {
  const [open, setOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [status, setStatus] = useState(ticket.status || "OPEN");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      toast.error("Reply message cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const res = await replyTicketAction(ticket.id, replyMessage, undefined, "AGENT");
      if (status !== ticket.status) {
        await updateTicketAction(ticket.id, { status });
      }

      if (res.success) {
        toast.success(`Reply sent for ticket ${ticket.ticket_number || ticket.id.slice(0, 8)}`);
        setReplyMessage("");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to send reply");
      }
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <MessageSquare className="mr-1 h-3.5 w-3.5" />
          Reply
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSend}>
          <DialogHeader>
            <DialogTitle>Reply to Ticket</DialogTitle>
            <DialogDescription>
              Ticket {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`} • {ticket.subject}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {ticket.description && (
              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Inquiry:</span> {ticket.description}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">Update Status</Label>
              <Select value={status} onValueChange={(val) => { if (val) setStatus(val); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Ticket status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reply">Message to Customer</Label>
              <Textarea
                id="reply"
                rows={4}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your response to the customer..."
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
