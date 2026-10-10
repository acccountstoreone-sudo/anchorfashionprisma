"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Trash2, ArrowRight, FolderOpen } from "lucide-react";
import { CustomReportConfig } from "@/types/report.types";
import {
  getSavedReportsAction,
  deleteReportAction,
} from "@/actions/report.actions";
import { toast } from "sonner";

interface SavedReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectReport: (report: CustomReportConfig) => void;
}

export function SavedReportsModal({
  open,
  onOpenChange,
  onSelectReport,
}: SavedReportsModalProps) {
  const [reports, setReports] = useState<CustomReportConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await getSavedReportsAction();
      if (res.success && res.data) {
        setReports(res.data);
      } else {
        toast.error(res.error || "Failed to load saved reports");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch saved reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchReports();
    }
  }, [open]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await deleteReportAction(id);
      if (!res.success) {
        toast.error(res.error || "Failed to delete saved report");
        return;
      }
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Saved report removed");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Saved Enterprise Reports
          </DialogTitle>
          <DialogDescription>
            Load previously designed configurations to re-execute, preview, or export.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-3 min-h-[250px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm font-medium">Retrieving saved reports from database...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="font-semibold text-foreground">No saved reports found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Design a custom query in the builder and click &quot;Save Report&quot; to bookmark it for your team.
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                onClick={() => {
                  onSelectReport(report);
                  onOpenChange(false);
                }}
                className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer"
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      {report.report_name}
                    </span>
                    {report.is_public && (
                      <Badge variant="outline" className="text-[10px] py-0">
                        Public
                      </Badge>
                    )}
                  </div>
                  {report.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {report.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Dims:
                    </span>
                    {report.dimensions.map((d) => (
                      <Badge
                        key={d}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 capitalize"
                      >
                        {d}
                      </Badge>
                    ))}
                    <span className="text-[11px] text-muted-foreground font-medium ml-1">
                      Metrics:
                    </span>
                    {report.metrics.map((m) => (
                      <Badge
                        key={m}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 capitalize bg-slate-50 dark:bg-slate-900"
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    disabled={deletingId === report.id}
                    onClick={(e) => handleDelete(report.id, e)}
                  >
                    {deletingId === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1">
                    Load
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
