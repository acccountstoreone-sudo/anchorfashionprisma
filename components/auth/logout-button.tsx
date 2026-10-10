"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/use-cart-store";

interface LogoutButtonProps {
  className?: string;
  hideText?: boolean;
}

export function LogoutButton({ className, hideText }: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = createClient();

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // Clear client-side cart store immediately
      useCartStore.setState({ cart: null, error: null });

      // Sign out from Supabase auth session
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Failed to log out. Please try again.");
        setIsLoggingOut(false);
        return;
      }

      // Clear local storage and stale guest cookies safely
      try {
        localStorage.removeItem("anchor_user_password");
        document.cookie = "af_guest_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } catch {}

      toast.success("Logged out successfully.");

      // Direct full-page navigation cleanly flushes all client caches and session cookies
      window.location.href = "/auth/login";
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "/auth/login";
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      title={hideText ? "Log out" : undefined}
      className={cn(
        "flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50",
        !hideText && "space-x-3",
        className
      )}
    >
      {isLoggingOut ? (
        <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
      ) : (
        <LogOut className="h-5 w-5 flex-shrink-0" />
      )}
      {!hideText && <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>}
    </button>
  );
}
