import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/navigation/sidebar";
import { Header } from "@/components/layout/header";

export function DashboardLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex h-screen overflow-hidden bg-background", className)}
    >
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
