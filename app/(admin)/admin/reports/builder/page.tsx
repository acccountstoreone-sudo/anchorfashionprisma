"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { exportToCsv, exportToPdf } from "@/lib/analytics/export-utils";
import {
  Download,
  Save,
  Play,
  Loader2,
  FolderOpen,
  AlertCircle,
  BarChart2,
  RefreshCw,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  ReportDimension,
  ReportMetric,
  ReportDateRange,
  CustomReportConfig,
} from "@/types/report.types";
import {
  saveReportAction,
  runReportQueryAction,
} from "@/actions/report.actions";
import { SavedReportsModal } from "@/features/reports/components/SavedReportsModal";

const DIMENSIONS: { id: ReportDimension; label: string }[] = [
  { id: "date", label: "Date" },
  { id: "category", label: "Category" },
  { id: "brand", label: "Brand" },
  { id: "region", label: "Region" },
  { id: "device", label: "Device" },
];

const METRICS: { id: ReportMetric; label: string; isCurrency?: boolean }[] = [
  { id: "sales", label: "Sales Revenue", isCurrency: true },
  { id: "orders", label: "Orders Count" },
  { id: "units", label: "Units Sold" },
  { id: "refunds", label: "Refunds", isCurrency: true },
  { id: "profit", label: "Gross Profit", isCurrency: true },
];

