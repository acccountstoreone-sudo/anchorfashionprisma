import * as React from "react";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function Header({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Brand / Menu trigger here */}
      </div>
      <div className="flex items-center gap-4">
        <ThemeSwitcher />
      </div>
    </header>
  );
}
