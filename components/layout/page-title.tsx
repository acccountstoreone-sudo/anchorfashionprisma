import * as React from "react";
import { cn } from "@/lib/utils";

export function PageTitle({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-1", className)}>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}
