import * as React from "react";

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const toast = React.useCallback(({ ...props }: ToastProps) => {
    setToasts((prev) => [...prev, props]);
  }, []);

  return {
    toast,
    toasts,
  };
}
