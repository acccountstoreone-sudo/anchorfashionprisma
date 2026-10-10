import { useSessionContext } from "@/providers/session-provider";

export function useSession() {
  const context = useSessionContext();

  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
}
