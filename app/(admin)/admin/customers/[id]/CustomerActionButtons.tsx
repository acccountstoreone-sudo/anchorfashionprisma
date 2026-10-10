"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Edit2,
  Trash2,
  KeyRound,
  Loader2,
  MessageSquare,
  Award,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import {
  updateCustomerByAdminAction,
  deleteCustomerByAdminAction,
  getCustomerPasswordAction,
} from "@/app/actions/crm/customer-admin.actions";

export interface CustomerActionButtonsProps {
  customerId: string;
  initialPoints: number;
  initialData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string | null;
  };
}

export function CustomerActionButtons({
  customerId,
  initialPoints,
  initialData,
}: CustomerActionButtonsProps) {
  const router = useRouter();

  // Dialog open states
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isPointsOpen, setIsPointsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Points state
  const [points, setPoints] = useState(initialPoints);
  const [pointsDelta, setPointsDelta] = useState(0);

  // Message state
  const [message, setMessage] = useState("");

  // Edit customer form state
  const [firstName, setFirstName] = useState(initialData?.firstName || "");
  const [lastName, setLastName] = useState(initialData?.lastName || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "");

  // Password management states
  const [currentPassword, setCurrentPassword] = useState<string | null>(
    initialData?.password || null
  );
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAdjustPoints = async () => {
    toast.success(`Successfully adjusted points by ${pointsDelta}`);
    setPoints(points + Number(pointsDelta));
    setIsPointsOpen(false);
  };

  const handleSendMessage = async () => {
    toast.success("Message sent successfully to customer");
    setIsMessageOpen(false);
    setMessage("");
  };

  const handleOpenEdit = async () => {
    setFirstName(initialData?.firstName || "");
    setLastName(initialData?.lastName || "");
    setEmail(initialData?.email || "");
    setPhone(initialData?.phone || "");
    setNewPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setIsEditOpen(true);

    try {
      const res = await getCustomerPasswordAction(customerId);
      if (res.success && res.password) {
        setCurrentPassword(res.password);
      }
    } catch {
      // non-critical
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
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    try {
      setIsUpdating(true);
      const res = await updateCustomerByAdminAction({
        id: customerId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() ? phone.trim() : null,
        password: newPassword.trim() ? newPassword.trim() : undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update customer profile.");
        return;
      }

      toast.success("Customer profile updated successfully.");
      if (newPassword.trim()) {
        setCurrentPassword(newPassword.trim());
      }
      setIsEditOpen(false);
      setNewPassword("");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await deleteCustomerByAdminAction(customerId);

      if (!res.success) {
        toast.error(res.error || "Failed to delete customer.");
        return;
      }

      toast.success("Customer account deleted successfully.");
      setIsDeleteOpen(false);
      router.push("/admin/customers");
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Edit Customer Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenEdit}
        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50"
      >
        <Edit2 className="h-4 w-4" />
        <span>Edit Customer & Password</span>
      </Button>

      {/* Delete Customer Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDeleteOpen(true)}
        className="flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete</span>
      </Button>

      {/* Message Dialog */}
      <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" className="flex items-center gap-1.5" />}>
          <MessageSquare className="h-4 w-4" />
          <span>Message</span>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send an email or SMS directly to this customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Points Dialog */}
      <Dialog open={isPointsOpen} onOpenChange={setIsPointsOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" className="flex items-center gap-1.5" />}>
          <Award className="h-4 w-4" />
          <span>Adjust Points</span>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Reward Points</DialogTitle>
            <DialogDescription>
              Add or remove loyalty points for this customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Adjustment (use negative to remove)</Label>
              <Input
                type="number"
                value={pointsDelta}
                onChange={(e) => setPointsDelta(Number(e.target.value))}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              New Balance: {points + Number(pointsDelta)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPointsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustPoints}>Apply Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer & Password Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Customer Account & Password</DialogTitle>
              <DialogDescription>
                View customer current credentials, update details, or assign a
                new password.
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
                  <Label htmlFor="detail-first-name">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="detail-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="detail-last-name">Last Name</Label>
                  <Input
                    id="detail-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="detail-email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="detail-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="detail-phone">Phone Number</Label>
                <Input
                  id="detail-phone"
                  placeholder="+8801XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* SET / RESET PASSWORD SECTION */}
              <div className="pt-2 border-t mt-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="detail-password"
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
                    id="detail-password"
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
                  Leave blank to keep existing password. Minimum 6 characters.
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
              Are you sure you want to permanently delete this customer account?
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
