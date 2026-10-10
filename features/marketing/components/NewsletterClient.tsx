"use client";

import React, { useState, useMemo } from "react";
import { Search, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewsletterExportButton } from "@/app/(admin)/admin/marketing/newsletter/NewsletterExportButton";
import Link from "next/link";

interface SubscriberRecord {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  source?: string | null;
  status: string;
  subscribed_at?: string | null;
}

interface NewsletterClientProps {
  initialSubscribers: SubscriberRecord[];
}

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case "subscribed":
    case "active":
      return <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 font-normal">Active</Badge>;
    case "unsubscribed":
      return <Badge variant="secondary" className="font-normal">Unsubscribed</Badge>;
    case "bounced":
      return <Badge variant="destructive" className="font-normal">Bounced</Badge>;
    default:
      return <Badge variant="outline" className="font-normal">{status}</Badge>;
  }
};

export function NewsletterClient({ initialSubscribers }: NewsletterClientProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return initialSubscribers;
    const q = search.toLowerCase().trim();
    return initialSubscribers.filter((s) => {
      const email = (s.email || "").toLowerCase();
      const first = (s.first_name || "").toLowerCase();
      const last = (s.last_name || "").toLowerCase();
      const src = (s.source || "").toLowerCase();
      return email.includes(q) || first.includes(q) || last.includes(q) || src.includes(q);
    });
  }, [initialSubscribers, search]);

  return (
    <div className="flex flex-col gap-6 p-8 pt-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Newsletter Subscribers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your opted-in customer email list and subscription channels.
          </p>
        </div>
        <div className="flex gap-2">
          <NewsletterExportButton subscribers={initialSubscribers} />
          <Button asChild>
            <Link href="/admin/marketing/campaigns">
              <Mail className="mr-2 h-4 w-4" /> Create Campaign
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search email, name, or source..."
            className="pl-8 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Subscribed At</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <p className="font-semibold text-foreground">
                      {initialSubscribers.length === 0
                        ? "No subscribers found."
                        : "No subscribers match your search."}
                    </p>
                    <p className="text-xs">
                      {initialSubscribers.length === 0
                        ? "New signups from the storefront footer will appear here."
                        : "Try a different email or keyword query."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.email}</TableCell>
                  <TableCell>{sub.first_name || "—"}</TableCell>
                  <TableCell>{sub.last_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{sub.source || "Website Footer"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {sub.subscribed_at ? new Date(sub.subscribed_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(sub.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
