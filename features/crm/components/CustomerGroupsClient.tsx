"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import {
  Search,
  Users,
  Trash2,
  Edit2,
  Loader2,
  ExternalLink,
  Plus,
  UserPlus,
  UserMinus,
  Sparkles,
  Layers,
  CheckCircle2,
  Phone,
  Mail,
  X,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/features/admin/components/shared/ConfirmDialog";
import { CustomerGroupActions } from "@/features/crm/components/CustomerGroupActions";
import {
  deleteGroupAction,
  getGroupMembersAction,
  updateGroupAction,
  addMemberToGroupAction,
  removeMemberFromGroupAction,
  searchAvailableCustomersAction,
} from "@/app/actions/crm/groups.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CustomerGroupsClientProps {
  segments: any[];
}

export function CustomerGroupsClient({ segments }: CustomerGroupsClientProps) {
  const [search, setSearch] = useState("");
  const [deletingGroup, setDeletingGroup] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();

  // View / Edit Modal State
  const [viewingGroup, setViewingGroup] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsDynamic, setEditIsDynamic] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Add Member State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  const [addingCustomerId, setAddingCustomerId] = useState<string | null>(null);
  const [removingCustomerId, setRemovingCustomerId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return segments;
    const q = search.toLowerCase();
    return segments.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }, [search, segments]);

  // High-level Stats
  const dynamicCount = useMemo(() => segments.filter((s) => s.is_dynamic).length, [segments]);
  const staticCount = useMemo(() => segments.filter((s) => !s.is_dynamic).length, [segments]);
  const totalAudience = useMemo(
    () => segments.reduce((acc, s) => acc + (Number(s.member_count) || 0), 0),
    [segments]
  );

  const handleOpenView = async (group: any) => {
    setViewingGroup(group);
    setIsEditing(false);
    setIsAddingMember(false);
    setCustomerSearch("");
    setMemberSearch("");
    setAvailableCustomers([]);
    setEditName(group.name || "");
    setEditDescription(group.description || "");
    setEditIsDynamic(!!group.is_dynamic);
    setLoadingMembers(true);

    try {
      const res = await getGroupMembersAction(group.id);
      if (res.success && res.data) {
        setMembers(res.data.members || []);
      } else {
        setMembers([]);
      }
    } catch {
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter((m: any) => {
      const fullName = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase();
      const email = (m.email || "").toLowerCase();
      const phone = (m.phone || "").toLowerCase();
      return fullName.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [members, memberSearch]);

  // Search candidate customers to add to group
  useEffect(() => {
    if (!isAddingMember) return;
    const timer = setTimeout(async () => {
      setSearchingCustomers(true);
      try {
        const memberIds = members.map((m) => m.id);
        const res = await searchAvailableCustomersAction(customerSearch, memberIds);
        if (res.success) {
          setAvailableCustomers(res.data || []);
        }
      } catch (err) {
        console.error("Error searching customers:", err);
      } finally {
        setSearchingCustomers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearch, isAddingMember, members]);

  const handleAddMember = async (customer: any) => {
    if (!viewingGroup) return;
    setAddingCustomerId(customer.id);
    const res = await addMemberToGroupAction(viewingGroup.id, customer.id);
    setAddingCustomerId(null);

    if (res.success) {
      toast.success(`${customer.first_name || "Customer"} added to group`);
      setMembers((prev) => [customer, ...prev]);
      setAvailableCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      router.refresh();
    } else {
      toast.error(res.error || "Failed to add customer");
    }
  };

  const handleRemoveMember = async (customer: any) => {
    if (!viewingGroup) return;
    setRemovingCustomerId(customer.id);
    const res = await removeMemberFromGroupAction(viewingGroup.id, customer.id);
    setRemovingCustomerId(null);

    if (res.success) {
      toast.success(`${customer.first_name || "Customer"} removed from group`);
      setMembers((prev) => prev.filter((m) => m.id !== customer.id));
      router.refresh();
    } else {
      toast.error(res.error || "Failed to remove customer");
    }
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      toast.error("Group name is required");
      return;
    }

    startTransition(async () => {
      const res = await updateGroupAction(viewingGroup.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        isDynamic: editIsDynamic,
      });

      if (res.success) {
        toast.success("Customer group updated successfully");
        setViewingGroup((prev: any) => ({
          ...prev,
          name: editName.trim(),
          description: editDescription.trim(),
          is_dynamic: editIsDynamic,
        }));
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update group");
      }
    });
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;
    setDeleteLoading(true);
    const res = await deleteGroupAction(deletingGroup.id);
    setDeleteLoading(false);
    if (res.success) {
      toast.success(`Group "${deletingGroup.name}" deleted`);
      setDeletingGroup(null);
      if (viewingGroup?.id === deletingGroup.id) {
        setViewingGroup(null);
      }
      router.refresh();
    } else {
      toast.error(res.error || "Failed to delete group");
      setDeletingGroup(null);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customer Groups & Segments</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Build targeted cohorts, automated lifecycle audiences, and loyalty campaign segments.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <CustomerGroupActions />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Groups
            </CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Configured segments</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dynamic Segments
            </CardTitle>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{dynamicCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Auto-updated by criteria</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Static Cohorts
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{staticCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Manually curated lists</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Segment Audience
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalAudience.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Members across groups</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search groups or descriptions..."
            className="w-full bg-card pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Groups Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[280px]">Group Name</TableHead>
              <TableHead>Targeting Description</TableHead>
              <TableHead className="w-[150px]">Type</TableHead>
              <TableHead className="w-[140px] text-center">Audience Size</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground/30" />
                    <p className="font-medium text-foreground">
                      {search ? "No groups match your search filter." : "No customer groups found."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Create your first customer group to begin audience segmenting.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((segment) => (
                <TableRow key={segment.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      {segment.name}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[340px] text-xs sm:text-sm text-muted-foreground truncate">
                    {segment.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={segment.is_dynamic ? "default" : "secondary"}
                      className={`text-xs ${
                        segment.is_dynamic
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {segment.is_dynamic ? "Dynamic Segment" : "Static Group"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-foreground">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {Number(segment.member_count ?? 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium"
                        onClick={() => handleOpenView(segment)}
                      >
                        Manage
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingGroup(segment)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View / Manage Members & Edit Modal */}
      <Dialog
        open={!!viewingGroup}
        onOpenChange={(open) => {
          if (!open) {
            setViewingGroup(null);
            setIsEditing(false);
            setIsAddingMember(false);
            setMemberSearch("");
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl h-[88vh] max-h-[88vh] p-0 flex flex-col gap-0 overflow-hidden shadow-2xl border bg-background rounded-xl">
          {/* Modal Header */}
          <div className="px-6 py-5 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground truncate">
                    {isEditing ? `Edit: ${viewingGroup?.name}` : viewingGroup?.name}
                  </DialogTitle>
                  {!isEditing && (
                    <Badge
                      variant={viewingGroup?.is_dynamic ? "default" : "secondary"}
                      className={`text-xs ${
                        viewingGroup?.is_dynamic
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {viewingGroup?.is_dynamic ? "Dynamic Sync" : "Static Cohort"}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs font-medium">
                    {members.length} {members.length === 1 ? "Member" : "Members"}
                  </Badge>
                </div>
                {!isEditing && (
                  <DialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1 line-clamp-1">
                    {viewingGroup?.description || "Audience cohort for CRM marketing, promotions, and customer segmentation."}
                  </DialogDescription>
                )}
              </div>
            </div>

            {!isEditing && (
              <div className="flex items-center gap-2 shrink-0 pr-8 sm:pr-0">
                <Button
                  variant={isAddingMember ? "secondary" : "default"}
                  size="sm"
                  className="h-9 px-3.5 text-xs font-medium gap-1.5"
                  onClick={() => setIsAddingMember(!isAddingMember)}
                >
                  {isAddingMember ? (
                    <>
                      <X className="h-3.5 w-3.5" /> Close Search
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" /> Add Customers
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs gap-1.5"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit Group
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Delete Group"
                  onClick={() => setDeletingGroup(viewingGroup)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {isEditing ? (
            /* Edit Form */
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 md:col-span-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="group-name" className="text-sm font-semibold">Group Name</Label>
                    <Input
                      id="group-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g., VIP Wholesale Buyers"
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="group-desc" className="text-sm font-semibold">Description & Criteria</Label>
                    <Textarea
                      id="group-desc"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Describe targeting or criteria for this customer group..."
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="group-dynamic" className="cursor-pointer text-sm font-semibold">
                        Dynamic Membership
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically syncs customers based on purchasing activity, spend thresholds, and lifecycle rules.
                      </p>
                    </div>
                    <Switch
                      id="group-dynamic"
                      checked={editIsDynamic}
                      onCheckedChange={setEditIsDynamic}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveEdit} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            /* View Details & Member Management */
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Add Member Panel */}
              {isAddingMember && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Find & Add Customers</h4>
                        <p className="text-xs text-muted-foreground">Search by name, email, or phone to add them into this cohort</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setIsAddingMember(false)}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Close
                    </Button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Type customer name, email address, or phone..."
                      className="h-10 pl-9 text-sm bg-background"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {searchingCustomers ? (
                    <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Searching available customers...
                    </div>
                  ) : availableCustomers.length === 0 ? (
                    <p className="text-xs text-center text-muted-foreground py-4">
                      {customerSearch ? "No matching customers found." : "Type a name or email to search available customers."}
                    </p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1">
                      {availableCustomers.map((cust) => {
                        const name = [cust.first_name, cust.last_name].filter(Boolean).join(" ") || "Customer";
                        const initials = ((cust.first_name?.[0] || "") + (cust.last_name?.[0] || "")).toUpperCase() || "C";
                        return (
                          <div
                            key={cust.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-background border text-xs hover:border-primary/50 transition-colors shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 text-xs">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate">{name}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{cust.email}</div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-xs shrink-0"
                              disabled={addingCustomerId === cust.id}
                              onClick={() => handleAddMember(cust)}
                            >
                              {addingCustomerId === cust.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Existing Members Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter group members..."
                    className="h-8 pl-8 text-xs bg-card"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                  {memberSearch && (
                    <button
                      onClick={() => setMemberSearch("")}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span>Showing</span>
                  <strong className="text-foreground">{filteredMembers.length}</strong>
                  <span>of</span>
                  <strong className="text-foreground">{members.length}</strong>
                  <span>members</span>
                </div>
              </div>

              {/* Members List Table */}
              {loadingMembers ? (
                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <p className="text-xs font-medium">Loading customer members...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground rounded-xl border border-dashed p-8">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30 text-primary" />
                  <p className="font-semibold text-foreground">No customer members in this group</p>
                  <p className="text-xs mt-1 text-muted-foreground max-w-sm mx-auto">
                    This cohort is currently empty. Click &quot;Add Customers&quot; to manually search and assign members.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 text-xs font-medium"
                    onClick={() => setIsAddingMember(true)}
                  >
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add Customers
                  </Button>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground rounded-lg border p-6">
                  <p>No members match your search &quot;{memberSearch}&quot;</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs mt-1"
                    onClick={() => setMemberSearch("")}
                  >
                    Clear Filter
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden bg-card shadow-2xs">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-[320px]">Customer</TableHead>
                        <TableHead>Email Address</TableHead>
                        <TableHead className="w-[180px]">Phone Number</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member: any) => {
                        const name =
                          [member.first_name, member.last_name].filter(Boolean).join(" ") ||
                          "Customer";
                        const initials =
                          ((member.first_name?.[0] || "") + (member.last_name?.[0] || "")).toUpperCase() ||
                          "C";
                        return (
                          <TableRow key={member.id} className="hover:bg-muted/20 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-foreground text-sm truncate">
                                    {name}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground font-mono">
                                    ID: {member.id.slice(0, 8)}...
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {member.email ? (
                                <div className="flex items-center gap-1.5 truncate">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                                  <span className="truncate">{member.email}</span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {member.phone ? (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                                  <span>{member.phone}</span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                                  asChild
                                >
                                  <Link href={`/admin/customers/${member.id}`} target="_blank">
                                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Profile
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Remove from group"
                                  disabled={removingCustomerId === member.id}
                                  onClick={() => handleRemoveMember(member)}
                                >
                                  {removingCustomerId === member.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <UserMinus className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingGroup}
        title={`Delete "${deletingGroup?.name}"?`}
        description="This will permanently delete this customer group. Customer accounts in this group will not be deleted."
        confirmLabel="Delete Group"
        variant="destructive"
        isLoading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeletingGroup(null)}
      />
    </div>
  );
}
