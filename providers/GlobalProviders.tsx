"use client";

import { ThemeProvider } from "./ThemeProvider";
import { ReactQueryProvider } from "./ReactQueryProvider";
import { SessionProvider } from "./session-provider";
import { ToastProvider } from "./ToastProvider";

export function GlobalProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <ReactQueryProvider>
          {children}
          <ToastProvider />
        </ReactQueryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
