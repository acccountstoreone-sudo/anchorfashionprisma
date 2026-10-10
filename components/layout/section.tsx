import * as React from "react";
import { cn } from "@/lib/utils";
export function Section({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("py-12 md:py-16 lg:py-24", className)} {...props} />
  );
}
