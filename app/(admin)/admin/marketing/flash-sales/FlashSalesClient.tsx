"use client";

import React, { useState } from "react";
import { FlashSaleRecord } from "@/lib/services/marketing/flash-sale.service";

interface Props {
  initialFlashSales: FlashSaleRecord[];
}

export function FlashSalesClient({ initialFlashSales }: Props) {
  const [sales, setSales] = useState<FlashSaleRecord[]>(initialFlashSales);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Flash Sales Management</h1>
        <button className="bg-black text-white px-4 py-2 rounded">
          + Create Flash Sale
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b">
              <th className="p-4 font-semibold text-zinc-600">Name</th>
              <th className="p-4 font-semibold text-zinc-600">Product ID</th>
              <th className="p-4 font-semibold text-zinc-600">Price</th>
              <th className="p-4 font-semibold text-zinc-600">Stock (Sold/Total)</th>
              <th className="p-4 font-semibold text-zinc-600">Status</th>
              <th className="p-4 font-semibold text-zinc-600">End Time</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const isActive = sale.is_active && new Date(sale.start_time) <= new Date() && new Date(sale.end_time) > new Date();
              return (
                <tr key={sale.id} className="border-b last:border-0 hover:bg-zinc-50">
                  <td className="p-4 font-medium">{sale.name}</td>
                  <td className="p-4 text-zinc-500 font-mono text-sm">{sale.product_id}</td>
                  <td className="p-4 font-bold text-red-600">৳{sale.flash_price}</td>
                  <td className="p-4">
                    {sale.stock_sold} / {sale.stock_allocated}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {isActive ? 'ACTIVE' : 'INACTIVE/ENDED'}
                    </span>
                  </td>
                  <td className="p-4 text-zinc-500">{new Date(sale.end_time).toLocaleString()}</td>
                </tr>
              );
            })}
            {sales.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500">
                  No flash sales found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
