import React from "react";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "CRM Dashboard | Anchor Fashion",
};

export default async function CRMDashboardPage() {
  const supabase = createAdminClient();
  
  // Fetch Segments
  const { data: segments } = await supabase
    .from("customer_segments")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">CRM Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active customer groups
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Customer Segments</CardTitle>
            <CardDescription>
              Manage your rule-based customer segments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {segments && segments.length > 0 ? (
              <div className="space-y-4">
                {segments.map((seg) => (
                  <div key={seg.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{seg.name}</p>
                      <p className="text-xs text-zinc-500">{seg.description}</p>
                    </div>
                    <div className="text-sm">
                      {seg.is_active ? (
                        <span className="text-green-600">Active</span>
                      ) : (
                        <span className="text-red-600">Inactive</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No segments created yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
