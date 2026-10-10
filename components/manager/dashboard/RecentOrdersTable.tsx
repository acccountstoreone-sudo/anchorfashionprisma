"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface OrderData {
  id: string;
  orderNumber?: string;
  customer?: string;
  customerAvatar?: string | null;
  status: string;
  date: string;
  amount: number | string;
}

export function RecentOrdersTable({ orders = [] }: { orders?: OrderData[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            You have {orders.length} orders in this view.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/manager/orders">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    {order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>{order.customer || "Guest"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.status.toLowerCase() === "delivered"
                          ? "default"
                          : order.status.toLowerCase() === "processing"
                            ? "secondary"
                            : order.status.toLowerCase() === "shipped"
                              ? "outline"
                              : "destructive"
                      }
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell className="text-right">
                    {typeof order.amount === "number"
                      ? formatCurrency(order.amount)
                      : order.amount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
