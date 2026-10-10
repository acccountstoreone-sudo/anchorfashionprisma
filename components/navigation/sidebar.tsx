import * as React from "react";
import { cn } from "@/lib/utils";

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex",
        className
      )}
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <span className="text-lg font-bold tracking-tight">Anchor Fashion</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {/* Navigation items go here */}
        <div className="rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-foreground">
          Dashboard
        </div>
      </nav>
    </aside>
  );
}
