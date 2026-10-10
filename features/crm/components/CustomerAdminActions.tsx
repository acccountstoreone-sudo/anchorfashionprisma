"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Edit2,
  Trash2,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  updateCustomerByAdminAction,
  deleteCustomerByAdminAction,
  getCustomerPasswordAction,
} from "@/app/actions/crm/customer-admin.actions";
import { CrmCustomer, CustomerLifecycleStage } from "./CustomersList";

interface CustomerAdminActionsProps {
  customer: CrmCustomer;
}

export function CustomerAdminActions({ customer }: CustomerAdminActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState(customer.first_name || "");
  const [lastName, setLastName] = useState(customer.last_name || "");
  const [email, setEmail] = useState(customer.email || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [lifecycleStage, setLifecycleStage] = useState<CustomerLifecycleStage>(
    customer.customer_lifecycle_stage || "PROSPECT"
  );
  const [isVip, setIsVip] = useState(customer.is_vip || false);

  // Password management states
  const [currentPassword, setCurrentPassword] = useState<string | null>(
    customer.assigned_password || null
  );
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset form and fetch latest password when opening edit modal
  const handleOpenEdit = async () => {
    setFirstName(customer.first_name || "");
    setLastName(customer.last_name || "");
    setEmail(customer.email || "");
    setPhone(customer.phone || "");
    setLifecycleStage(customer.customer_lifecycle_stage || "PROSPECT");
    setIsVip(customer.is_vip || false);
    setNewPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setIsEditOpen(true);

    // Fetch latest password from auth metadata
    try {
      const res = await getCustomerPasswordAction(customer.id);
      if (res.success && res.password) {
        setCurrentPassword(res.password);
      }
    } catch {
      // non-critical fallback to initial prop
    }
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let generated = "Anchor@";
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setShowNewPassword(true);
    toast.info("Generated new strong password!");
  };

  const handleCopyCurrentPassword = () => {
    if (!currentPassword) return;
    navigator.clipboard.writeText(currentPassword);
    setCopiedPassword(true);
    toast.success("Current password copied to clipboard!");
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error("First name is required.");
      return;
    }
    if (!email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (newPassword && newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    try {
      setIsUpdating(true);
      const res = await updateCustomerByAdminAction({
        id: customer.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() ? phone.trim() : null,
        lifecycleStage,
        isVip,
        password: newPassword.trim() ? newPassword.trim() : undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update customer.");
        return;
      }

      toast.success("Customer profile updated successfully.");
      if (newPassword.trim()) {
        setCurrentPassword(newPassword.trim());
      }
      setIsEditOpen(false);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await deleteCustomerByAdminAction(customer.id);

      if (!res.success) {
        toast.error(res.error || "Failed to delete customer.");
        return;
      }

      toast.success("Customer account deleted successfully.");
      setIsDeleteOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      {/* View Profile Button */}
      <Link href={`/admin/customers/${customer.id}`} passHref>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
          title="View Customer Profile"
        >
          <User className="h-4 w-4" />
        </Button>
      </Link>

      {/* Edit Customer Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpenEdit}
        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50"
        title="Edit Credentials & Details"
      >
        <Edit2 className="h-4 w-4" />
      </Button>

      {/* Delete Customer Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsDeleteOpen(true)}
        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
        title="Delete Customer"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Customer Account & Credentials</DialogTitle>
              <DialogDescription>
                View customer current password, edit contact profile, or assign a
                new login password.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-3 max-h-[72vh] overflow-y-auto px-1">
              {/* CURRENT PASSWORD SECTION */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <KeyRound className="h-4 w-4 text-amber-500" />
                    <span>Current Password</span>
                  </div>
                  {currentPassword && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Active
                    </span>
                  )}
                </div>

                {currentPassword ? (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-mono text-sm font-semibold tracking-wider text-slate-900 dark:text-slate-100 select-all">
                        {showCurrentPassword ? currentPassword : "••••••••••••"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        title={showCurrentPassword ? "Hide password" : "Show password"}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 mr-1" />
                        ) : (
                          <Eye className="h-4 w-4 mr-1" />
                        )}
                        <span>{showCurrentPassword ? "Hide" : "Show"}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                        onClick={handleCopyCurrentPassword}
                        title="Copy to clipboard"
                      >
                        {copiedPassword ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-md border border-dashed border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    Customer registered prior to password logging and is stored
                    hashed in Supabase. Set a new password below to view and
                    manage it anytime.
                  </div>
                )}
              </div>

              {/* PROFILE FIELDS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-first-name">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-last-name">Last Name</Label>
                  <Input
                    id="edit-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  placeholder="+8801XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-stage">Lifecycle Stage</Label>
                  <Select
                    value={lifecycleStage}
                    onValueChange={(val) => {
                      if (val) setLifecycleStage(val as CustomerLifecycleStage);
                    }}
                  >
                    <SelectTrigger id="edit-stage" className="w-full">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROSPECT">Prospect</SelectItem>
                      <SelectItem value="FIRST_TIME_BUYER">
                        First Time Buyer
                      </SelectItem>
                      <SelectItem value="REPEAT_CUSTOMER">
                        Repeat Customer
                      </SelectItem>
                      <SelectItem value="LOYAL">Loyal</SelectItem>
                      <SelectItem value="AT_RISK">At Risk</SelectItem>
                      <SelectItem value="CHURNED">Churned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="flex items-center justify-between border rounded-md p-2.5 h-10">
                    <Label
                      htmlFor="edit-vip"
                      className="text-xs font-semibold cursor-pointer"
                    >
                      VIP Customer
                    </Label>
                    <Switch
                      id="edit-vip"
                      checked={isVip}
                      onCheckedChange={setIsVip}
                    />
                  </div>
                </div>
              </div>

              {/* SET / RESET PASSWORD SECTION */}
              <div className="pt-2 border-t mt-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="edit-password"
                    className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5"
                  >
                    <span>Update / Assign New Password</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex items-center gap-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                    onClick={handleGeneratePassword}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Generate Random</span>
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password (optional)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Leave blank to keep existing password. If updating, minimum 6
                  characters.
                </p>
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Customer Account
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to permanently delete{" "}
              <strong>
                {customer.first_name} {customer.last_name}
              </strong>{" "}
              ({customer.email})?
              <br />
              <br />
              This will remove their profile and authentication credentials. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Customer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
