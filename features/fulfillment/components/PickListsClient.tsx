"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Printer,
  Users,
  PackageCheck,
  Search,
  Filter,
  MoreHorizontal,
  Loader2,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  generatePickListFromOrdersAction,
  assignPickerAction,
  updatePickListStatusAction,
} from "@/actions/admin/fulfillment.actions";

interface Picker {
  id: string;
  name: string;
  email?: string;
}

interface Warehouse {
  id: string;
  name: string;
  code?: string;
}

interface PickListRecord {
  id: string;
  pick_list_number?: string;
  warehouse_id?: string;
  warehouses?: { id: string; name: string; code?: string };
  assigned_picker_id?: string;
  assignedToName?: string;
  status: "PENDING" | "ASSIGNED" | "PICKING" | "PARTIALLY_PICKED" | "COMPLETED" | "CANCELLED";
  itemsTotal?: number;
  itemsPicked?: number;
  created_at: string;
  notes?: string;
}

interface PickListsClientProps {
  pickLists: PickListRecord[];
  warehouses: Warehouse[];
  pickers: Picker[];
  pendingCount: number;
}

export function PickListsClient({
  pickLists: initialPickLists,
  warehouses,
  pickers,
  pendingCount,
}: PickListsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<PickListRecord | null>(null);
  const [selectedPickerId, setSelectedPickerId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || "");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    return initialPickLists.filter((list) => {
      const q = search.toLowerCase();
      const num = (list.pick_list_number || list.id).toLowerCase();
      const wh = (list.warehouses?.name || "").toLowerCase();
      const picker = (list.assignedToName || "").toLowerCase();

      const matchesSearch = !search || num.includes(q) || wh.includes(q) || picker.includes(q);
      const matchesStatus = statusFilter === "ALL" || list.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [initialPickLists, search, statusFilter]);

  const handleGenerateWave = async () => {
    setLoading(true);
    const res = await generatePickListFromOrdersAction(selectedWarehouseId);
    setLoading(false);
    if (res.success) {
      toast.success("Pick list generated successfully");
      setGenerateOpen(false);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to generate pick list");
    }
  };

  const handleAssignPicker = async () => {
    if (!selectedList || !selectedPickerId) {
      toast.error("Please select a staff picker");
      return;
    }
    setLoading(true);
    const res = await assignPickerAction(selectedList.id, selectedPickerId);
    setLoading(false);
    if (res.success) {
      toast.success("Picker assigned successfully");
      setAssignOpen(false);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to assign picker");
    }
  };

  const handleStatusChange = async (
    listId: string,
    status: "PENDING" | "ASSIGNED" | "PICKING" | "PARTIALLY_PICKED" | "COMPLETED" | "CANCELLED"
  ) => {
    const res = await updatePickListStatusAction(listId, status);
    if (res.success) {
      toast.success(`Status updated to ${status.replace(/_/g, " ")}`);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>;
      case "ASSIGNED":
      case "IN_PROGRESS":
        return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white">In Progress</Badge>;
      case "PICKING":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Picking</Badge>;
      case "PARTIALLY_PICKED":
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white">Partially Picked</Badge>;
      case "COMPLETED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Order Fulfillment & Pick Lists
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage warehouse pick waves, picker allocation, and item staging workflows.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setGenerateOpen(true)}>
            <Play className="mr-2 h-4 w-4" /> Generate Wave
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="bg-card">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Pending Orders to Pick
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Orders awaiting batch allocation</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Active Pick Lists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {initialPickLists.filter((l) => ["ASSIGNED", "PICKING"].includes(l.status)).length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Batches currently on the floor</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Completed Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {initialPickLists.filter((l) => l.status === "COMPLETED").length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Ready for packing & dispatch</p>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="bg-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold">Pick Lists</CardTitle>
              <CardDescription className="text-xs">
                Generated wave lists assigned to warehouse pickers.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search list # or warehouse..."
                  className="pl-9 text-xs h-9 bg-card"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
                <SelectTrigger className="w-36 h-9 text-xs bg-card">
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="PICKING">Picking</SelectItem>
                  <SelectItem value="PARTIALLY_PICKED">Partially Picked</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <PackageCheck className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-medium text-foreground">No pick lists match your criteria</h3>
              <p className="text-xs mt-1 max-w-sm text-muted-foreground">
                Click &quot;Generate Wave&quot; to aggregate unfulfilled orders into warehouse batches.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">List #</TableHead>
                    <TableHead className="min-w-[130px]">Warehouse</TableHead>
                    <TableHead className="min-w-[140px]">Assigned Picker</TableHead>
                    <TableHead className="min-w-[160px]">Progress</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[110px]">Created</TableHead>
                    <TableHead className="text-right min-w-[90px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((list) => {
                    const total = list.itemsTotal || 1;
                    const picked = list.itemsPicked || 0;
                    const progress = Math.min(100, Math.round((picked / total) * 100));

                    return (
                      <TableRow key={list.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {list.pick_list_number || `PL-${list.id.slice(0, 6).toUpperCase()}`}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {list.warehouses?.name || "Default Warehouse"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <button
                            type="button"
                            className="flex items-center text-left hover:underline text-foreground"
                            onClick={() => {
                              setSelectedList(list);
                              setSelectedPickerId(list.assigned_picker_id || "");
                              setAssignOpen(true);
                            }}
                          >
                            <Users className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                            <span>{list.assignedToName || "Unassigned"}</span>
                          </button>
                        </TableCell>
                        <TableCell className="w-[180px]">
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>{picked} / {total} items</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(list.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(list.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>Workflow Actions</DropdownMenuLabel>
                              </DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedList(list);
                                  setSelectedPickerId(list.assigned_picker_id || "");
                                  setAssignOpen(true);
                                }}
                              >
                                <Users className="mr-2 h-4 w-4" /> Assign Picker
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(list.id, "PICKING")}
                                disabled={list.status === "PICKING" || list.status === "COMPLETED"}
                              >
                                <Clock className="mr-2 h-4 w-4" /> Mark In-Progress (Picking)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(list.id, "COMPLETED")}
                                disabled={list.status === "COMPLETED"}
                                className="text-emerald-600 font-medium"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" /> Mark Completed
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  toast.info(`Printing pick list ${list.pick_list_number || list.id}...`);
                                  window.print();
                                }}
                              >
                                <Printer className="mr-2 h-4 w-4" /> Print Sheet
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Wave Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Wave Pick List</DialogTitle>
            <DialogDescription>
              Group unfulfilled orders into a batch picking wave for warehouse floor execution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Warehouse</label>
              <Select value={selectedWarehouseId} onValueChange={(val) => setSelectedWarehouseId(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} {w.code ? `(${w.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border p-3 bg-muted/20 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Orders</span>
                <span className="font-semibold">{pendingCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pick Strategy</span>
                <span className="font-medium">Zone Batch Routing</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateWave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Wave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Picker Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Staff Picker</DialogTitle>
            <DialogDescription>
              Allocate this pick batch to an active floor picker.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Staff Member</label>
              <Select value={selectedPickerId} onValueChange={(val) => setSelectedPickerId(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select picker..." />
                </SelectTrigger>
                <SelectContent>
                  {pickers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.email ? `(${p.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignPicker} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Picker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
