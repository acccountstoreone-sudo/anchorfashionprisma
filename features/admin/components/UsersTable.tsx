"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { Label } from "@/components/ui/label";
import {
  Search,
  Filter,
  MoreHorizontal,
  UserCheck,
  UserX,
  Shield,
  Edit,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
} from "lucide-react";
import { AddUserDialog } from "./AddUserDialog";
import {
  toggleUserStatusAction,
  assignUserRoleAction,
  updateUserProfileAction,
  getAllAvailableRolesAction,
  updateUserPasswordAction,
} from "@/actions/users.actions";
import { toast } from "sonner";

export type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
  phone?: string | null;
};

interface UsersTableProps {
  title: string;
  description: string;
  users: UserData[];
  allowedRoles?: string[];
  defaultRole?: string;
}

export function UsersTable({
  title,
  description,
  users: initialUsers,
  allowedRoles,
  defaultRole,
}: UsersTableProps) {
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [availableRoles, setAvailableRoles] = useState<Array<{ id: string; name: string }>>([]);

  // Modals state
  const [viewUser, setViewUser] = useState<UserData | null>(null);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [roleUser, setRoleUser] = useState<UserData | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  // Password update modal state
  const [passwordUser, setPasswordUser] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    async function loadRoles() {
      const res = await getAllAvailableRolesAction();
      if (res.success && res.data) {
        setAvailableRoles(res.data);
      }
    }
    loadRoles();
  }, []);

  // Filtered users
  const searchQuery = (search || "").toLowerCase();
  const filteredUsers = (users || []).filter((u) => {
    const name = (u?.name || "").toLowerCase();
    const email = (u?.email || "").toLowerCase();
    const role = (u?.role || "").toLowerCase();
    return (
      name.includes(searchQuery) ||
      email.includes(searchQuery) ||
      role.includes(searchQuery)
    );
  });

  // Toggle status
  const handleToggleStatus = async (user: UserData) => {
    setActionLoading(user.id);
    const res = await toggleUserStatusAction(user.id, user.status);
    setActionLoading(null);

    if (res.success) {
      toast.success(`User marked as ${res.newStatus}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: res.newStatus || u.status } : u))
      );
    } else {
      toast.error(res.error || "Failed to change user status");
    }
  };

  // Open Edit modal
  const openEditModal = (user: UserData) => {
    setEditUser(user);
    const parts = (user?.name || "").split(" ");
    setEditFirstName(parts[0] || "");
    setEditLastName(parts.slice(1).join(" ") || "");
    setEditPhone(user?.phone || "");
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    setSavingEdit(true);
    const res = await updateUserProfileAction(editUser.id, {
      firstName: editFirstName,
      lastName: editLastName,
      phone: editPhone || undefined,
    });
    setSavingEdit(false);

    if (res.success) {
      toast.success("User profile updated");
      const updatedFullName = `${editFirstName} ${editLastName}`.trim();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id ? { ...u, name: updatedFullName, phone: editPhone } : u
        )
      );
      setEditUser(null);
    } else {
      toast.error(res.error || "Failed to update profile");
    }
  };

  // Open Role modal
  const openRoleModal = (user: UserData) => {
    setRoleUser(user);
    setSelectedRoleName(user?.role || defaultRole || "ADMIN");
  };

  // Save Role
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleUser || !selectedRoleName) return;

    setSavingRole(true);
    const res = await assignUserRoleAction(roleUser.id, selectedRoleName);
    setSavingRole(false);

    if (res.success) {
      toast.success(`Role "${selectedRoleName}" assigned`);
      setUsers((prev) =>
        prev.map((u) => (u.id === roleUser.id ? { ...u, role: selectedRoleName } : u))
      );
      setRoleUser(null);
    } else {
      toast.error(res.error || "Failed to assign role");
    }
  };

  // Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;

    if (!newPassword || newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSavingPassword(true);
    const res = await updateUserPasswordAction(passwordUser.id, newPassword);
    setSavingPassword(false);

    if (res.success) {
      toast.success(`Password updated successfully for ${passwordUser.name}`);
      setPasswordUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } else {
      toast.error(res.error || "Failed to update password");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <AddUserDialog allowedRoles={allowedRoles} defaultRole={defaultRole} />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>
            Showing {filteredUsers.length} of {users.length} authorized users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search name, email, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Last Active</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-b border-border/50 hover:bg-muted/30">
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{user?.name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">
                          {user?.email || "No email"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-semibold text-xs">
                          {user?.role || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user?.status === "Active" ? "default" : "outline"}
                          className={
                            user?.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "text-muted-foreground border-border"
                          }
                        >
                          {user?.status || "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user?.lastActive || "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => setViewUser(user)}
                              className="cursor-pointer text-xs"
                            >
                              <Eye className="mr-2 h-3.5 w-3.5" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditModal(user)}
                              className="cursor-pointer text-xs"
                            >
                              <Edit className="mr-2 h-3.5 w-3.5" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openRoleModal(user)}
                              className="cursor-pointer text-xs"
                            >
                              <Shield className="mr-2 h-3.5 w-3.5 text-[#C9A86A]" /> Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPasswordUser(user);
                                setNewPassword("");
                                setConfirmPassword("");
                                setShowPassword(false);
                              }}
                              className="cursor-pointer text-xs"
                            >
                              <KeyRound className="mr-2 h-3.5 w-3.5 text-[#C9A86A]" /> Update Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(user)}
                              disabled={actionLoading === user.id}
                              className={`cursor-pointer text-xs ${
                                user.status === "Active"
                                  ? "text-rose-500 focus:text-rose-500"
                                  : "text-emerald-500 focus:text-emerald-500"
                              }`}
                            >
                              {user.status === "Active" ? (
                                <>
                                  <UserX className="mr-2 h-3.5 w-3.5" /> Deactivate User
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-3.5 w-3.5" /> Activate User
                                </>
                              )}
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

      {/* View User Dialog */}
      {viewUser && (
        <Dialog open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#C9A86A]" /> User Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground">Full Name:</span>
                  <div className="font-semibold text-base">{viewUser.name || "Unknown"}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Email:</span>
                  <div className="font-mono text-xs">{viewUser.email || "No email"}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Assigned Role:</span>
                  <div>
                    <Badge variant="secondary" className="mt-0.5">{viewUser.role || "Unknown"}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <div>
                    <Badge
                      variant={viewUser.status === "Active" ? "default" : "outline"}
                      className={`mt-0.5 ${
                        viewUser.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : ""
                      }`}
                    >
                      {viewUser.status || "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Last Signed In:</span>
                  <div className="text-xs">{viewUser.lastActive || "Never"}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">User ID:</span>
                  <div className="font-mono text-[11px] text-muted-foreground">{viewUser.id}</div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewUser(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Profile Dialog */}
      {editUser && (
        <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-[#C9A86A]" /> Edit Profile
              </DialogTitle>
              <DialogDescription>Update name and phone details for {editUser.email}.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+880 1..."
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditUser(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-[#C9A86A] text-white hover:bg-[#b09156]"
                >
                  {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Change Role Dialog */}
      {roleUser && (
        <Dialog open={!!roleUser} onOpenChange={(o) => !o && setRoleUser(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#C9A86A]" /> Assign Role
              </DialogTitle>
              <DialogDescription>
                Update access permissions for {roleUser.name}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveRole} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="roleSelect">Select System Role</Label>
                <select
                  id="roleSelect"
                  value={selectedRoleName}
                  onChange={(e) => setSelectedRoleName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {availableRoles.length > 0 ? (
                    availableRoles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="SUPERADMIN">SUPERADMIN</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="STAFF">STAFF</option>
                    </>
                  )}
                </select>
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRoleUser(null)}
                  disabled={savingRole}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingRole}
                  className="bg-[#C9A86A] text-white hover:bg-[#b09156]"
                >
                  {savingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Role
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Update Password Dialog */}
      {passwordUser && (
        <Dialog open={!!passwordUser} onOpenChange={(o) => !o && setPasswordUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#C9A86A]" /> Update User Password
              </DialogTitle>
              <DialogDescription>
                Set a new password for <span className="font-semibold text-foreground">{passwordUser.name}</span> ({passwordUser.email}).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSavePassword} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="rounded-md bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400 border border-amber-500/20">
                The user can immediately log in with this new password.
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordUser(null)}
                  disabled={savingPassword}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingPassword}
                  className="bg-[#C9A86A] text-white hover:bg-[#b09156]"
                >
                  {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Password
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
