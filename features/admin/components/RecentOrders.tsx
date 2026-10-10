"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, User } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";

const getStatusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "completed":
    case "delivered":
    case "succeed":
    case "success":
      return (
        <span className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20 px-2.5 py-1 text-xs font-medium capitalize">
          {status}
        </span>
      );
    case "confirmed":
    case "processing":
    case "shipped":
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/20 px-2.5 py-1 text-xs font-medium capitalize">
          {status}
        </span>
      );
    case "pending":
    case "preparing":
    case "waiting":
      return (
        <span className="inline-flex items-center rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/20 px-2.5 py-1 text-xs font-medium capitalize">
          {status}
        </span>
      );
    case "cancelled":
    case "failed":
    case "refunded":
      return (
        <span className="inline-flex items-center rounded-md bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/20 px-2.5 py-1 text-xs font-medium capitalize">
          {status}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-md bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium capitalize">
          {status}
        </span>
      );
  }
};



export function RecentOrders({ data = [] }: { data?: any[] }) {
  return (
    <Card className="border-none bg-card text-card-foreground shadow-sm rounded-2xl overflow-hidden h-full">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Recent Orders</h3>

      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border">
              <tr>

                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Order Date</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center">No recent orders found</td></tr>
              ) : data.map((order) => (
                <tr key={order.id} className="hover:bg-muted/50 transition-colors">

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={order.customer_avatar} />
                        <AvatarFallback className="bg-muted text-muted-foreground"><User className="h-4 w-4"/></AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground/90">{order.customer_name || "Customer"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{format(new Date(order.created_at), "MMM dd - hh.mm a")}</td>
                  <td className="px-6 py-4 font-medium text-foreground/90">{formatCurrency(order.grand_total)}</td>
                  <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-border text-sm text-muted-foreground text-center">
          Showing {data.length} recent orders
        </div>
      </CardContent>
    </Card>
  );
}

