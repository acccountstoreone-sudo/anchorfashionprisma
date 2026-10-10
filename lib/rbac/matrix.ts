export type Role =
  | "Customer"
  | "Support"
  | "Marketing"
  | "Inventory Manager"
  | "Warehouse Manager"
  | "Operations Manager"
  | "Branch Manager"
  | "Finance Manager"
  | "Main Admin"
  | "Executive"
  | "Custom";

export type Resource =
  | "Users"
  | "Roles"
  | "Orders"
  | "Products"
  | "Inventory"
  | "Marketing"
  | "Reports"
  | "AI"
  | "CMS"
  | "Settings"
  | "Notifications";

export type Action =
  | "Read"
  | "Create"
  | "Update"
  | "Delete"
  | "Approve"
  | "Export"
  | "Import"
  | "Manage";

export interface Permission {
  resource: Resource;
  actions: Action[];
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Customer: [
    { resource: "Orders", actions: ["Read", "Create"] },
    { resource: "Settings", actions: ["Read", "Update"] },
  ],
  Support: [
    { resource: "Users", actions: ["Read", "Update"] },
    { resource: "Orders", actions: ["Read", "Update", "Approve"] },
    { resource: "Products", actions: ["Read"] },
  ],
  Marketing: [
    { resource: "Marketing", actions: ["Manage"] },
    { resource: "CMS", actions: ["Manage"] },
    { resource: "Products", actions: ["Read"] },
    { resource: "Reports", actions: ["Read"] },
  ],
  "Inventory Manager": [
    { resource: "Products", actions: ["Manage"] },
    { resource: "Inventory", actions: ["Manage"] },
    { resource: "Reports", actions: ["Read"] },
  ],
  "Warehouse Manager": [
    { resource: "Orders", actions: ["Read", "Update", "Approve"] },
    { resource: "Inventory", actions: ["Read", "Update"] },
  ],
  "Operations Manager": [
    { resource: "Orders", actions: ["Manage"] },
    { resource: "Inventory", actions: ["Manage"] },
    { resource: "Products", actions: ["Manage"] },
    { resource: "Reports", actions: ["Read", "Export"] },
  ],
  "Branch Manager": [
    { resource: "Orders", actions: ["Read", "Update"] },
    { resource: "Inventory", actions: ["Read", "Update"] },
    { resource: "Users", actions: ["Read"] },
  ],
  "Finance Manager": [
    { resource: "Orders", actions: ["Read"] },
    { resource: "Reports", actions: ["Manage", "Export"] },
  ],
  "Main Admin": [
    { resource: "Users", actions: ["Manage"] },
    { resource: "Roles", actions: ["Manage"] },
    { resource: "Orders", actions: ["Manage"] },
    { resource: "Products", actions: ["Manage"] },
    { resource: "Inventory", actions: ["Manage"] },
    { resource: "Marketing", actions: ["Manage"] },
    { resource: "Reports", actions: ["Manage"] },
    { resource: "AI", actions: ["Manage"] },
    { resource: "CMS", actions: ["Manage"] },
    { resource: "Settings", actions: ["Manage"] },
    { resource: "Notifications", actions: ["Manage"] },
  ],
  Executive: [
    { resource: "Users", actions: ["Read"] },
    { resource: "Roles", actions: ["Read"] },
    { resource: "Orders", actions: ["Read"] },
    { resource: "Products", actions: ["Read"] },
    { resource: "Inventory", actions: ["Read"] },
    { resource: "Marketing", actions: ["Read"] },
    { resource: "Reports", actions: ["Read"] },
    { resource: "AI", actions: ["Read"] },
    { resource: "CMS", actions: ["Read"] },
    { resource: "Settings", actions: ["Read"] },
    { resource: "Notifications", actions: ["Read"] },
  ],
  Custom: [],
};
