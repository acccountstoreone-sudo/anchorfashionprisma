export type ReportDimension =
  | "date"
  | "category"
  | "brand"
  | "region"
  | "device";

export type ReportMetric =
  | "sales"
  | "orders"
  | "units"
  | "refunds"
  | "profit";

export type ReportDateRange = "7d" | "30d" | "90d" | "ytd" | "custom";

export interface CustomReportConfig {
  id: string;
  owner_id?: string;
  report_name: string;
  description?: string | null;
  dimensions: ReportDimension[];
  metrics: ReportMetric[];
  filters?: {
    dateRange?: ReportDateRange;
    startDate?: string;
    endDate?: string;
    category?: string;
    brand?: string;
    region?: string;
    [key: string]: any;
  };
  chart_type?: string;
  is_public?: boolean;
  schedule_cron?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReportQueryRequest {
  dimensions: ReportDimension[];
  metrics: ReportMetric[];
  dateRange: ReportDateRange;
  startDate?: string;
  endDate?: string;
  filters?: Record<string, any>;
  limit?: number;
}

export interface ReportQueryResult {
  columns: string[];
  data: Record<string, any>[];
  totalRows: number;
  summary: Record<string, number>;
  generatedAt: string;
}
