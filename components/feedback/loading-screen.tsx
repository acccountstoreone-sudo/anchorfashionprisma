import * as React from "react";
import { Loader2 } from "lucide-react";

export function LoadingScreen({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p>{message}</p>
    </div>
  );
}
