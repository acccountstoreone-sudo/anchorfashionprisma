"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Star,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createSupplierProfileAction,
  updateSupplierProfileAction,
  deleteSupplierProfileAction,
  getSupplierProfiles,
} from "@/app/actions/admin/procurement.actions";
import { toast } from "sonner";

interface SupplierProfile {
  id: string;
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  performance_score?: number;
  status: string;
  created_at?: string;
}

export function SuppliersClient({ suppliers = [] }: { suppliers: SupplierProfile[] }) {
  const router = useRouter();
  const [supplierList, setSupplierList] = useState<SupplierProfile[]>(suppliers);

  useEffect(() => {
    if (suppliers && suppliers.length > 0) {
      setSupplierList(suppliers);
    }
    // Also fetch fresh from server action using admin client
    getSupplierProfiles().then((res) => {
      if (res.success && res.data) {
        setSupplierList(res.data);
      }
    });
  }, [suppliers]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Add dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    performance_score: "5.0",
    status: "ACTIVE",
  });

  // Edit dialog state
  const [editItem, setEditItem] = useState<SupplierProfile | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    performance_score: "5.0",
    status: "ACTIVE",
  });

  // Delete state
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return supplierList.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        s.company_name?.toLowerCase().includes(q) ||
        s.contact_person?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [supplierList, search, statusFilter]);

  const handleOpenAdd = () => {
    setAddForm({
      company_name: "",
      contact_person: "",
      email: "",
      phone: "",
      performance_score: "5.0",
      status: "ACTIVE",
    });
    setIsAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }

    const trimmedEmail = addForm.email.trim().toLowerCase();
    if (trimmedEmail) {
      const duplicate = supplierList.find(
        (s) => s.email && s.email.trim().toLowerCase() === trimmedEmail
      );
      if (duplicate) {
        toast.error(`A supplier with email "${trimmedEmail}" already exists (${duplicate.company_name}).`);
        return;
      }
    }

    setAddLoading(true);
    const res = await createSupplierProfileAction({
      company_name: addForm.company_name.trim(),
      contact_person: addForm.contact_person.trim() || undefined,
      email: trimmedEmail || undefined,
      phone: addForm.phone.trim() || undefined,
      performance_score: parseFloat(addForm.performance_score) || 5.0,
      status: addForm.status,
    });
    setAddLoading(false);

    if (res.success) {
      toast.success(`Supplier "${addForm.company_name}" added successfully`);
      if (res.data) {
        setSupplierList((prev) => [res.data as SupplierProfile, ...prev.filter((s) => s.id !== res.data?.id)]);
      }
      setIsAddOpen(false);
      setAddForm({
        company_name: "",
        contact_person: "",
        email: "",
        phone: "",
        performance_score: "5.0",
        status: "ACTIVE",
      });
      router.refresh();
    } else {
      toast.error(res.error || "Failed to add supplier");
    }
  };

  const handleOpenEdit = (supplier: SupplierProfile) => {
    setEditItem(supplier);
    setEditForm({
      company_name: supplier.company_name || "",
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      performance_score: String(supplier.performance_score || "5.0"),
      status: supplier.status || "ACTIVE",
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const trimmedEmail = editForm.email.trim().toLowerCase();
    if (trimmedEmail) {
      const duplicate = supplierList.find(
        (s) => s.id !== editItem.id && s.email && s.email.trim().toLowerCase() === trimmedEmail
      );
      if (duplicate) {
        toast.error(`A supplier with email "${trimmedEmail}" already exists (${duplicate.company_name}).`);
        return;
      }
    }

    setEditLoading(true);
    const res = await updateSupplierProfileAction(editItem.id, {
      company_name: editForm.company_name.trim(),
      contact_person: editForm.contact_person.trim() || undefined,
      email: trimmedEmail || undefined,
      phone: editForm.phone.trim() || undefined,
      performance_score: parseFloat(editForm.performance_score) || 5.0,
      status: editForm.status,
    });
    setEditLoading(false);

    if (res.success) {
      toast.success("Supplier updated successfully");
      setSupplierList((prev) =>
        prev.map((s) =>
          s.id === editItem.id
            ? {
                ...s,
                ...(res.data || {}),
                company_name: editForm.company_name,
                contact_person: editForm.contact_person,
                email: trimmedEmail,
                phone: editForm.phone,
                performance_score: parseFloat(editForm.performance_score),
                status: editForm.status,
              }
            : s
        )
      );
      setEditItem(null);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update supplier");
    }
  };

  const handleDelete = async (supplier: SupplierProfile) => {
    if (!confirm(`Are you sure you want to delete supplier "${supplier.company_name}"?`)) return;

    setDeleteLoading(supplier.id);
    const res = await deleteSupplierProfileAction(supplier.id);
    setDeleteLoading(null);

    if (res.success) {
      toast.success("Supplier deleted successfully");
      setSupplierList((prev) => prev.filter((s) => s.id !== supplier.id));
      router.refresh();
    } else {
      toast.error(res.error || "Failed to delete supplier");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suppliers</h2>
          <p className="text-muted-foreground">
            Manage vendor profiles, contact information, performance ratings, and active status.
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company, contact person, email, phone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {(search || statusFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.company_name}</span>
                  </div>
                </TableCell>
                <TableCell>{supplier.contact_person || "—"}</TableCell>
                <TableCell className="text-sm">
                  {supplier.email ? (
                    <a
                      href={`mailto:${supplier.email}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Mail className="h-3 w-3" />
                      {supplier.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {supplier.phone ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {supplier.phone}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 font-semibold text-xs text-amber-600 dark:text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{supplier.performance_score ? Number(supplier.performance_score).toFixed(1) : "5.0"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {supplier.status === "ACTIVE" ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2 py-0.5">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(supplier)}
                    >
                      <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      disabled={deleteLoading === supplier.id}
                      onClick={() => handleDelete(supplier)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                    <p>No suppliers found matching your criteria.</p>
                    <Button variant="outline" size="sm" onClick={handleOpenAdd}>
                      <Plus className="mr-1.5 h-4 w-4" /> Add New Supplier
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Supplier Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>
              Register a vendor or partner organization for purchase orders.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name <span className="text-destructive">*</span></Label>
              <Input
                id="company_name"
                name="supplier_company_name"
                placeholder="e.g. Acme Textiles Ltd."
                value={addForm.company_name}
                onChange={(e) => setAddForm({ ...addForm, company_name: e.target.value })}
                autoComplete="off"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  name="supplier_contact_person"
                  placeholder="e.g. John Doe"
                  value={addForm.contact_person}
                  onChange={(e) => setAddForm({ ...addForm, contact_person: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="supplier_phone"
                  placeholder="+8801700000000"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="supplier_email_address"
                type="email"
                placeholder="supplier@example.com"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                autoComplete="new-password"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="performance_score">Performance Score (1-5)</Label>
                <Input
                  id="performance_score"
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={addForm.performance_score}
                  onChange={(e) => setAddForm({ ...addForm, performance_score: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={addForm.status}
                  onValueChange={(val) => val && setAddForm({ ...addForm, status: val })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Supplier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Supplier Profile</DialogTitle>
            <DialogDescription>
              Update vendor contact info and status.
            </DialogDescription>
          </DialogHeader>

          {editItem && (
            <form onSubmit={handleEditSubmit} className="space-y-4" autoComplete="off">
              <div className="space-y-2">
                <Label htmlFor="edit_company_name">Company Name</Label>
                <Input
                  id="edit_company_name"
                  name="edit_supplier_company_name"
                  value={editForm.company_name}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_contact_person">Contact Person</Label>
                  <Input
                    id="edit_contact_person"
                    name="edit_supplier_contact_person"
                    value={editForm.contact_person}
                    onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone Number</Label>
                  <Input
                    id="edit_phone"
                    name="edit_supplier_phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_email">Email Address</Label>
                <Input
                  id="edit_email"
                  name="edit_supplier_email_address"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  autoComplete="new-password"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_performance_score">Performance Score (1-5)</Label>
                  <Input
                    id="edit_performance_score"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={editForm.performance_score}
                    onChange={(e) => setEditForm({ ...editForm, performance_score: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_status">Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(val) => val && setEditForm({ ...editForm, status: val })}
                  >
                    <SelectTrigger id="edit_status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
