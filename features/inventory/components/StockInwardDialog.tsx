"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PackagePlus,
  Barcode,
  FileSpreadsheet,
  Plus,
  Trash2,
  Printer,
  Download,
  Building2,
  Calendar,
  User,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Loader2,
  DollarSign,
  Boxes,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  createStockInwardAction,
  addStockAction,
} from "@/actions/inventory.actions";
import {
  getWarehouses,
  getVariants,
  getSupplierProfiles,
} from "@/app/actions/admin/procurement.actions";
import {
  printGRNChallan,
  numberToWordsBDT,
} from "@/features/inventory/utils/printGRNChallan";
import { ClientBarcode } from "@/components/ui/ClientBarcode";

export interface StockInwardDialogProps {
  inventory?: any[];
  allWarehouses?: any[];
  allVariants?: any[];
  allSuppliers?: any[];
  triggerButton?: React.ReactNode;
}

interface InwardRowItem {
  id: string;
  variantId: string;
  sku: string;
  name: string;
  attributes?: any;
  currentStock: number;
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  updateCostPrice: boolean;
}

const INWARD_TYPE_LABELS: Record<string, string> = {
  PURCHASE_RECEIPT: "Purchase Receipt (Supplier PO)",
  FACTORY_PRODUCTION: "Factory Production Inward",
  TRANSFER_IN: "Inter-Warehouse Transfer",
  CUSTOMER_RETURN: "Customer Return Restock",
  INITIAL_STOCK: "Initial Opening Stock",
  CORRECTION: "Physical Count Surplus",
};

const QUICK_REASON_LABELS: Record<string, string> = {
  RESTOCK: "Restock",
  PURCHASE_RECEIPT: "Purchase Receipt",
  RETURN: "Customer Return",
  CORRECTION: "Correction",
};

function generateGRNNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `GRN-${dateStr}-${randomSuffix}`;
}