export default function ReportBuilderPage() {
  const [reportId, setReportId] = useState<string | undefined>(undefined);
  const [reportName, setReportName] = useState("Enterprise Sales & Margin");
  const [description, setDescription] = useState("");
  const [dimensions, setDimensions] = useState<ReportDimension[]>(["date", "category"]);
  const [metrics, setMetrics] = useState<ReportMetric[]>(["sales", "orders", "profit"]);
  const [dateRange, setDateRange] = useState<ReportDateRange>("30d");

  // Query and execution state
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Toggle dimensions
  const toggleDimension = (dim: ReportDimension) => {
    setDimensions((prev) => {
      if (prev.includes(dim)) {
        if (prev.length <= 1) {
          toast.warning("At least one dimension is required");
          return prev;
        }
        return prev.filter((d) => d !== dim);
      }
      return [...prev, dim];
    });
  };

  // Toggle metrics
  const toggleMetric = (met: ReportMetric) => {
    setMetrics((prev) => {
      if (prev.includes(met)) {
        if (prev.length <= 1) {
          toast.warning("At least one metric is required");
          return prev;
        }
        return prev.filter((m) => m !== met);
      }
      return [...prev, met];
    });
  };

  // Run Query
  const handleRunQuery = useCallback(async () => {
    if (dimensions.length === 0) {
      toast.error("Please select at least one dimension");
      return;
    }
    if (metrics.length === 0) {
      toast.error("Please select at least one metric");
      return;
    }

    setIsRunning(true);
    setErrorMsg(null);
    try {
      const res = await runReportQueryAction({
        dimensions,
        metrics,
        dateRange,
        limit: 100,
      });

      if (!res.success || !res.data) {
        setErrorMsg(res.error || "Failed to execute database query");
        toast.error(res.error || "Query failed");
        setPreviewData([]);
        setSummary({});
        return;
      }

      setPreviewData(res.data.data);
      setSummary(res.data.summary);
      toast.success(`Query returned ${res.data.totalRows} aggregated record(s)`);
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred running query";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  }, [dimensions, metrics, dateRange]);

  // Run automatically on first mount
  useEffect(() => {
    handleRunQuery();
  }, []);

  // Export CSV
  const handleExport = () => {
    const filename = reportName.trim()
      ? `${reportName.replace(/\s+/g, "_").toLowerCase()}.csv`
      : "custom_report.csv";

    if (previewData.length === 0) {
      toast.error("No data available to export. Run a query first.");
      return;
    }

    exportToCsv(previewData, filename);
    toast.success(`Exported ${previewData.length} row(s) to ${filename}`);
  };

  // Export PDF
  const handleExportPdf = () => {
    if (previewData.length === 0) {
      toast.error("No data available to export. Run a query first.");
      return;
    }

    try {
      setIsExportingPdf(true);
      const filename = reportName.trim()
        ? `${reportName.replace(/\s+/g, "_").toLowerCase()}_report.pdf`
        : "custom_report.pdf";

      exportToPdf({
        reportName,
        description,
        dimensions,
        metrics: metrics.map((m) => {
          const def = METRICS.find((d) => d.id === m);
          return {
            id: m,
            label: def?.label || m,
            isCurrency: def?.isCurrency,
          };
        }),
        dateRange,
        data: previewData,
        summary,
        filename,
      });

      toast.success(`Exported PDF: ${filename}`);
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error(err?.message || "Failed to generate PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Save Report Configuration
  const handleSave = async () => {
    if (!reportName.trim()) {
      toast.error("Please enter a report name to save");
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveReportAction({
        id: reportId,
        report_name: reportName,
        description,
        dimensions,
        metrics,
        filters: { dateRange },
        chart_type: "table",
        is_public: false,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to save report configuration");
        return;
      }

      setReportId(res.data.id);
      toast.success(`Report "${res.data.report_name}" saved to database!`);
    } catch (err: any) {
      toast.error(err.message || "An error occurred saving report");
    } finally {
      setIsSaving(false);
    }
  };

  // Load a saved report
  const handleLoadReport = (saved: CustomReportConfig) => {
    setReportId(saved.id);
    setReportName(saved.report_name);
    setDescription(saved.description || "");
    if (saved.dimensions && saved.dimensions.length > 0) {
      setDimensions(saved.dimensions as ReportDimension[]);
    }
    if (saved.metrics && saved.metrics.length > 0) {
      setMetrics(saved.metrics as ReportMetric[]);
    }
    if (saved.filters?.dateRange) {
      setDateRange(saved.filters.dateRange as ReportDateRange);
    }

    toast.info(`Loaded report "${saved.report_name}". Running query...`);
    // Re-run with loaded settings
    runReportQueryAction({
      dimensions: saved.dimensions as ReportDimension[],
      metrics: saved.metrics as ReportMetric[],
      dateRange: (saved.filters?.dateRange as ReportDateRange) || "30d",
      limit: 100,
    }).then((res) => {
      if (res.success && res.data) {
        setPreviewData(res.data.data);
        setSummary(res.data.summary);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Report Builder</h1>
          <p className="text-muted-foreground mt-1">
            Design, preview, and export multi-dimensional enterprise analytics queries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2"
          >
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            Saved Reports
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Configuration Panel */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Query Configuration</CardTitle>
            <CardDescription>
              Select dimensions (grouping) and enterprise metrics (columns).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Report Name & Description */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reportName">
                  Report Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reportName"
                  placeholder="e.g., Weekly Category Sales"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reportDesc">Description (Optional)</Label>
                <Input
                  id="reportDesc"
                  placeholder="e.g., Cross-channel gross margin breakdown"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Dimensions (Rows / Grouping)</h4>
                <span className="text-xs text-muted-foreground">
                  {dimensions.length} selected
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {DIMENSIONS.map((dim) => (
                  <div
                    key={dim.id}
                    className="flex items-center space-x-2 rounded-md border p-2 hover:bg-muted/40 transition-colors"
                  >
                    <Checkbox
                      id={`dim-${dim.id}`}
                      checked={dimensions.includes(dim.id)}
                      onCheckedChange={() => toggleDimension(dim.id)}
                    />
                    <Label
                      htmlFor={`dim-${dim.id}`}
                      className="cursor-pointer text-sm font-normal flex-1"
                    >
                      {dim.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Metrics (Aggregations)</h4>
                <span className="text-xs text-muted-foreground">
                  {metrics.length} selected
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {METRICS.map((met) => (
                  <div
                    key={met.id}
                    className="flex items-center justify-between rounded-md border p-2.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`met-${met.id}`}
                        checked={metrics.includes(met.id)}
                        onCheckedChange={() => toggleMetric(met.id)}
                      />
                      <Label
                        htmlFor={`met-${met.id}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {met.label}
                      </Label>
                    </div>
                    {met.isCurrency && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Currency
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Date Range</h4>
              <Select
                value={dateRange}
                onValueChange={(val) => setDateRange((val as ReportDateRange) ?? "30d")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions in Config Panel */}
            <div className="pt-2">
              <Button
                onClick={handleRunQuery}
                disabled={isRunning}
                className="w-full flex items-center justify-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executing Query...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Run Query
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className="flex flex-col md:col-span-8">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Data Preview</CardTitle>
                {previewData.length > 0 && (
                  <Badge variant="secondary" className="font-normal text-xs">
                    {previewData.length} rows returned
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                Real database aggregates derived from live sales and data marts.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunQuery}
                disabled={isRunning}
                title="Refresh preview query"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isRunning ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save Report
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={previewData.length === 0}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Export CSV
              </Button>

              <Button
                size="sm"
                onClick={handleExportPdf}
                disabled={previewData.length === 0 || isExportingPdf}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {isExportingPdf ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-1.5 h-4 w-4" />
                )}
                Export PDF
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 space-y-4">
            {/* Error state */}
            {errorMsg && (
              <div className="flex items-center gap-3 p-3 text-sm rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div className="flex-1">{errorMsg}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunQuery}
                  className="shrink-0 text-xs h-7"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Summary Metrics Bar */}
            {previewData.length > 0 && Object.keys(summary).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3 rounded-lg bg-muted/40 border">
                {metrics.map((m) => {
                  const metDef = METRICS.find((def) => def.id === m);
                  const val = summary[m] || 0;
                  return (
                    <div key={m} className="space-y-0.5">
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Total {metDef?.label || m}
                      </div>
                      <div className="text-base font-bold text-foreground">
                        {metDef?.isCurrency ? formatCurrency(val) : val.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Preview Table */}
            <div className="rounded-md border overflow-x-auto min-h-[300px]">
              {isRunning ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
                  <p className="text-sm font-medium">Running safe server-side query...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aggregating requested dimensions across enterprise facts
                  </p>
                </div>
              ) : previewData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <BarChart2 className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="font-semibold text-foreground">No data found</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    No records match the selected dimensions and date range ({dateRange}).
                    Try expanding the date range or selecting other dimensions.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={handleRunQuery}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Re-run Query
                  </Button>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted text-muted-foreground">
                    <tr>
                      {dimensions.map((d) => (
                        <th key={d} className="px-4 py-3 font-semibold capitalize whitespace-nowrap">
                          {d}
                        </th>
                      ))}
                      {metrics.map((m) => {
                        const isCur = METRICS.find((def) => def.id === m)?.isCurrency;
                        return (
                          <th
                            key={m}
                            className="px-4 py-3 font-semibold capitalize whitespace-nowrap text-right"
                          >
                            {m} {isCur && "($)"}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.map((row, i) => (
                      <tr
                        key={i}
                        className="transition-colors hover:bg-muted/50 font-normal"
                      >
                        {dimensions.map((d) => (
                          <td key={d} className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                            {row[d] !== undefined && row[d] !== null
                              ? String(row[d])
                              : "-"}
                          </td>
                        ))}
                        {metrics.map((m) => {
                          const isCur = METRICS.find((def) => def.id === m)?.isCurrency;
                          const val = row[m];
                          return (
                            <td key={m} className="px-4 py-3 text-right whitespace-nowrap">
                              {isCur
                                ? formatCurrency(val || 0)
                                : (Number(val) || 0).toLocaleString()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Reports Modal */}
      <SavedReportsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSelectReport={handleLoadReport}
      />
    </div>
  );
}
