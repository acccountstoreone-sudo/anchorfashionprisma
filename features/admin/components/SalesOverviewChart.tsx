"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function SalesOverviewChart({ data = [] }: { data?: any[] }) {
  // Use real data, mapping to expected recharts format
  // Assuming data comes in as { name: 'Mon', revenue: 100, orders: 10 }
  // We'll scale orders so it is visible next to revenue, or just plot them on separate axes if needed.
  // For simplicity, we just use revenue as pv and orders as uv for the visual.
  // In a real dashboard, orders count might need a separate Y-axis to be visible if revenue is in thousands.
  
  return (
    <Card className="border-none bg-card text-card-foreground shadow-sm rounded-2xl h-full flex flex-col">
      <div className="flex items-center justify-between p-6">
        <h3 className="text-lg font-semibold text-foreground">Sales Overview</h3>
        <button className="text-muted-foreground/80 hover:text-muted-foreground transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
      <CardContent className="px-6 pb-6 pt-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#94A3B8' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#94A3B8' }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted)/0.2)' }} 
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: '1px solid hsl(var(--border))', 
                  backgroundColor: 'hsl(var(--card))', 
                  color: 'hsl(var(--card-foreground))',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                }} 
              />
              <Bar dataKey="revenue" fill="#00A1FF" radius={[4, 4, 4, 4]} barSize={10} name="Revenue (৳)" />
              <Bar dataKey="orders" fill="#00A1FF" opacity={0.3} radius={[4, 4, 4, 4]} barSize={10} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
