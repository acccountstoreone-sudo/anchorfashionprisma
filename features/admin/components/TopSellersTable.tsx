"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Package } from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";

export function TopSellersTable({ data = [] }: { data?: any[] }) {
  return (
    <Card className="border-none bg-card text-card-foreground shadow-sm rounded-2xl overflow-hidden h-full">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Top Sellers</h3>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="bg-muted/50/50 text-xs font-semibold text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Sold</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">No top sellers found</td></tr>
              ) : data.map((seller) => (
                <tr key={seller.product_id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 overflow-hidden rounded-md border border-border relative bg-muted/50 flex items-center justify-center">
                        {seller.image_url ? (
                          <Image src={seller.image_url} alt={seller.product_name} fill className="object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground/80" />
                        )}
                      </div>
                      <span className="font-medium text-foreground">{seller.product_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{seller.category_name}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{seller.sold}</td>
                  <td className="px-6 py-4">{formatCurrency(seller.price)}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(seller.earnings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-border text-sm text-muted-foreground text-center">
          Showing {data.length} entries
        </div>
      </CardContent>
    </Card>
  );
}
