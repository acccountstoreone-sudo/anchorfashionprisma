import * as React from "react";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertMessageProps {
  type?: "success" | "warning" | "error" | "info";
  title: string;
  description?: string;
  className?: string;
}

export function AlertMessage({
  type = "info",
  title,
  description,
  className,
}: AlertMessageProps) {
  const iconMap = {
    success: <CheckCircle className="h-5 w-5 text-success" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />,
    error: <XCircle className="h-5 w-5 text-danger" />,
    info: <Info className="h-5 w-5 text-info" />,
  };

  const bgMap = {
    success: "bg-success/10 border-success/20 text-success-foreground",
    warning: "bg-warning/10 border-warning/20 text-warning-foreground",
    error: "bg-danger/10 border-danger/20 text-destructive",
    info: "bg-info/10 border-info/20 text-info-foreground",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        bgMap[type],
        className
      )}
    >
      {iconMap[type]}
      <div className="flex flex-col gap-1">
        <h5 className="font-medium leading-none tracking-tight">{title}</h5>
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
    </div>
  );
}
