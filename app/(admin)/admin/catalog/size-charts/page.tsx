"use client";

import { Button } from "@/components/ui/button";

export default function AdminSizeChartsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Size Charts</h1>
          <p className="text-muted-foreground">
            Manage global, category-specific, and product-specific size guides.
          </p>
        </div>
        <Button>Create Size Chart</Button>
      </div>

      <div className="border rounded-lg bg-card text-card-foreground p-8 text-center text-muted-foreground">
        <p>Size chart management interface is under construction.</p>
        <p className="text-sm mt-2">
          Currently, size charts must be populated directly into the database or via the API.
        </p>
      </div>
    </div>
  );
}
