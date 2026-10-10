"use client";

import {
  createContext,
  useContext,
  ReactNode,
} from "react";
import { authClient } from "@/lib/auth/client";
import { Role } from "@/lib/rbac/matrix";

// Better Auth user type
type User = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  [key: string]: any;
};

interface SessionContextType {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  role: null,
  isLoading: true,
});

export function SessionProvider({
  children,
  initialUser = null,
  initialRole = null,
}: {
  children: ReactNode;
  initialUser?: User | null;
  initialRole?: Role | null;
}) {
  const { data, isPending } = authClient.useSession();
  
  const user = data?.user || initialUser;
  // Determine role based on your application's logic (e.g., from user metadata or database)
  const role = (user?.role as Role) || initialRole || "Customer";
  const isLoading = isPending && !initialUser;

  return (
    <SessionContext.Provider value={{ user, role, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSessionContext = () => useContext(SessionContext);
