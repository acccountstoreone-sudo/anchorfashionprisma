"use client";

import { SupportTicket } from "@/types/support.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function TicketList({ tickets }: { tickets: SupportTicket[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket ID</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-4 text-center">
                No support tickets found.
              </TableCell>
            </TableRow>
          )}
          {tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">#{t.ticket_number}</TableCell>
              <TableCell>{t.subject}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    t.status === "open"
                      ? "destructive"
                      : t.status === "resolved"
                        ? "default"
                        : "secondary"
                  }
                >
                  {t.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{t.priority}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(t.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/admin/support/tickets/${t.id}`}
                  className="text-primary hover:underline"
                >
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
