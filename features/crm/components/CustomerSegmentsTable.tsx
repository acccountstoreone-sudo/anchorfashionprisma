import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Users } from "lucide-react";

interface SegmentStat {
  stage: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
}

interface CustomerSegmentsTableProps {
  segments?: SegmentStat[];
}

const STAGE_CONFIG: Record<
  string,
  { label: string; badgeClass: string; barColor: string; description: string }
> = {
  prospect: {
    label: "Prospect",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    barColor: "bg-sky-600",
    description: "Visited or registered, no completed purchase yet",
  },
  first_time_buyer: {
    label: "First Time Buyer",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    barColor: "bg-emerald-600",
    description: "Completed their first order",
  },
  repeat_customer: {
    label: "Repeat Customer",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    barColor: "bg-indigo-600",
    description: "Placed 2-4 orders successfully",
  },
  loyal: {
    label: "Loyal",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    barColor: "bg-amber-600",
    description: "High frequency orders and VIP engagement",
  },
  at_risk: {
    label: "At Risk",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    barColor: "bg-orange-500",
    description: "Inactive for more than 60 days",
  },
  churned: {
    label: "Churned",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    barColor: "bg-rose-500",
    description: "No interactions or orders for 120+ days",
  },
};

export const CustomerSegmentsTable = ({
  segments = [],
}: CustomerSegmentsTableProps) => {
  const totalCount = segments.reduce((acc, s) => acc + (s.count || 0), 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
              <TableHead className="py-3 px-4 text-left">Lifecycle Stage</TableHead>
              <TableHead className="py-3 px-4 text-right">Total Customers</TableHead>
              <TableHead className="py-3 px-4 text-right">% of Total</TableHead>
              <TableHead className="py-3 px-4 text-center w-32">Trend</TableHead>
            </tr>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
            {segments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-slate-500 text-sm"
                >
                  No customer segment data available.
                </TableCell>
              </TableRow>
            ) : (
              segments.map((segment) => {
                const key = segment.stage.toLowerCase().replace(/\s+/g, "_");
                const config = STAGE_CONFIG[key] || {
                  label: segment.stage.replace(/_/g, " "),
                  badgeClass: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
                  barColor: "bg-primary",
                  description: "Customer segment group",
                };

                return (
                  <TableRow
                    key={segment.stage}
                    className="hover:bg-slate-50/60 transition-colors dark:hover:bg-slate-800/40"
                  >
                    <TableCell className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeClass}`}
                          >
                            {config.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {config.description}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>{segment.count.toLocaleString()}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${config.barColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, segment.percentage))}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-800 w-10 text-right dark:text-slate-200">
                          {segment.percentage}%
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-4 text-center">
                      <div className="flex justify-center">
                        {segment.trend === "up" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                            <TrendingUp className="h-3 w-3" /> Growing
                          </span>
                        )}
                        {segment.trend === "down" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                            <TrendingDown className="h-3 w-3" /> Shrinking
                          </span>
                        )}
                        {segment.trend === "stable" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            <Minus className="h-3 w-3" /> Stable
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
