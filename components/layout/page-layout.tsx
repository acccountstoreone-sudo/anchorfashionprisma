import * as React from "react";
import { cn } from "@/lib/utils";
export function PageLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-background", className)}>
      {children}
    </div>
  );
}
