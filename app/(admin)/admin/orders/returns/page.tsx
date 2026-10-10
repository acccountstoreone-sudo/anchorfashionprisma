"use client";

import { useState } from "react";
import { useReturns } from "@/hooks/shipping/use-returns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminReturnsOrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useReturns({ page, limit: 10, search });

  if (error) return <div className="p-6 text-red-500">Error loading returns</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "requested": return <Badge variant="secondary">Requested</Badge>;
      case "approved": return <Badge variant="default">Approved</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      case "received": return <Badge variant="outline">Received</Badge>;
      case "completed": return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Return Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Return Requests</CardTitle>
          <div className="flex space-x-2">
            <Input 
              placeholder="Search return number..." 
              className="max-w-xs" 
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-4 text-center">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Refund Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Refund Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((ret: any) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/orders/returns/${ret.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {ret.return_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(ret.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="capitalize">{ret.reason}</TableCell>
                    <TableCell>৳{ret.refund_amount?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell>{getStatusBadge(ret.status)}</TableCell>
                    <TableCell>
                      {ret.refund_status === "PROCESSED" ? (
                         <Badge variant="outline" className="bg-green-100 text-green-800">Refunded</Badge>
                      ) : ret.refund_status === "PENDING" ? (
                        <Badge variant="secondary">Pending Refund</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/orders/returns/${ret.id}`}>
                        <Button variant="outline" size="sm">
                          Review
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.data || data.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No returns found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {!isLoading && data && (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {data.totalPages || 1}</span>
              <Button
                variant="outline"
                disabled={page >= (data.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
