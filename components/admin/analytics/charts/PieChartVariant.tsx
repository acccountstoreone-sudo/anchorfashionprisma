"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface PieChartVariantProps {
  data: any[];
  nameKey: string;
  dataKey: string;
  colors?: string[];
  height?: number;
  valueFormatter?: "currency" | "number" | "none";
}

const DEFAULT_COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];

export function PieChartVariant({
  data,
  nameKey,
  dataKey,
  colors = DEFAULT_COLORS,
  height = 350,
  valueFormatter = "none",
}: PieChartVariantProps) {
  const formatValue = (value: number) => {
    if (valueFormatter === "currency") return formatCurrency(value);
    if (valueFormatter === "number") return formatNumber(value);
    return value.toString();
  };

  return (
    <div style={{ height: `${height}px`, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow:
                "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value) => [formatValue(value as number), dataKey]}
            labelStyle={{
              color: "#374151",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: "12px", color: "#6b7280" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
