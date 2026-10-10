import { z } from "zod";

export const ReportDimensionEnum = z.enum([
  "date",
  "category",
  "brand",
  "region",
  "device",
]);

export const ReportMetricEnum = z.enum([
  "sales",
  "orders",
  "units",
  "refunds",
  "profit",
]);

export const ReportDateRangeEnum = z.enum([
  "7d",
  "30d",
  "90d",
  "ytd",
  "custom",
]);

export const CustomReportConfigSchema = z.object({
  id: z.string().uuid().optional(),
  report_name: z
    .string()
    .min(2, "Report name must be at least 2 characters")
    .max(255, "Report name is too long"),
  description: z.string().max(1000).optional().nullable(),
  dimensions: z
    .array(ReportDimensionEnum)
    .min(1, "Select at least one dimension (row)"),
  metrics: z
    .array(ReportMetricEnum)
    .min(1, "Select at least one metric (column)"),
  filters: z
    .object({
      dateRange: ReportDateRangeEnum.optional().default("7d"),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .optional(),
  chart_type: z.string().optional().default("table"),
  is_public: z.boolean().optional(),
});

export type CustomReportConfigInput = z.infer<typeof CustomReportConfigSchema>;

export const ReportQueryRequestSchema = z.object({
  dimensions: z
    .array(ReportDimensionEnum)
    .min(1, "At least one dimension is required"),
  metrics: z
    .array(ReportMetricEnum)
    .min(1, "At least one metric is required"),
  dateRange: ReportDateRangeEnum.default("7d"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  filters: z.record(z.any()).optional(),
  limit: z.number().int().positive().max(500).default(100),
});

export type ReportQueryRequestInput = z.infer<typeof ReportQueryRequestSchema>;
