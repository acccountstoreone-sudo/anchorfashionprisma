import { UsersTable } from "@/features/admin/components/UsersTable";
import { getUsersByRoleAction } from "@/actions/users.actions";
import { AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Admin Users | Anchor Fashion",
};

export default async function AdminUsersPage() {
  const { data: users, error, success } = await getUsersByRoleAction(["SUPERADMIN", "ADMIN"]);

  if (!success) {
    return (
      <div className="p-8 pt-6">
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <p>Error loading users: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pt-6">
      <UsersTable
        title="Admin Users"
        description="Manage users with full or restricted system administrative privileges."
        users={users || []}
        allowedRoles={["SUPERADMIN", "ADMIN"]}
        defaultRole="SUPERADMIN"
      />
    </div>
  );
}
