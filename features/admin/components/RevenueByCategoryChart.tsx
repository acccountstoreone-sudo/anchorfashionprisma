"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#00A1FF", "#9333EA", "#F43F5E", "#F59E0B", "#10B981", "#6366F1"];

export function RevenueByCategoryChart({ data = [] }: { data?: any[] }) {
  const chartData = data.slice(0, 5).map((item, index) => ({
    name: item.category_name || "Unknown",
    value: Number(item.total_revenue),
    color: COLORS[index % COLORS.length]
  }));

  const topCategory = chartData.length > 0 ? chartData[0] : { name: "No Data", value: 0 };

  return (
    <Card className="border-none bg-card text-card-foreground shadow-sm rounded-2xl h-full flex flex-col">
      <div className="flex items-center justify-between p-6">
        <h3 className="text-lg font-semibold text-foreground">Revenue By Category</h3>
        <button className="text-muted-foreground/80 hover:text-muted-foreground transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
      <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col justify-between">
        <div className="relative h-[200px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: '1px solid hsl(var(--border))', 
                  backgroundColor: 'hsl(var(--card))', 
                  color: 'hsl(var(--card-foreground))',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                }} 
                formatter={(value) => `৳${value}`}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold text-foreground leading-none mb-1">{topCategory.name}</span>
            <span className="text-sm font-medium text-muted-foreground">৳{topCategory.value}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
