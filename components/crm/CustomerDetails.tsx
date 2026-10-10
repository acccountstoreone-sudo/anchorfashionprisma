"use client";

import { CRMCustomer } from "@/types/crm.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CustomerDetails({ customer }: { customer: CRMCustomer }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="block text-sm text-muted-foreground">
              Profile ID
            </span>
            <span className="font-medium">{customer.profile_id}</span>
          </div>
          <div>
            <span className="block text-sm text-muted-foreground">
              Health Score
            </span>
            <span className="font-medium">{customer.health_score}/100</span>
          </div>
          <div>
            <span className="block text-sm text-muted-foreground">
              Lifecycle Stage
            </span>
            <Badge
              variant={
                customer.customer_lifecycle_stage === "AT_RISK"
                  ? "destructive"
                  : "default"
              }
            >
              {customer.customer_lifecycle_stage}
            </Badge>
          </div>
          <div>
            <span className="block text-sm text-muted-foreground">
              Support Tickets
            </span>
            <span className="font-medium">
              {customer.total_support_tickets}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
