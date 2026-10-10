"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Search,
  Plus,
  ClipboardCheck,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  createAuditAction,
  updateAuditStatusAction,
} from "@/actions/inventory.actions";
import { toast } from "sonner";

interface AuditsClientProps {
  audits: any[];
  allWarehouses: any[];
}

export function AuditsClient({ audits = [], allWarehouses = [] }: AuditsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Schedule modal state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleWarehouse, setScheduleWarehouse] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [blindCount, setBlindCount] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Status transition state
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return audits.filter((a) => {
      const warehouseName = (a.warehouses?.name || "").toLowerCase();
      const matchesSearch = !search || warehouseName.includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" ||
        a.status === statusFilter ||
        (statusFilter === "PLANNED" && a.status === "SCHEDULED");
      return matchesSearch && matchesStatus;
    });
  }, [audits, search, statusFilter]);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleWarehouse) {
      toast.error("Please select a warehouse");
      return;
    }

    setScheduleLoading(true);
    const res = await createAuditAction({
      warehouse_id: scheduleWarehouse,
      blind_count: blindCount,
      scheduled_date: scheduleDate || undefined,
    });
    setScheduleLoading(false);

    if (res.success) {
      toast.success("Inventory audit scheduled successfully");
      setIsScheduleOpen(false);
      setScheduleWarehouse("");
      setScheduleDate("");
      setBlindCount(false);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to schedule audit");
    }
  };

  const handleStatusChange = async (
    auditId: string,
    newStatus: "PLANNED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  ) => {
    setStatusLoading(auditId);
    const res = await updateAuditStatusAction(auditId, newStatus);
    setStatusLoading(null);

    if (res.success) {
      toast.success(`Audit marked as ${newStatus}`);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update audit status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PLANNED":
      case "SCHEDULED":
        return <Badge variant="outline">Scheduled</Badge>;
      case "IN_PROGRESS":
        return (
          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
            In Progress
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
            Completed
          </Badge>
        );
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Audits</h2>
          <p className="text-muted-foreground">
            Manage cycle counts, blind verifications, and physical inventory reconciliation.
          </p>
        </div>
        <Button onClick={() => setIsScheduleOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Schedule Audit
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search warehouse..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PLANNED">Planned</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
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

      {/* Audits Table */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Blind Count</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((audit) => (
              <TableRow key={audit.id}>
                <TableCell className="text-sm font-medium">
                  {audit.scheduled_date || audit.created_at
                    ? format(new Date(audit.scheduled_date || audit.created_at), "PPP")
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                    <span>{audit.warehouses?.name || "N/A"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {audit.blind_count ? (
                    <Badge variant="secondary" className="text-xs">
                      Blind (Zero-knowledge)
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Standard</span>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(audit.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {(audit.status === "PLANNED" || audit.status === "SCHEDULED") && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusLoading === audit.id}
                        onClick={() => handleStatusChange(audit.id, "IN_PROGRESS")}
                      >
                        <Play className="mr-1 h-3.5 w-3.5 text-blue-600" /> Start Count
                      </Button>
                    )}

                    {audit.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={statusLoading === audit.id}
                        onClick={() => handleStatusChange(audit.id, "COMPLETED")}
                      >
                        <CheckCircle className="mr-1 h-3.5 w-3.5" /> Complete Audit
                      </Button>
                    )}

                    {audit.status !== "COMPLETED" && audit.status !== "CANCELLED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={statusLoading === audit.id}
                        onClick={() => handleStatusChange(audit.id, "CANCELLED")}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ClipboardCheck className="h-8 w-8 text-muted-foreground/50" />
                    <p>No inventory audits found.</p>
                    <Button variant="outline" size="sm" onClick={() => setIsScheduleOpen(true)}>
                      <Plus className="mr-1.5 h-4 w-4" /> Schedule First Audit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Schedule Audit Modal */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Schedule Inventory Audit
            </DialogTitle>
            <DialogDescription>
              Plan a physical stock verification or cycle count.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="audit_warehouse">Warehouse <span className="text-destructive">*</span></Label>
              <Select value={scheduleWarehouse} onValueChange={(val) => setScheduleWarehouse(val || "")} required>
                <SelectTrigger id="audit_warehouse">
                  <SelectValue placeholder="Select target warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {allWarehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name} {wh.code ? `(${wh.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audit_date">Scheduled Date</Label>
              <Input
                id="audit_date"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Blind Count</Label>
                <p className="text-xs text-muted-foreground">
                  Hide system expected quantities from counters for unbiased verification.
                </p>
              </div>
              <Switch checked={blindCount} onCheckedChange={setBlindCount} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={scheduleLoading}>
                {scheduleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule Audit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
