"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, Settings, Check, X, Loader2, Pencil, Trash2 } from "lucide-react";
import {
  fetchRolesAction,
  toggleRolePermissionAction,
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
} from "@/app/actions/admin/roles.actions";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/features/admin/components/shared/ConfirmDialog";

const roleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(4, "Description is required"),
});
type RoleForm = z.infer<typeof roleSchema>;

export interface RoleItem {
  id: string;
  name: string;
  description: string;
  usersCount: number;
  permissions: Record<string, boolean>;
}

export interface PermissionItem {
  id: string;
  name: string;
  action: string;
  description?: string;
  module: string;
}

export default function PermissionsPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create role dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Edit role dialog
  const [editRole, setEditRole] = useState<RoleItem | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [deleteRole, setDeleteRole] = useState<RoleItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const createForm = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "" },
  });

  const editForm = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "" },
  });

  const loadData = async () => {
    setLoading(true);
    const res = await fetchRolesAction();
    if (res.success) {
      setRoles(res.data || []);
      setPermissions(res.allPermissions || []);
    } else {
      toast.error(res.error || "Failed to load roles");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // When editRole changes, populate the form
  useEffect(() => {
    if (editRole) {
      editForm.reset({ name: editRole.name, description: editRole.description });
    }
  }, [editRole]);

  const togglePermission = async (
    roleId: string,
    permissionId: string,
    currentStatus: boolean
  ) => {
    const res = await toggleRolePermissionAction(roleId, permissionId, !currentStatus);
    if (res.success) {
      toast.success("Permission updated");
      loadData();
    } else {
      toast.error(res.error || "Action failed");
    }
  };

  const handleCreate = async (values: RoleForm) => {
    setCreateLoading(true);
    const res = await createRoleAction(values);
    setCreateLoading(false);
    if (res.success) {
      toast.success(`Role "${values.name}" created`);
      setCreateOpen(false);
      createForm.reset();
      loadData();
    } else {
      toast.error(res.error || "Failed to create role");
    }
  };

  const handleEdit = async (values: RoleForm) => {
    if (!editRole) return;
    setEditLoading(true);
    const res = await updateRoleAction(editRole.id, values);
    setEditLoading(false);
    if (res.success) {
      toast.success("Role updated");
      setEditRole(null);
      loadData();
    } else {
      toast.error(res.error || "Failed to update role");
    }
  };

  const handleDelete = async () => {
    if (!deleteRole) return;
    setDeleteLoading(true);
    const res = await deleteRoleAction(deleteRole.id);
    setDeleteLoading(false);
    if (res.success) {
      toast.success(`Role "${deleteRole.name}" deleted`);
      setDeleteRole(null);
      loadData();
    } else {
      toast.error(res.error || "Failed to delete role");
      setDeleteRole(null);
    }
  };

  return (
    <div className="space-y-6 p-8 pt-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">
            Securely define access control policies and manage role permissions.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Shield className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role-Based Access Control</CardTitle>
          <CardDescription>
            Live database overview of roles and their granular access permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Role</TableHead>
                  {permissions.map((p) => (
                    <TableHead
                      key={p.id}
                      className="text-center whitespace-nowrap px-4"
                      title={p.description}
                    >
                      {p.action.replace(/_/g, " ")}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={permissions.length + 2}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading secure role data...
                    </TableCell>
                  </TableRow>
                ) : roles.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={permissions.length + 2}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No roles found.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="font-medium">{role.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {role.usersCount} user{role.usersCount !== 1 ? "s" : ""} assigned
                        </div>
                      </TableCell>
                      {permissions.map((p) => {
                        const hasPerm = !!role.permissions[p.action];
                        return (
                          <TableCell key={p.id} className="text-center">
                            <button
                              onClick={() => togglePermission(role.id, p.id, hasPerm)}
                              className="rounded-full p-2 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                              title={`Toggle ${p.action} for ${role.name}`}
                            >
                              {hasPerm ? (
                                <Check className="mx-auto h-4 w-4 text-emerald-500" />
                              ) : (
                                <X className="mx-auto h-4 w-4 text-muted-foreground/30" />
                              )}
                            </button>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none ml-auto">
                            <Settings className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => setEditRole(role)}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteRole(role)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Add a new role to the access control system.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. WAREHOUSE_MANAGER" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea className="resize-none" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setCreateOpen(false); createForm.reset(); }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createLoading}>
                  {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Role
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editRole} onOpenChange={(o) => !o && setEditRole(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update the role name and description.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea className="resize-none" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditRole(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteRole}
        title={`Delete "${deleteRole?.name}"?`}
        description="This will permanently delete the role and all its permissions. Users currently assigned to this role will lose their permissions."
        confirmLabel="Delete Role"
        variant="destructive"
        isLoading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteRole(null)}
      />
    </div>
  );
}
