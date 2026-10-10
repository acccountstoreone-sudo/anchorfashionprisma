"use client";

import { CRMCustomer } from "@/types/crm.types";
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

export function CustomerListTable({ customers }: { customers: CRMCustomer[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer ID</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Health Score</TableHead>
            <TableHead>VIP</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No customers found.
              </TableCell>
            </TableRow>
          )}
          {customers.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.profile_id}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    c.customer_lifecycle_stage === "AT_RISK"
                      ? "destructive"
                      : "default"
                  }
                >
                  {c.customer_lifecycle_stage}
                </Badge>
              </TableCell>
              <TableCell>{c.health_score}/100</TableCell>
              <TableCell>{c.is_vip ? "Yes" : "No"}</TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/admin/crm/customers/${c.id}`}
                  className="text-primary hover:underline"
                >
                  View Details
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
