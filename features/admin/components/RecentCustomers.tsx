"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, User } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function RecentCustomers({ data = [] }: { data?: any[] }) {
  return (
    <Card className="border-none bg-card text-card-foreground shadow-sm rounded-2xl h-full">
      <div className="flex items-center justify-between p-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Customers</h3>
        <button className="text-muted-foreground/80 hover:text-muted-foreground transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
      <CardContent className="px-6 pb-6 pt-0">
        <div className="space-y-6">
          {data.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">No recent customers</div>
          ) : data.map((customer) => (
            <div key={customer.user_id} className="flex items-center gap-4">
              <Avatar className="h-10 w-10 border-2 border-border">
                <AvatarImage src={customer.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${customer.user_id}`} />
                <AvatarFallback className="bg-muted text-muted-foreground"><User className="h-4 w-4"/></AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground/90 leading-none mb-1.5">{customer.full_name || 'Guest'}</span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="max-w-[80px] truncate" title={customer.user_id}>ID {customer.user_id.slice(0,6)}...</span>
                  <span className={
                    customer.latest_order_status === "completed" || customer.latest_order_status === "delivered" 
                      ? "text-emerald-500" 
                      : customer.latest_order_status === "cancelled" || customer.latest_order_status === "failed" 
                        ? "text-red-500" 
                        : "text-amber-500"
                  }>
                    {customer.latest_order_status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
