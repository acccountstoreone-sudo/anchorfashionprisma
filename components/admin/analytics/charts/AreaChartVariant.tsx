"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface AreaChartVariantProps {
  data: any[];
  xDataKey: string;
  yDataKey: string;
  color?: string;
  height?: number;
  valueFormatter?: "currency" | "number" | "none";
}

export function AreaChartVariant({
  data,
  xDataKey,
  yDataKey,
  color = "#2563eb",
  height = 350,
  valueFormatter = "none",
}: AreaChartVariantProps) {
  const formatValue = (value: number) => {
    if (valueFormatter === "currency") return formatCurrency(value);
    if (valueFormatter === "number") return formatNumber(value);
    return value.toString();
  };

  return (
    <div style={{ height: `${height}px`, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Area
            type="monotone"
            dataKey={yDataKey}
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
