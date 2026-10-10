"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Search,
  Plus,
  Filter,
  Eye,
  CheckCircle2,
  Send,
  PackageCheck,
  XCircle,
  Clock,
  Loader2,
  FileText,
  Building2,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updateProcurementOrderStatus,
  receiveProcurementOrderAction,
  getProcurementOrderDetails,
} from "@/app/actions/admin/procurement.actions";
import { toast } from "sonner";

interface PurchaseOrdersClientProps {
  pos: any[];
}

export function PurchaseOrdersClient({ pos = [] }: PurchaseOrdersClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // View details sheet
  const [selectedPo, setSelectedPo] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<any | null>(null);

  // GRN Receive dialog
  const [receivePo, setReceivePo] = useState<any | null>(null);
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveLoading, setReceiveLoading] = useState(false);

  // Status update loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredPos = useMemo(() => {
    return pos.filter((po) => {
      const poNum = po.po_number?.toLowerCase() || "";
      const supplierName = (
        Array.isArray(po.supplier_profiles)
          ? po.supplier_profiles[0]?.company_name
          : po.supplier_profiles?.company_name || ""
      ).toLowerCase();
      const warehouseName = (
        Array.isArray(po.warehouses)
          ? po.warehouses[0]?.name
          : po.warehouses?.name || ""
      ).toLowerCase();
      const q = search.toLowerCase();

      const matchesSearch = !search || poNum.includes(q) || supplierName.includes(q) || warehouseName.includes(q);
      const matchesStatus = statusFilter === "ALL" || po.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [pos, search, statusFilter]);

  const handleOpenDetails = async (po: any) => {
    setSelectedPo(po);
    setDetailsLoading(true);
    const res = await getProcurementOrderDetails(po.id);
    setDetailsLoading(false);
    if (res.success && res.data) {
      setDetailsData(res.data);
    } else {
      setDetailsData(po);
    }
  };

  const handleStatusChange = async (
    poId: string,
    newStatus: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SENT" | "PARTIAL_RECEIPT" | "DELIVERED" | "CANCELLED"
  ) => {
    setActionLoading(poId);
    const res = await updateProcurementOrderStatus(poId, newStatus);
    setActionLoading(null);
    if (res.success) {
      toast.success(`Purchase order marked as ${newStatus}`);
      if (selectedPo && selectedPo.id === poId) {
        setSelectedPo({ ...selectedPo, status: newStatus });
      }
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update status");
    }
  };

  const handleConfirmReceive = async () => {
    if (!receivePo) return;
    setReceiveLoading(true);
    const res = await receiveProcurementOrderAction(receivePo.id, receiveNotes);
    setReceiveLoading(false);

    if (res.success) {
      toast.success("Goods received successfully! Stock has been updated.");
      setReceivePo(null);
      setReceiveNotes("");
      if (selectedPo && selectedPo.id === receivePo.id) {
        setSelectedPo(null);
      }
      router.refresh();
    } else {
      toast.error(res.error || "Failed to receive goods");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline">Draft</Badge>;
      case "PENDING_APPROVAL":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Pending Approval
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-700">
            Approved
          </Badge>
        );
      case "SENT":
        return (
          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
            Sent to Supplier
          </Badge>
        );
      case "PARTIAL_RECEIPT":
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            Partial Receipt
          </Badge>
        );
      case "DELIVERED":
      case "FULFILLED":
        return (
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
            Received (GRN)
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
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-muted-foreground">
            Manage supplier procurement orders, approval workflows, and goods receiving (GRN).
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/inventory/purchases/new">
            <Plus className="mr-2 h-4 w-4" /> Create Purchase Order
          </Link>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PO number, supplier, warehouse..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="SENT">Sent to Supplier</SelectItem>
              <SelectItem value="DELIVERED">Received (GRN)</SelectItem>
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

      {/* PO Table */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Expected Date</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPos.map((po) => {
              const supplierName =
                (Array.isArray(po.supplier_profiles)
                  ? po.supplier_profiles[0]?.company_name
                  : po.supplier_profiles?.company_name) || "N/A";
              const warehouseName =
                (Array.isArray(po.warehouses)
                  ? po.warehouses[0]?.name
                  : po.warehouses?.name) || "N/A";

              return (
                <TableRow key={po.id}>
                  <TableCell className="font-medium font-mono">
                    <button
                      onClick={() => handleOpenDetails(po)}
                      className="text-primary hover:underline font-semibold"
                    >
                      {po.po_number}
                    </button>
                  </TableCell>
                  <TableCell>{supplierName}</TableCell>
                  <TableCell>{warehouseName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {po.expected_delivery_date
                      ? format(new Date(po.expected_delivery_date), "MMM d, yyyy")
                      : "TBD"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    BDT {Number(po.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{getStatusBadge(po.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetails(po)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                      </Button>

                      {po.status === "DRAFT" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionLoading === po.id}
                          onClick={() => handleStatusChange(po.id, "APPROVED")}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                          Approve
                        </Button>
                      )}

                      {po.status === "APPROVED" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionLoading === po.id}
                          onClick={() => handleStatusChange(po.id, "SENT")}
                        >
                          <Send className="mr-1 h-3.5 w-3.5 text-blue-600" />
                          Send
                        </Button>
                      )}

                      {(po.status === "SENT" || po.status === "APPROVED") && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => setReceivePo(po)}
                        >
                          <PackageCheck className="mr-1 h-3.5 w-3.5" />
                          Receive GRN
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredPos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p>No purchase orders found.</p>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/admin/inventory/purchases/new">
                        <Plus className="mr-1.5 h-4 w-4" /> Create First PO
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PO Details Sheet */}
      <Sheet open={!!selectedPo} onOpenChange={(open) => !open && setSelectedPo(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold font-mono">
                {selectedPo?.po_number}
              </SheetTitle>
              {selectedPo && getStatusBadge(selectedPo.status)}
            </div>
            <SheetDescription>
              Procurement order specifications, line items, and fulfillment history.
            </SheetDescription>
          </SheetHeader>

          {detailsLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading purchase order details...</p>
            </div>
          ) : detailsData ? (
            <div className="space-y-6 pt-4">
              {/* Partner & Warehouse Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 bg-muted/20">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Building2 className="h-3.5 w-3.5" /> Supplier
                  </div>
                  <p className="font-semibold text-sm">
                    {detailsData.supplier_profiles?.company_name || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {detailsData.supplier_profiles?.contact_person}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {detailsData.supplier_profiles?.email || detailsData.supplier_profiles?.phone}
                  </p>
                </div>

                <div className="rounded-lg border p-3 bg-muted/20">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <WarehouseIcon className="h-3.5 w-3.5" /> Destination
                  </div>
                  <p className="font-semibold text-sm">
                    {detailsData.warehouses?.name || "N/A"}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {detailsData.warehouses?.code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expected: {detailsData.expected_delivery_date ? format(new Date(detailsData.expected_delivery_date), "MMM d, yyyy") : "TBD"}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Line Items</h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Product Variant</TableHead>
                        <TableHead className="text-xs text-right">Qty</TableHead>
                        <TableHead className="text-xs text-right">Unit Cost</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailsData.items?.map((item: any) => {
                        const variantName = item.variants?.name || "Product Variant";
                        const variantSku = item.variants?.sku || item.variant_id;
                        const lineTotal = Number(item.total_cost || (item.quantity_ordered * item.unit_cost) || 0);

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs">
                              <p className="font-medium">{variantName}</p>
                              <p className="font-mono text-muted-foreground text-[10px]">{variantSku}</p>
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold">
                              {item.quantity_ordered}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              BDT {Number(item.unit_cost || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold">
                              BDT {lineTotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!detailsData.items || detailsData.items.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                            No item breakdown records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="rounded-lg border bg-muted/10 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Grand Total</span>
                  <span className="text-primary">
                    BDT {Number(detailsData.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {detailsData.notes && (
                  <p className="text-xs text-muted-foreground pt-1 border-t">
                    Note: {detailsData.notes}
                  </p>
                )}
              </div>

              {/* Status Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {detailsData.status === "DRAFT" && (
                  <Button
                    className="flex-1"
                    onClick={() => handleStatusChange(detailsData.id, "APPROVED")}
                    disabled={actionLoading === detailsData.id}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Purchase Order
                  </Button>
                )}

                {detailsData.status === "APPROVED" && (
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleStatusChange(detailsData.id, "SENT")}
                    disabled={actionLoading === detailsData.id}
                  >
                    <Send className="mr-2 h-4 w-4" /> Mark as Sent to Supplier
                  </Button>
                )}

                {(detailsData.status === "SENT" || detailsData.status === "APPROVED") && (
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      setReceivePo(detailsData);
                      setSelectedPo(null);
                    }}
                  >
                    <PackageCheck className="mr-2 h-4 w-4" /> Receive Goods (GRN)
                  </Button>
                )}

                {detailsData.status !== "CANCELLED" && detailsData.status !== "DELIVERED" && (
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleStatusChange(detailsData.id, "CANCELLED")}
                    disabled={actionLoading === detailsData.id}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" /> Cancel PO
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Goods Receipt (GRN) Dialog */}
      <Dialog open={!!receivePo} onOpenChange={(open) => !open && setReceivePo(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
              Goods Receipt Note (GRN)
            </DialogTitle>
            <DialogDescription>
              Confirm delivery of goods for PO <strong className="font-mono text-foreground">{receivePo?.po_number}</strong>. Stock will be added to the destination warehouse automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier:</span>
                <span className="font-semibold">
                  {(Array.isArray(receivePo?.supplier_profiles)
                    ? receivePo.supplier_profiles[0]?.company_name
                    : receivePo?.supplier_profiles?.company_name) || "Supplier"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Warehouse:</span>
                <span className="font-semibold">
                  {(Array.isArray(receivePo?.warehouses)
                    ? receivePo.warehouses[0]?.name
                    : receivePo?.warehouses?.name) || "Default Warehouse"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PO Total:</span>
                <span className="font-bold text-primary">
                  BDT {Number(receivePo?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Receipt Notes / Inspection Remarks</label>
              <Input
                placeholder="e.g. All cartons inspected, quality approved"
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReceivePo(null)}
              disabled={receiveLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleConfirmReceive}
              disabled={receiveLoading}
            >
              {receiveLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Goods Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
