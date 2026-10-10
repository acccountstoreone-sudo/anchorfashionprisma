"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface BarChartVariantProps {
  data: any[];
  xDataKey: string;
  yDataKey: string;
  color?: string;
  height?: number;
  valueFormatter?: "currency" | "number" | "none";
}

export function BarChartVariant({
  data,
  xDataKey,
  yDataKey,
  color = "#2563eb",
  height = 350,
  valueFormatter = "none",
}: BarChartVariantProps) {
  const formatValue = (value: number) => {
    if (valueFormatter === "currency") return formatCurrency(value);
    if (valueFormatter === "number") return formatNumber(value);
    return value.toString();
  };

  return (
    <div style={{ height: `${height}px`, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e5e7eb"
          />
          <XAxis
            dataKey={xDataKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickFormatter={(value) => formatValue(value as number)}
            dx={-10}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.05)" }}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow:
                "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value) => [formatValue(value as number), yDataKey]}
            labelStyle={{
              color: "#374151",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          />
          <Bar
            dataKey={yDataKey}
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
