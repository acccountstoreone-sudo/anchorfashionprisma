"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CRMLead } from "@/types/crm.types";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  UserCheck,
  Eye,
  Pencil,
  Trash2,
  Users,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteLeadAction, convertLeadAction } from "@/actions/crm.actions";
import { LeadDialog } from "@/features/crm/components/LeadDialog";
import { LeadDetailsSheet } from "@/features/crm/components/LeadDetailsSheet";
import { ConfirmDialog } from "@/features/admin/components/shared/ConfirmDialog";

interface LeadsClientProps {
  initialLeads: CRMLead[];
}

type StatusFilter = "all" | "new" | "contacted" | "qualified" | "converted" | "lost";

export function LeadsClient({ initialLeads }: LeadsClientProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<CRMLead[]>(initialLeads);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Dialog & Sheet States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLead, setSheetLead] = useState<CRMLead | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<CRMLead | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync with prop changes if refreshed
  React.useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  // KPIs
  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((l) => l.status === "new").length;
    const qualified = leads.filter((l) => l.status === "qualified").length;
    const converted = leads.filter((l) => l.status === "converted").length;
    return { total, newCount, qualified, converted };
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Status filter
      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${lead.first_name || ""} ${lead.last_name || ""}`.toLowerCase();
        const email = (lead.email || "").toLowerCase();
        const phone = (lead.phone || "").toLowerCase();
        const company = (lead.company_name || "").toLowerCase();
        return (
          fullName.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          company.includes(q)
        );
      }

      return true;
    });
  }, [leads, statusFilter, searchQuery]);

  // Add / Edit Handlers
  const handleOpenCreate = () => {
    setSelectedLead(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleOpenEdit = (lead: CRMLead) => {
    setSelectedLead(lead);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDialogSuccess = (updatedOrNew: CRMLead) => {
    setLeads((prev) => {
      const idx = prev.findIndex((l) => l.id === updatedOrNew.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedOrNew;
        return next;
      }
      return [updatedOrNew, ...prev];
    });
    if (sheetLead?.id === updatedOrNew.id) {
      setSheetLead(updatedOrNew);
    }
    router.refresh();
  };

  // View Details Sheet
  const handleOpenDetails = (lead: CRMLead) => {
    setSheetLead(lead);
    setSheetOpen(true);
  };

  // Conversion Handler
  const handleConvert = async (lead: CRMLead) => {
    try {
      const res = await convertLeadAction(lead.id);
      if (res?.error) {
        toast.error(res.error || "Failed to convert lead");
        return;
      }
      toast.success(`${lead.first_name || "Lead"} converted to customer successfully!`);
      if (res?.data) {
        handleDialogSuccess(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to convert lead");
    }
  };

  // Delete Handlers
  const handleOpenDelete = (lead: CRMLead) => {
    setLeadToDelete(lead);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteLeadAction(leadToDelete.id);
      if (res.error) {
        toast.error(res.error || "Failed to delete lead");
        return;
      }
      toast.success("Lead removed from database");
      setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id));
      if (sheetLead?.id === leadToDelete.id) {
        setSheetOpen(false);
      }
      setDeleteConfirmOpen(false);
      setLeadToDelete(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete lead");
    } finally {
      setDeleting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="default">NEW</Badge>;
      case "contacted":
        return <Badge variant="secondary">CONTACTED</Badge>;
      case "qualified":
        return (
          <Badge
            variant="outline"
            className="border-blue-500 text-blue-600 dark:text-blue-400"
          >
            QUALIFIED
          </Badge>
        );
      case "converted":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
            CONVERTED
          </Badge>
        );
      case "lost":
        return <Badge variant="destructive">LOST</Badge>;
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads Management</h1>
          <p className="mt-1 text-muted-foreground">
            Track, nurture, and convert prospective wholesale and retail clients.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered prospects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting first contact
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Qualified</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.qualified}</div>
            <p className="text-xs text-muted-foreground mt-1">
              High-intent opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.converted}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active paying accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls: Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, email, phone, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-lg border text-xs">
          {(
            [
              { id: "all", label: "All" },
              { id: "new", label: "New" },
              { id: "contacted", label: "Contacted" },
              { id: "qualified", label: "Qualified" },
              { id: "converted", label: "Converted" },
              { id: "lost", label: "Lost" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prospective Leads</CardTitle>
          <CardDescription>
            Showing {filteredLeads.length} of {leads.length} recorded leads in the CRM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead Contact</TableHead>
                  <TableHead>Communication Channels</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-36 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                        <p className="font-medium text-sm">No leads match your criteria.</p>
                        <p className="text-xs">
                          Try adjusting your search query or status filter.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => {
                    const fullName =
                      [lead.first_name, lead.last_name].filter(Boolean).join(" ") ||
                      "Unnamed Lead";

                    return (
                      <TableRow key={lead.id} className="hover:bg-muted/30">
                        {/* Name & ID */}
                        <TableCell>
                          <button
                            onClick={() => handleOpenDetails(lead)}
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {fullName}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              ID: {lead.id.substring(0, 8)}...
                            </div>
                          </button>
                        </TableCell>

                        {/* Contact Channels */}
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            {lead.email ? (
                              <a
                                href={`mailto:${lead.email}`}
                                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                                title="Send direct email"
                              >
                                <Mail className="h-3.5 w-3.5 text-primary" />
                                <span className="truncate max-w-[180px]">
                                  {lead.email}
                                </span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground/50 text-[11px]">
                                No email
                              </span>
                            )}

                            {lead.phone ? (
                              <a
                                href={`tel:${lead.phone}`}
                                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                                title="Call phone number"
                              >
                                <Phone className="h-3.5 w-3.5 text-emerald-500" />
                                <span>{lead.phone}</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground/50 text-[11px]">
                                No phone
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Company */}
                        <TableCell>
                          {lead.company_name ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {lead.company_name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>{renderStatusBadge(lead.status)}</TableCell>

                        {/* Source */}
                        <TableCell className="text-xs text-muted-foreground capitalize">
                          {lead.source || "Direct"}
                        </TableCell>

                        {/* Score */}
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {lead.score || 0}
                          </Badge>
                        </TableCell>

                        {/* Updated At */}
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(lead.updated_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>

                        {/* Row Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Quick Direct Email button */}
                            {lead.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Direct Email"
                                asChild
                              >
                                <a href={`mailto:${lead.email}`}>
                                  <Mail className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                </a>
                              </Button>
                            )}

                            {/* Quick Direct Phone button */}
                            {lead.phone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Direct Call"
                                asChild
                              >
                                <a href={`tel:${lead.phone}`}>
                                  <Phone className="h-4 w-4 text-muted-foreground hover:text-emerald-500" />
                                </a>
                              </Button>
                            )}

                            {/* Menu Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    aria-label="Actions"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => handleOpenDetails(lead)}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleOpenEdit(lead)}
                                  className="gap-2"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit Lead
                                </DropdownMenuItem>

                                {lead.phone && (
                                  <DropdownMenuItem asChild className="gap-2 text-emerald-600 focus:text-emerald-600">
                                    <a href={`tel:${lead.phone}`}>
                                      <Phone className="h-4 w-4" />
                                      Call Lead ({lead.phone})
                                    </a>
                                  </DropdownMenuItem>
                                )}

                                {lead.status !== "converted" && (
                                  <DropdownMenuItem
                                    onClick={() => handleConvert(lead)}
                                    className="gap-2 text-emerald-600 focus:text-emerald-600"
                                  >
                                    <UserCheck className="h-4 w-4" />
                                    Convert to Customer
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => handleOpenDelete(lead)}
                                  className="gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Lead
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initialData={selectedLead}
        onSuccess={handleDialogSuccess}
      />

      {/* View Details Slide-over Sheet */}
      <LeadDetailsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        lead={sheetLead}
        onEdit={(lead) => {
          setSheetOpen(false);
          handleOpenEdit(lead);
        }}
        onLeadUpdated={handleDialogSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Prospective Lead"
        description={`Are you sure you want to permanently remove "${leadToDelete?.first_name || ""} ${leadToDelete?.last_name || "this lead"}"? This action cannot be undone.`}
        confirmLabel="Delete Lead"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setLeadToDelete(null);
        }}
      />
    </div>
  );
}
