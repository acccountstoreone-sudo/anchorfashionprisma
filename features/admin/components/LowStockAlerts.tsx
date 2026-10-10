"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertOctagon } from "lucide-react";

const lowStockItems = [
  {
    id: 1,
    name: "Navy Blue Suit",
    sku: "SUIT-NAVY-M",
    stock: 3,
    threshold: 10,
  },
  { id: 2, name: "Silk Tie", sku: "TIE-SILK-RED", stock: 1, threshold: 5 },
  {
    id: 3,
    name: "Leather Oxford Shoes",
    sku: "SHOE-OXF-BLK-10",
    stock: 0,
    threshold: 5,
  },
  {
    id: 4,
    name: "White Dress Shirt",
    sku: "SHIRT-WHT-L",
    stock: 4,
    threshold: 15,
  },
];

export function LowStockAlerts() {
  return (
    <Card className="border-t-4 border-border/60 border-t-amber-500 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertOctagon className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base font-semibold text-slate-900">
            Low Stock Alerts
          </CardTitle>
        </div>
        <CardDescription>Items that need to be restocked soon.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {lowStockItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
              </div>
              <div className="text-right">
                {item.stock === 0 ? (
                  <Badge
                    variant="outline"
                    className="border-red-200 bg-red-50 text-red-700"
                  >
                    Out of Stock
                  </Badge>
                ) : (
                  <div className="text-sm font-medium text-amber-600">
                    {item.stock} left
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
