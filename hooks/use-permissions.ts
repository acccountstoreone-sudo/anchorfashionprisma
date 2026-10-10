import { useSession } from "./use-session";
import { hasPermission } from "@/lib/rbac/engine";
import { Resource, Action } from "@/lib/rbac/matrix";

export function usePermissions() {
  const { role, user, isLoading } = useSession();

  const checkPermission = (resource: Resource, action: Action) => {
    if (!role) return false;
    return hasPermission({ role }, resource, action);
  };

  return {
    checkPermission,
    role,
    user,
    isLoading,
    isMainAdmin: role === "Main Admin",
    isExecutive: role === "Executive",
  };
}