export function StockInwardDialog({
  inventory = [],
  allWarehouses: initialWarehouses = [],
  allVariants: initialVariants = [],
  allSuppliers: initialSuppliers = [],
  triggerButton,
}: StockInwardDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("advanced");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [warehousesList, setWarehousesList] = useState<any[]>(initialWarehouses);
  const [variantsList, setVariantsList] = useState<any[]>(initialVariants);
  const [suppliersList, setSuppliersList] = useState<any[]>(initialSuppliers);

  useEffect(() => {
    if (initialWarehouses.length > 0) setWarehousesList(initialWarehouses);
  }, [initialWarehouses]);

  useEffect(() => {
    if (initialVariants.length > 0) setVariantsList(initialVariants);
  }, [initialVariants]);

  useEffect(() => {
    if (initialSuppliers.length > 0) setSuppliersList(initialSuppliers);
  }, [initialSuppliers]);

  // Load if any are empty
  useEffect(() => {
    if (warehousesList.length === 0) {
      getWarehouses().then((res) => {
        if (res.success && res.data) setWarehousesList(res.data);
      });
    }
    if (variantsList.length === 0) {
      getVariants().then((res) => {
        if (res.success && res.data) setVariantsList(res.data);
      });
    }
    if (suppliersList.length === 0) {
      getSupplierProfiles().then((res) => {
        if (res.success && res.data) setSuppliersList(res.data);
      });
    }
  }, []);

  const allWarehouses = warehousesList;
  const allVariants = variantsList;
  const allSuppliers = suppliersList;

  // GRN Header state
  const [inwardNumber, setInwardNumber] = useState(generateGRNNumber());
  const [warehouseId, setWarehouseId] = useState("");
  const [inwardType, setInwardType] = useState<
    "PURCHASE_RECEIPT" | "FACTORY_PRODUCTION" | "TRANSFER_IN" | "CUSTOMER_RETURN" | "INITIAL_STOCK" | "CORRECTION"
  >("PURCHASE_RECEIPT");
  const [supplierId, setSupplierId] = useState("none");
  const [batchNumber, setBatchNumber] = useState("");
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");

  // Barcode / SKU quick-scan input
  const [scanQuery, setScanQuery] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Multi-item rows
  const [rows, setRows] = useState<InwardRowItem[]>([]);

  // Post-submission GRN receipt modal
  const [completedGRN, setCompletedGRN] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Quick single-item form state
  const [quickVariantId, setQuickVariantId] = useState("");
  const [quickWarehouseId, setQuickWarehouseId] = useState("");
  const [quickQuantity, setQuickQuantity] = useState(1);
  const [quickReason, setQuickReason] = useState("RESTOCK");
  const [quickNotes, setQuickNotes] = useState("");

  // CSV Import state
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvLoading, setCsvLoading] = useState(false);

  // Synchronize initial default warehouse & variant
  useEffect(() => {
    if (!warehouseId && allWarehouses.length > 0) {
      setWarehouseId(allWarehouses[0].id);
      setQuickWarehouseId(allWarehouses[0].id);
    }
  }, [allWarehouses, warehouseId]);

  useEffect(() => {
    if (!quickVariantId && allVariants.length > 0) {
      setQuickVariantId(allVariants[0].id);
    }
  }, [allVariants, quickVariantId]);

  // Lookup map of inventory quantities per variant for selected warehouse
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of inventory) {
      if (inv.warehouse_id === warehouseId) {
        map.set(inv.variant_id, inv.quantity_available || 0);
      }
    }
    return map;
  }, [inventory, warehouseId]);

  // Handle open dialog
  const handleOpenDialog = () => {
    setInwardNumber(generateGRNNumber());
    const currentWh = warehouseId || allWarehouses[0]?.id || "";
    setWarehouseId(currentWh);
    setQuickWarehouseId(currentWh);

    if (allVariants.length > 0 && (!rows.length || !rows[0].variantId)) {
      const first = allVariants[0];
      setRows([
        {
          id: Math.random().toString(),
          variantId: first.id,
          sku: first.sku,
          name: first.product?.name || first.name || "Product",
          attributes: first.attributes,
          currentStock: stockMap.get(first.id) || 0,
          quantity: 1,
          unitCost: Number(first.product?.cost_price || first.product?.base_price || 0),
          batchNumber: "",
          updateCostPrice: true,
        },
      ]);
      setQuickVariantId(first.id);
    }
    setOpen(true);
  };

  // Add an item row
  const handleAddRow = () => {
    const defaultVar = allVariants[0];
    if (!defaultVar) return;
    setRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        variantId: defaultVar.id,
        sku: defaultVar.sku,
        name: defaultVar.product?.name || defaultVar.name || "Product",
        attributes: defaultVar.attributes,
        currentStock: stockMap.get(defaultVar.id) || 0,
        quantity: 1,
        unitCost: Number(defaultVar.product?.cost_price || defaultVar.product?.base_price || 0),
        batchNumber: batchNumber || "",
        updateCostPrice: true,
      },
    ]);
  };

  // Update a row field
  const handleRowChange = (id: string, field: keyof InwardRowItem, value: any) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === "variantId") {
          const matched = allVariants.find((v) => v.id === value);
          if (matched) {
            return {
              ...row,
              variantId: matched.id,
              sku: matched.sku,
              name: matched.product?.name || matched.name || "Product",
              attributes: matched.attributes,
              currentStock: stockMap.get(matched.id) || 0,
              unitCost: Number(matched.product?.cost_price || matched.product?.base_price || 0),
            };
          }
        }
        return { ...row, [field]: value };
      })
    );
  };

  // Remove a row
  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) {
      toast.warning("Inward document must have at least one line item.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Barcode / SKU quick-scanner handler
  const handleScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = scanQuery.trim().toLowerCase();
    if (!query) return;

    const matched = allVariants.find(
      (v) =>
        (v.sku && v.sku.toLowerCase() === query) ||
        (v.barcode && v.barcode.toLowerCase() === query) ||
        (v.sku && v.sku.toLowerCase().includes(query))
    );

    if (!matched) {
      toast.error(`No product variant matching "${scanQuery}" found.`);
      return;
    }

    const existingIndex = rows.findIndex((r) => r.variantId === matched.id);
    if (existingIndex >= 0) {
      setRows((prev) =>
        prev.map((r, idx) =>
          idx === existingIndex ? { ...r, quantity: r.quantity + 1 } : r
        )
      );
      toast.success(`Incremented quantity for ${matched.sku} (+1)`);
    } else {
      setRows((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          variantId: matched.id,
          sku: matched.sku,
          name: matched.product?.name || matched.name || "Product",
          attributes: matched.attributes,
          currentStock: stockMap.get(matched.id) || 0,
          quantity: 1,
          unitCost: Number(matched.product?.cost_price || matched.product?.base_price || 0),
          batchNumber: batchNumber || "",
          updateCostPrice: true,
        },
      ]);
      toast.success(`Added ${matched.sku} to inward slip`);
    }

    setScanQuery("");
    scanInputRef.current?.focus();
  };

  // Financial and quantity calculations
  const totalUnits = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  }, [rows]);

  const totalCost = useMemo(() => {
    return rows.reduce(
      (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0),
      0
    );
  }, [rows]);

  // Labels for dropdown displays
  const selectedWarehouse = allWarehouses.find((w) => w.id === warehouseId);
  const warehouseDisplayLabel = selectedWarehouse ? selectedWarehouse.name : "Select Warehouse";

  const selectedSupplier = allSuppliers.find((s) => s.id === supplierId);
  const supplierDisplayLabel =
    supplierId === "none" || !selectedSupplier
      ? "N/A (Direct / Internal)"
      : selectedSupplier.company_name;

  const quickVar = allVariants.find((v) => v.id === quickVariantId);
  const quickVarLabel = quickVar
    ? `${quickVar.sku} — ${quickVar.product?.name || quickVar.name || "Product"}`
    : "Select variant";

  const quickWh = allWarehouses.find((w) => w.id === quickWarehouseId);
  const quickWhLabel = quickWh ? quickWh.name : "Select warehouse";

  // Submit Advanced Inward
  const handleSubmitAdvancedInward = async () => {
    if (!warehouseId) {
      toast.error("Please select a destination warehouse.");
      return;
    }

    if (rows.length === 0 || totalUnits <= 0) {
      toast.error("Please enter at least one item with quantity greater than zero.");
      return;
    }

    setIsSubmitting(true);
    const res = await createStockInwardAction({
      inwardNumber,
      warehouseId,
      inwardType,
      supplierId: supplierId !== "none" ? supplierId : undefined,
      receivedDate,
      receivedBy,
      notes,
      items: rows.map((r) => ({
        variantId: r.variantId,
        sku: r.sku,
        name: r.name,
        quantity: Number(r.quantity),
        unitCost: Number(r.unitCost),
        batchNumber: r.batchNumber || batchNumber || undefined,
        updateCostPrice: r.updateCostPrice,
      })),
    });
    setIsSubmitting(false);

    if (!res.success || !res.data) {
      toast.error(res.error || "Failed to process stock inward.");
    } else {
      toast.success(
        `Stock Inward ${res.data.inwardNumber} completed successfully!`
      );
      setCompletedGRN({
        ...res.data,
        warehouseName: selectedWarehouse?.name || "Warehouse",
        supplierName:
          selectedSupplier?.company_name ||
          (inwardType === "FACTORY_PRODUCTION"
            ? "Internal Manufacturing"
            : "Direct Inward"),
        inwardType: INWARD_TYPE_LABELS[inwardType] || inwardType,
        receivedBy: receivedBy || "Store In-Charge",
        notes,
      });
      setOpen(false);
      setShowReceipt(true);
      router.refresh();
    }
  };

  // Submit Quick Inward
  const handleSubmitQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVariantId) {
      toast.error("Please select a product variant.");
      return;
    }
    if (!quickWarehouseId) {
      toast.error("Please select a destination warehouse.");
      return;
    }
    if (quickQuantity <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    const res = await addStockAction({
      variantId: quickVariantId,
      warehouseId: quickWarehouseId,
      quantity: Number(quickQuantity),
      reason: quickReason,
      notes: quickNotes,
    });
    setIsSubmitting(false);

    if (!res.success) {
      toast.error("Failed to add stock", { description: res.error });
    } else {
      toast.success(`Successfully added ${quickQuantity} unit(s) to stock.`);
      setOpen(false);
      router.refresh();
    }
  };

  // CSV Template download
  const handleDownloadTemplate = () => {
    const sampleSku1 = allVariants[0]?.sku || "TSHIRT-BLK-M";
    const sampleSku2 = allVariants[1]?.sku || "JEANS-BLU-32";
    const csvContent = `sku,quantity,unit_cost,lot_number,notes\n${sampleSku1},50,450.00,LOT-2026-F1,Initial Batch\n${sampleSku2},25,850.00,LOT-2026-F1,Denim Delivery`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "stock_inward_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info("Sample CSV template downloaded.");
  };

  // CSV File upload & parsing
  const handleCsvUpload = (file: File) => {
    setCsvLoading(true);
    setCsvErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text
          .split(/\r\n|\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length <= 1) {
          setCsvErrors(["CSV file is empty or missing data rows."]);
          setCsvLoading(false);
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const skuIdx = headers.indexOf("sku");
        const qtyIdx = headers.indexOf("quantity");
        const costIdx = headers.indexOf("unit_cost");
        const lotIdx = headers.indexOf("lot_number");
        const notesIdx = headers.indexOf("notes");

        if (skuIdx === -1 || qtyIdx === -1) {
          setCsvErrors(["CSV header must contain 'sku' and 'quantity' columns."]);
          setCsvLoading(false);
          return;
        }

        const parsedRows: any[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          const sku = cols[skuIdx];
          const qty = parseInt(cols[qtyIdx], 10);
          const cost = costIdx !== -1 ? parseFloat(cols[costIdx]) || 0 : 0;
          const lot = lotIdx !== -1 ? cols[lotIdx] : "";
          const rowNote = notesIdx !== -1 ? cols[notesIdx] : "";

          if (!sku) continue;

          const matchedVar = allVariants.find(
            (v) => v.sku && v.sku.toLowerCase() === sku.toLowerCase()
          );

          if (!matchedVar) {
            errors.push(`Row ${i + 1}: SKU "${sku}" does not exist in catalog.`);
            continue;
          }

          if (isNaN(qty) || qty <= 0) {
            errors.push(`Row ${i + 1}: Invalid quantity for SKU "${sku}".`);
            continue;
          }

          parsedRows.push({
            id: Math.random().toString(),
            variantId: matchedVar.id,
            sku: matchedVar.sku,
            name: matchedVar.product?.name || matchedVar.name || "Product",
            attributes: matchedVar.attributes,
            currentStock: stockMap.get(matchedVar.id) || 0,
            quantity: qty,
            unitCost: cost || Number(matchedVar.product?.cost_price || matchedVar.product?.base_price || 0),
            batchNumber: lot,
            notes: rowNote,
            updateCostPrice: cost > 0,
          });
        }

        setCsvPreview(parsedRows);
        setCsvErrors(errors);
        setCsvLoading(false);
      } catch (err: any) {
        setCsvErrors(["Failed to parse CSV: " + err.message]);
        setCsvLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // Commit CSV to Inward Table
  const handleCommitCsvToTable = () => {
    if (csvPreview.length === 0) {
      toast.error("No valid CSV items to import.");
      return;
    }
    setRows(csvPreview);
    setActiveTab("advanced");
    toast.success(
      `Imported ${csvPreview.length} items from CSV into Inward Table.`
    );
  };

  return (
    <>
      {/* Trigger Button */}
      {triggerButton ? (
        <div onClick={handleOpenDialog}>{triggerButton}</div>
      ) : (
        <Button
          onClick={handleOpenDialog}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-semibold"
        >
          <PackagePlus className="mr-2 h-4 w-4" /> Stock Inward / Add Stock
        </Button>
      )}

      {/* Main Inward Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[940px] w-[96vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <PackagePlus className="h-5 w-5 text-primary" />
                  Stock Inward & Goods Received (GRN)
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Receive inbound shipments, production batches, and supplier deliveries with full audit trail.
                </DialogDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-1">
                {inwardNumber}
              </Badge>
            </div>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-4 sm:px-5 pt-2 border-b bg-muted/10">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="advanced" className="text-xs sm:text-sm font-medium">
                  <Boxes className="mr-1.5 h-4 w-4" /> Batch GRN Inward
                </TabsTrigger>
                <TabsTrigger value="quick" className="text-xs sm:text-sm font-medium">
                  <Plus className="mr-1.5 h-4 w-4" /> Quick Single Add
                </TabsTrigger>
                <TabsTrigger value="csv" className="text-xs sm:text-sm font-medium">
                  <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Bulk CSV Import
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: ADVANCED MULTI-ITEM GRN */}
            <TabsContent
              value="advanced"
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 m-0"
            >
              {allWarehouses.length === 0 && (
                <div className="p-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>No active warehouses found. Please create a warehouse in Warehouse Management first.</span>
                </div>
              )}

              {/* Spacious 3-Column Header Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 rounded-xl border bg-card/70 text-xs shadow-xs">
                {/* Row 1 */}
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Document # / Challan
                  </Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      value={inwardNumber}
                      onChange={(e) => setInwardNumber(e.target.value)}
                      placeholder="GRN-YYYYMMDD-XXXX"
                      className="h-9 text-xs font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => setInwardNumber(generateGRNNumber())}
                      title="Generate new document #"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Inward Nature / Reason
                  </Label>
                  <Select
                    value={inwardType}
                    onValueChange={(val: any) => setInwardType(val)}
                  >
                    <SelectTrigger className="w-full h-9 mt-1 text-xs">
                      <SelectValue placeholder="Select Inward Nature" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[240px]">
                      {Object.entries(INWARD_TYPE_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Destination Warehouse *
                  </Label>
                  <Select
                    value={warehouseId}
                    onValueChange={(val) => setWarehouseId(val || "")}
                  >
                    <SelectTrigger className="w-full h-9 mt-1 text-xs font-medium">
                      <SelectValue placeholder="Select Warehouse" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[220px]">
                      {allWarehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Row 2 */}
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Supplier / Vendor
                  </Label>
                  <Select value={supplierId} onValueChange={(val) => setSupplierId(val || "")}>
                    <SelectTrigger className="w-full h-9 mt-1 text-xs">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[240px]">
                      <SelectItem value="none">N/A (Direct / Internal)</SelectItem>
                      {allSuppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Batch / Lot Number
                  </Label>
                  <Input
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g. LOT-2026-F1"
                    className="h-9 mt-1 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Received Date
                  </Label>
                  <Input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="h-9 mt-1 text-xs"
                  />
                </div>

                {/* Row 3 */}
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Received / Inspected By
                  </Label>
                  <Input
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Inspector name"
                    className="h-9 mt-1 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Notes / Remarks
                  </Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Carrier, Challan #, Truck details..."
                    className="h-9 mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Barcode & SKU Fast Scanner Input */}
              <form
                onSubmit={handleScanSubmit}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed bg-muted/20"
              >
                <Barcode className="h-5 w-5 text-primary ml-1 shrink-0" />
                <Input
                  ref={scanInputRef}
                  value={scanQuery}
                  onChange={(e) => setScanQuery(e.target.value)}
                  placeholder="Scan barcode with scanner or type SKU and press Enter..."
                  className="h-9 text-xs font-mono flex-1 bg-background"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  className="h-9 px-3.5 text-xs font-medium"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Scan & Add
                </Button>
              </form>

              {/* Multi-Item Inward Table */}
              <div className="border rounded-lg overflow-x-auto max-h-[260px] sm:max-h-[300px]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10 text-xs">
                    <TableRow>
                      <TableHead className="min-w-[280px]">Product / Variant</TableHead>
                      <TableHead className="w-[90px] text-center">On-Hand</TableHead>
                      <TableHead className="w-[130px]">Qty Received</TableHead>
                      <TableHead className="w-[110px]">Unit Cost</TableHead>
                      <TableHead className="w-[120px] text-right">Line Total</TableHead>
                      <TableHead className="w-[120px]">Lot #</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {rows.map((row) => {
                      const lineTotal =
                        (Number(row.quantity) || 0) * (Number(row.unitCost) || 0);
                      const projectedTotal = row.currentStock + (Number(row.quantity) || 0);
                      const rowVariantLabel = row.sku ? `${row.sku} — ${row.name}` : "Select Variant";

                      return (
                        <TableRow key={row.id}>
                          <TableCell className="p-2">
                            <Select
                              value={row.variantId}
                              onValueChange={(val) =>
                                handleRowChange(row.id, "variantId", val)
                              }
                            >
                              <SelectTrigger className="w-full h-9 text-xs">
                                <SelectValue placeholder="Select Variant" />
                              </SelectTrigger>
                              <SelectContent className="min-w-[320px] max-h-[250px]">
                                {allVariants.map((v) => {
                                  const pName = v.product?.name || v.name || "Product";
                                  return (
                                    <SelectItem key={v.id} value={v.id}>
                                      {v.sku} — {pName}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            {row.attributes && typeof row.attributes === "object" && (
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {Object.entries(row.attributes)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(", ")}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="text-center font-mono font-medium p-2">
                            <span className="text-muted-foreground">
                              {row.currentStock}
                            </span>
                            <span className="text-emerald-600 ml-1 text-[11px] font-bold">
                              → {projectedTotal}
                            </span>
                          </TableCell>

                          <TableCell className="p-2">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={1}
                                value={row.quantity}
                                onChange={(e) =>
                                  handleRowChange(
                                    row.id,
                                    "quantity",
                                    parseInt(e.target.value, 10) || 0
                                  )
                                }
                                className="h-9 w-16 text-center font-bold text-xs"
                              />
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRowChange(
                                      row.id,
                                      "quantity",
                                      row.quantity + 5
                                    )
                                  }
                                  className="text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-muted/80 font-medium"
                                  title="Add 5"
                                >
                                  +5
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRowChange(
                                      row.id,
                                      "quantity",
                                      row.quantity + 10
                                    )
                                  }
                                  className="text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-muted/80 font-medium"
                                  title="Add 10"
                                >
                                  +10
                                </button>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={row.unitCost}
                              onChange={(e) =>
                                handleRowChange(
                                  row.id,
                                  "unitCost",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-9 font-mono text-xs"
                            />
                          </TableCell>

                          <TableCell className="text-right font-mono font-semibold p-2">
                            BDT {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>

                          <TableCell className="p-2">
                            <Input
                              value={row.batchNumber || ""}
                              onChange={(e) =>
                                handleRowChange(row.id, "batchNumber", e.target.value)
                              }
                              placeholder={batchNumber || "Lot #"}
                              className="h-9 text-xs font-mono"
                            />
                          </TableCell>

                          <TableCell className="p-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRow(row.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Action row to add items */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRow}
                  className="h-9 text-xs font-medium"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Another Line Item
                </Button>

                {/* Summary Metrics Bar */}
                <div className="flex items-center gap-3 bg-muted/40 px-3.5 py-1.5 rounded-lg border text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">SKUs:</span>
                    <span className="font-bold">{rows.length}</span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Units:</span>
                    <span className="font-bold text-primary font-mono text-sm">
                      {totalUnits}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Valuation:</span>
                    <span className="font-bold font-mono text-sm text-emerald-600">
                      BDT {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: QUICK SINGLE-ITEM */}
            <TabsContent value="quick" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 m-0">
              <div className="max-w-md mx-auto space-y-4 border rounded-xl p-5 bg-card shadow-xs">
                <div>
                  <Label className="text-xs font-semibold">Product Variant *</Label>
                  <Select
                    value={quickVariantId}
                    onValueChange={(val) => setQuickVariantId(val || "")}
                  >
                    <SelectTrigger className="w-full mt-1 text-xs h-9">
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[320px] max-h-[250px]">
                      {allVariants.map((v) => {
                        const pName = v.product?.name || v.name || "Product";
                        return (
                          <SelectItem key={v.id} value={v.id}>
                            {v.sku} — {pName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Destination Warehouse *</Label>
                  <Select
                    value={quickWarehouseId}
                    onValueChange={(val) => setQuickWarehouseId(val || "")}
                  >
                    <SelectTrigger className="w-full mt-1 text-xs h-9">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[240px]">
                      {allWarehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Quantity to Add *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quickQuantity}
                      onChange={(e) =>
                        setQuickQuantity(parseInt(e.target.value, 10) || 1)
                      }
                      className="mt-1 font-bold h-9 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Reason</Label>
                    <Select
                      value={quickReason}
                      onValueChange={(val) => setQuickReason(val || "PURCHASE_RECEIPT")}
                    >
                      <SelectTrigger className="w-full mt-1 text-xs h-9">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent className="min-w-[200px]">
                        {Object.entries(QUICK_REASON_LABELS).map(([val, lbl]) => (
                          <SelectItem key={val} value={val}>
                            {lbl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Notes (Optional)</Label>
                  <Textarea
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    placeholder="Reason or invoice reference details..."
                    rows={2}
                    className="mt-1 resize-none text-xs"
                  />
                </div>

                <Button
                  onClick={handleSubmitQuick}
                  disabled={isSubmitting}
                  className="w-full font-semibold h-9 text-xs"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Stock Immediately
                </Button>
              </div>
            </TabsContent>

            {/* TAB 3: BULK CSV IMPORT */}
            <TabsContent value="csv" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 m-0">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                  <div>
                    <h4 className="font-semibold text-sm">Bulk Inward Spreadsheet Template</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Download our pre-formatted CSV template with sku, quantity, and cost columns.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                  >
                    <Download className="mr-1.5 h-4 w-4" /> Download Template
                  </Button>
                </div>

                <div className="border-2 border-dashed rounded-xl p-6 text-center space-y-2 hover:bg-muted/10 transition-colors">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Upload Inbound CSV File</p>
                    <p className="text-xs text-muted-foreground">
                      Drag & drop your CSV file here, or click to browse
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleCsvUpload(e.target.files[0]);
                      }
                    }}
                    className="cursor-pointer text-xs"
                  />
                </div>

                {csvLoading && (
                  <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing and validating CSV catalog matches...
                  </div>
                )}

                {csvErrors.length > 0 && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 space-y-1 text-xs text-destructive">
                    <div className="font-bold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Validation Issues:
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {csvErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {csvPreview.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {csvPreview.length} items successfully validated
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCommitCsvToTable}
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" /> Load Items into Inward Table
                      </Button>
                    </div>

                    <div className="border rounded-lg max-h-[220px] overflow-auto">
                      <Table className="text-xs">
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead>Lot</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvPreview.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono font-bold text-primary">
                                {item.sku}
                              </TableCell>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right font-bold">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                BDT {item.unitCost}
                              </TableCell>
                              <TableCell className="font-mono text-muted-foreground">
                                {item.batchNumber || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="p-3 sm:p-4 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            {activeTab === "advanced" && (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmitAdvancedInward}
                disabled={isSubmitting || totalUnits <= 0}
                className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording Inward...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Confirm & Complete Inward ({totalUnits} units)
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-Submission Printable Goods Received Note (GRN) Dialog */}
      {completedGRN && (
        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent className="sm:max-w-[860px] w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
            {/* Modal Bar */}
            <DialogHeader className="p-4 border-b bg-background flex flex-row items-center justify-between shrink-0">
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                  <Printer className="h-5 w-5 text-primary" />
                  Official Inward Challan & Goods Received Note (GRN)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Document generated and verified in stock ledger. Ready for printing or archiving.
                </DialogDescription>
              </div>
              <Button
                size="sm"
                onClick={() => printGRNChallan(completedGRN)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
              >
                <Printer className="mr-1.5 h-4 w-4" /> Print GRN Challan
              </Button>
            </DialogHeader>

            {/* Scrollable Document Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center">
              <div
                id="grn-printable-voucher"
                className="w-full max-w-[780px] bg-white text-slate-900 border border-slate-200 shadow-md rounded-lg p-6 sm:p-8 space-y-5 print:p-0 print:border-0 print:shadow-none"
              >
                {/* 1. Letterhead / Company Header */}
                <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-5 gap-4">
                  <div>
                    <h1 className="text-2xl font-black tracking-wider text-slate-950 uppercase">
                      ANCHOR FASHION
                    </h1>
                    <p className="text-[11px] font-bold tracking-widest text-slate-600 uppercase mt-0.5">
                      Central Logistics & Warehouse Distribution Hub
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Plot # 42, Sector 7, Uttara Model Town, Dhaka-1230, Bangladesh<br />
                      Direct: +880 9612-ANCHOR | Email: inventory@anchorfashion.com<br />
                      VAT / BIN Registration: <strong className="font-mono text-slate-700">002948192-0101</strong>
                    </p>
                  </div>

                  <div className="flex flex-col items-end text-right">
                    <div className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-1 rounded">
                      Goods Received Note (GRN)
                    </div>
                    <div className="mt-2">
                      <ClientBarcode
                        value={completedGRN.inwardNumber}
                        width={1.3}
                        height={34}
                        fontSize={11}
                        margin={0}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      Date: <strong className="text-slate-800">{new Date(completedGRN.receivedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</strong> | Time: <strong className="text-slate-800">{new Date(completedGRN.receivedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</strong>
                    </p>
                    <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1 border border-emerald-200">
                      ● STATUS: VERIFIED & RESTOCKED
                    </span>
                  </div>
                </div>

                {/* 2. Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Left: Destination Info */}
                  <div className="border border-slate-200 rounded-md p-3 bg-slate-50/70">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                      Destination & Inward Details
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Destination Warehouse:</span>
                        <span className="font-bold text-slate-900">{completedGRN.warehouseName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Inward Nature:</span>
                        <span className="font-bold text-slate-900">{completedGRN.inwardType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Received Date:</span>
                        <span className="font-semibold text-slate-900">
                          {new Date(completedGRN.receivedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Received / Inspected By:</span>
                        <span className="font-semibold text-slate-900">{completedGRN.receivedBy || "Store In-Charge"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Source & Shipment Info */}
                  <div className="border border-slate-200 rounded-md p-3 bg-slate-50/70">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                      Source & Shipment Reference
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Supplier / Source:</span>
                        <span className="font-bold text-slate-900">{completedGRN.supplierName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Document Reference:</span>
                        <span className="font-medium text-slate-900 truncate max-w-[200px]" title={completedGRN.notes}>
                          {completedGRN.notes || "Direct Warehouse Inward"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Unique SKUs:</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {completedGRN.items?.length || 0} Line Items
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Physical Units:</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {completedGRN.totalQuantity} Units
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Itemized Received Goods Table */}
                <div className="border border-slate-300 rounded-md overflow-hidden">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-900 text-white">
                      <TableRow className="hover:bg-slate-900">
                        <TableHead className="w-[35px] text-white font-bold text-center">#</TableHead>
                        <TableHead className="w-[120px] text-white font-bold">SKU Code</TableHead>
                        <TableHead className="text-white font-bold">Item Description & Specs</TableHead>
                        <TableHead className="w-[80px] text-white font-bold text-center">Lot #</TableHead>
                        <TableHead className="w-[65px] text-white font-bold text-center">Prev Qty</TableHead>
                        <TableHead className="w-[75px] text-white font-bold text-center bg-slate-800">Inward Qty</TableHead>
                        <TableHead className="w-[65px] text-white font-bold text-center">New Qty</TableHead>
                        <TableHead className="w-[85px] text-white font-bold text-right">Unit Cost</TableHead>
                        <TableHead className="w-[95px] text-white font-bold text-right">Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedGRN.items?.map((item: any, idx: number) => {
                        const attrStr =
                          item.attributes && typeof item.attributes === "object"
                            ? Object.entries(item.attributes)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" | ")
                            : "";

                        return (
                          <TableRow
                            key={idx}
                            className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}
                          >
                            <TableCell className="text-center font-mono text-slate-400 p-2">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-slate-900 p-2">
                              {item.sku}
                            </TableCell>
                            <TableCell className="p-2">
                              <div className="font-semibold text-slate-900">{item.name}</div>
                              {attrStr && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  {attrStr}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-mono text-slate-600 p-2">
                              {item.batchNumber || "—"}
                            </TableCell>
                            <TableCell className="text-center font-mono text-slate-400 p-2">
                              {item.previousQuantity ?? "—"}
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold text-emerald-700 bg-emerald-50/60 p-2">
                              +{item.quantity}
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold text-slate-800 p-2">
                              {item.newQuantity ?? "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-700 p-2">
                              {Number(item.unitCost || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-900 p-2">
                              {Number(item.lineTotal || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-900">
                        <TableCell colSpan={4} className="text-right font-extrabold uppercase text-[11px] p-2.5">
                          Grand Totals:
                        </TableCell>
                        <TableCell className="text-center font-mono text-slate-400 p-2.5">—</TableCell>
                        <TableCell className="text-center font-mono text-emerald-700 font-extrabold text-sm p-2.5">
                          +{completedGRN.totalQuantity}
                        </TableCell>
                        <TableCell className="text-center font-mono text-slate-400 p-2.5">—</TableCell>
                        <TableCell className="text-right font-mono text-slate-400 p-2.5">—</TableCell>
                        <TableCell className="text-right font-mono font-extrabold text-slate-950 text-sm p-2.5">
                          BDT {completedGRN.totalCost?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* 4. Valuation & Amount in Words */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-slate-200 rounded-md p-3.5 bg-slate-50 gap-3">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                      Amount in Words (BDT)
                    </div>
                    <div className="text-xs font-bold text-slate-900 italic mt-0.5">
                      {numberToWordsBDT(completedGRN.totalCost || 0)}
                    </div>
                  </div>
                  <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
                    <div className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                      Total Inward Valuation
                    </div>
                    <div className="text-lg font-black font-mono text-slate-950">
                      BDT {completedGRN.totalCost?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* 5. Inspection Certification Statement */}
                <div className="border-l-4 border-slate-900 bg-slate-50 p-2.5 text-[10px] text-slate-600 leading-relaxed rounded-r">
                  <strong className="text-slate-900 uppercase tracking-wide">Inspection & Receiving Certification:</strong> I hereby certify that the merchandise enumerated above has been physically counted, inspected for fabric/stitching quality, verified against accompanying delivery challan/PO, and posted into the Anchor Fashion inventory system with full serial traceability.
                </div>

                {/* 6. Physical Sign-off Blocks (4 Columns) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-300 text-center text-xs">
                  <div>
                    <div className="h-10"></div>
                    <div className="border-t border-dashed border-slate-400 pt-1.5 mb-1"></div>
                    <p className="font-extrabold text-slate-900 uppercase text-[10px]">Received By</p>
                    <p className="text-[9px] text-slate-500">Warehouse Storekeeper</p>
                    <p className="text-[8px] text-slate-400 mt-1">Date: ______________</p>
                  </div>
                  <div>
                    <div className="h-10"></div>
                    <div className="border-t border-dashed border-slate-400 pt-1.5 mb-1"></div>
                    <p className="font-extrabold text-slate-900 uppercase text-[10px]">QA Inspected By</p>
                    <p className="text-[9px] text-slate-500">Quality Assurance Officer</p>
                    <p className="text-[8px] text-slate-400 mt-1">Date: ______________</p>
                  </div>
                  <div>
                    <div className="h-10"></div>
                    <div className="border-t border-dashed border-slate-400 pt-1.5 mb-1"></div>
                    <p className="font-extrabold text-slate-900 uppercase text-[10px]">Delivered By</p>
                    <p className="text-[9px] text-slate-500">Supplier / Driver Agent</p>
                    <p className="text-[8px] text-slate-400 mt-1">Date: ______________</p>
                  </div>
                  <div>
                    <div className="h-10"></div>
                    <div className="border-t border-dashed border-slate-400 pt-1.5 mb-1"></div>
                    <p className="font-extrabold text-slate-900 uppercase text-[10px]">Approved By</p>
                    <p className="text-[9px] text-slate-500">Warehouse / IMS Manager</p>
                    <p className="text-[8px] text-slate-400 mt-1">Date: ______________</p>
                  </div>
                </div>

                {/* 7. Document Footer */}
                <div className="border-t border-slate-200 pt-2 flex flex-col sm:flex-row items-center justify-between text-[9px] text-slate-400 gap-1">
                  <span>Anchor Fashion Enterprise IMS • Central Distribution Hub</span>
                  <span>Official Commercial Inward Voucher (Valid without manual seal)</span>
                  <span>Page 1 of 1</span>
                </div>
              </div>
            </div>

            {/* Bottom Footer Bar */}
            <DialogFooter className="p-4 border-t bg-background flex flex-row items-center justify-between shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReceipt(false)}
              >
                Close Preview
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => printGRNChallan(completedGRN)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                >
                  <Printer className="mr-1.5 h-4 w-4" /> Print GRN Challan (A4)
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
