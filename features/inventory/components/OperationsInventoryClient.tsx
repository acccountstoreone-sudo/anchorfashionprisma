"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter } from "lucide-react";

export function OperationsInventoryClient({
  inventory,
}: {
  inventory: any[];
}) {
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState(false);

  // Search logic
  const filteredInventory = inventory.filter((item) => {
    const skuMatch = item.variants?.sku
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const productName = item.variants?.products?.name || item.variants?.name || "";
    const nameMatch = productName
      .toLowerCase()
      .includes(search.toLowerCase());
    
    // Simple filter toggle just to show it works
    const filterMatch = filterActive ? item.quantity_available <= (item.reorder_point || 0) : true;
    
    return (skuMatch || nameMatch) && filterMatch;
  });

  return (
    <>
      <div className="flex w-full gap-2 md:w-auto">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SKU or name..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button 
          variant={filterActive ? "default" : "outline"} 
          size="icon"
          onClick={() => setFilterActive(!filterActive)}
          title="Filter Low Stock"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 rounded-md border w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU / Product</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Incoming</TableHead>
              <TableHead className="text-right">Damaged</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No items found.
                </TableCell>
              </TableRow>
            ) : (
              filteredInventory.map((item) => {
                const isOutOfStock = item.quantity_available <= 0;
                const isLowStock =
                  item.quantity_available > 0 &&
                  item.quantity_available <= (item.reorder_point || 0);
                const status = isOutOfStock
                  ? "Out of Stock"
                  : isLowStock
                    ? "Low Stock"
                    : "Healthy";

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">
                        {item.variants?.sku || "N/A"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.variants?.products?.name || (item.variants?.attributes ? Object.values(item.variants.attributes)[0] as string : null) || "Standard"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.quantity_available}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.quantity_reserved}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {item.quantity_incoming}
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      {item.quantity_damaged}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          status === "Healthy"
                            ? "default"
                            : status === "Low Stock"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
