"use client";

import { inter } from "@/lib/fonts";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            Critical Error
          </h2>
          <p className="mb-8 text-muted-foreground">
            A critical error occurred while loading the application.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
