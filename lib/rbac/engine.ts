import { Role, Resource, Action, ROLE_PERMISSIONS } from "./matrix";

export interface UserRole {
  role: Role;
  customPermissions?: {
    resource: Resource;
    actions: Action[];
  }[];
}

/**
 * Validates if a specific role has permission to perform an action on a resource.
 */
export function hasPermission(
  userRole: UserRole,
  resource: Resource,
  action: Action
): boolean {
  if (userRole.role === "Main Admin") return true;

  // Check custom permissions first if they exist
  if (userRole.role === "Custom" && userRole.customPermissions) {
    return checkPermissionsList(userRole.customPermissions, resource, action);
  }

  const rolePermissions = ROLE_PERMISSIONS[userRole.role];
  if (!rolePermissions) return false;

  return checkPermissionsList(rolePermissions, resource, action);
}

function checkPermissionsList(
  permissions: { resource: Resource; actions: Action[] }[],
  resource: Resource,
  action: Action
): boolean {
  const resourcePermission = permissions.find((p) => p.resource === resource);
  if (!resourcePermission) return false;

  if (resourcePermission.actions.includes("Manage")) return true;
  return resourcePermission.actions.includes(action);
}
