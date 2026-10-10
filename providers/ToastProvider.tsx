"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      richColors
      position="top-right"
      toastOptions={{
        className: "my-toast-class",
      }}
    />
  );
}
