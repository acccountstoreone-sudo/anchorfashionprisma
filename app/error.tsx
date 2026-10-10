"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h2 className="mb-4 text-2xl font-bold tracking-tight">
        Something went wrong!
      </h2>
      <p className="mb-6 text-muted-foreground">
        An unexpected error occurred. Our team has been notified.
      </p>
      {process.env.NODE_ENV !== "production" && error?.message && (
        <div className="mb-6 max-w-lg rounded-md border border-destructive/20 bg-destructive/10 p-4 text-left font-mono text-xs text-destructive">
          <p className="font-bold mb-1">Error: {error.message}</p>
          {error.digest && <p className="text-muted-foreground">Digest: {error.digest}</p>}
        </div>
      )}
      <button
        onClick={() => reset()}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
