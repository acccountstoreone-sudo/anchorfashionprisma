"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PackagePlus,
  ArrowRightLeft,
  Printer,
  Sparkles,
  Search,
  Filter,
  Download,
  Boxes,
  TrendingUp,
  Percent,
  DollarSign,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Barcode as BarcodeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { InventoryMasterIntakeDialog } from "@/components/admin/inventory/InventoryMasterIntakeDialog";
import { BranchTransferModal } from "@/components/admin/inventory/BranchTransferModal";
import { PrintBarcodeModal, BarcodeLabelData } from "@/components/admin/inventory/PrintBarcodeModal";
import { toggleProductPublishStatusAction } from "@/lib/actions/admin/inventory-master.actions";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/utils/export";

interface InventoryMasterHubClientProps {
  initialMasterData: any;
  initialBranchReport: any;
  initialFinancialReport: any;
  categories: Array<{ id: string; name: string }>;
  warehouses: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string; code?: string }>;
  allVariants: Array<{
    id: string;
    sku: string;
    barcode?: string;
    productName?: string;
    available?: number;
    color?: string;
    size?: string;
  }>;
}

export function InventoryMasterHubClient({
  initialMasterData,
  initialBranchReport,
  initialFinancialReport,
  categories = [],
  warehouses = [],
  branches = [],
  allVariants = [],
}: InventoryMasterHubClientProps) {
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = useState("catalog");

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Modals
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [preselectedVariantId, setPreselectedVariantId] = useState<string | undefined>();
  const [printOpen, setPrintOpen] = useState(false);
  const [printLabels, setPrintLabels] = useState<BarcodeLabelData[]>([]);

  // Action Loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const masterItems: any[] = initialMasterData?.items || [];
  const finSummary = initialFinancialReport?.summary || {};
  const branchSummary = initialBranchReport?.summary || {};
  const branchSummaries = initialBranchReport?.branchSummaries || [];
  const recentTransfers = initialBranchReport?.recentTransfers || [];
  const financialProducts = initialFinancialReport?.products || [];

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return masterItems.filter((item) => {
      const q = search.toLowerCase();
      const matchQuery =
        !search ||
        item.name?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.barcode?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q);

      const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchCategory =
        categoryFilter === "ALL" ||
        item.category?.toLowerCase() === categoryFilter.toLowerCase() ||
        item.categoryId === categoryFilter;

      return matchQuery && matchStatus && matchCategory;
    });
  }, [masterItems, search, statusFilter, categoryFilter]);

  // Handle Publish Toggle
  const handleTogglePublish = async (productId: string) => {
    try {
      setTogglingId(productId);
      const res = await toggleProductPublishStatusAction(productId);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update publish status.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update.");
    } finally {
      setTogglingId(null);
    }
  };

  // Open Barcode Print for an item
  const handlePrintItemBarcodes = (item: any) => {
    const labels: BarcodeLabelData[] = (item.variants || []).map((v: any) => {
      const color = v.attributes?.Color || v.attributes?.color || "";
      const size = v.attributes?.Size || v.attributes?.size || "";
      return {
        productName: item.name,
        sku: v.sku,
        barcode: v.barcode || item.barcode,
        color,
        size,
        price: item.basePrice,
      };
    });

    if (labels.length === 0) {
      labels.push({
        productName: item.name,
        sku: item.sku,
        barcode: item.barcode,
        price: item.basePrice,
      });
    }

    setPrintLabels(labels);
    setPrintOpen(true);
  };

  // Open Transfer for an item
  const handleOpenTransferForProduct = (item: any) => {
    const firstVariant = item.variants?.[0];
    if (firstVariant) {
      setPreselectedVariantId(firstVariant.id);
    }
    setTransferOpen(true);
  };

  // Export Financial CSV
  const handleExportFinancials = () => {
    const exportData = financialProducts.map((p: any) => ({
      "Product Name": p.name,
      Category: p.category,
      SKU: p.sku,
      Status: p.status,
      "Cost Price (BDT)": p.costPrice,
      "Selling Price (BDT)": p.basePrice,
      "Unit Profit (BDT)": p.unitProfit,
      "Profit Margin (%)": p.marginPercent,
      "In Stock Units": p.inStock,
      "Stock Cost Valuation": p.costValuation,
      "Stock Retail Valuation": p.retailValuation,
      "Projected Gross Profit": p.projectedProfit,
      "Dispatched to Branches": p.dispatched,
    }));
    exportToCsv(exportData, `inventory_financial_report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Export Branch Transfers CSV
  const handleExportTransfers = () => {
    const exportData = recentTransfers.map((t: any) => ({
      "Transfer Number": t.transferNumber,
      Branch: t.branchName,
      Warehouse: t.warehouseName,
      Product: t.productName,
      SKU: t.sku,
      Quantity: t.quantity,
      "Unit Cost": t.unitCost,
      "Unit Price": t.unitPrice,
      "Total Retail Value": t.totalRetail,
      Date: t.dispatchedAt ? new Date(t.dispatchedAt).toLocaleDateString() : "",
      Status: t.status,
      Notes: t.notes || "",
    }));
    exportToCsv(exportData, `branch_dispatch_report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Boxes className="h-8 w-8 text-primary" />
            Inventory & POS Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Master Product Intake &bull; Automated Variant Distribution &bull; EAN-13 Barcodes &bull; Retail Branch Dispatch &bull; Profit Margin Intelligence
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setIntakeOpen(true)}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm cursor-pointer"
          >
            <PackagePlus className="h-4 w-4" />
            New Stock Intake
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setPreselectedVariantId(undefined);
              setTransferOpen(true);
            }}
            className="gap-2 cursor-pointer"
          >
            <ArrowRightLeft className="h-4 w-4 text-purple-600" />
            Dispatch to Branch
          </Button>

          <Link href="/admin/products/new">
            <Button variant="secondary" className="gap-2 cursor-pointer">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Publish from Inventory
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial & Operational KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="shadow-xs border-border/70">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total In Stock
            </span>
            <div className="text-2xl font-black text-foreground mt-1">
              {(finSummary.totalInStockUnits ?? 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-muted-foreground">across central warehouse</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/70">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Stock Valuation (Cost)
            </span>
            <div className="text-2xl font-black text-foreground mt-1">
              ৳{(finSummary.totalStockCostValue ?? 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-muted-foreground">total COGS investment</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/70">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Retail Valuation (MRP)
            </span>
            <div className="text-2xl font-black text-foreground mt-1">
              ৳{(finSummary.totalStockRetailValue ?? 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-muted-foreground">expected gross sales</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/70">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              Projected Gross Profit
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              ৳{(finSummary.totalProjectedGrossProfit ?? 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-600/80 font-medium">potential retail profit</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/70">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Percent className="h-3 w-3 text-primary" />
              Weighted Margin
            </span>
            <div className="text-2xl font-black text-primary mt-1">
              {finSummary.overallGrossMargin ?? 0}%
            </div>
            <span className="text-[11px] text-muted-foreground">average profit margin</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/70">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Building2 className="h-3 w-3 text-purple-500" />
              Sent to Branches
            </span>
            <div className="text-2xl font-black text-purple-600 mt-1">
              {(branchSummary.overallUnitsSent ?? 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-purple-600/80 font-medium">
              to {branchSummary.branchesCount ?? 5} retail outlets
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Main Interactive Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-2">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="catalog" className="text-xs font-semibold gap-1.5">
              <Boxes className="h-3.5 w-3.5" />
              Master Inventory Catalog ({filteredCatalog.length})
            </TabsTrigger>
            <TabsTrigger value="branches" className="text-xs font-semibold gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Branch Dispatch Report ({recentTransfers.length})
            </TabsTrigger>
            <TabsTrigger value="financials" className="text-xs font-semibold gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Profit & Margin Intelligence
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeTab === "catalog" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 cursor-pointer"
                onClick={() => setIntakeOpen(true)}
              >
                <PackagePlus className="h-3.5 w-3.5" />
                + Add Item Matrix
              </Button>
            )}
            {activeTab === "branches" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 cursor-pointer"
                onClick={handleExportTransfers}
              >
                <Download className="h-3.5 w-3.5" />
                Export Dispatch CSV
              </Button>
            )}
            {activeTab === "financials" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 cursor-pointer"
                onClick={handleExportFinancials}
              >
                <Download className="h-3.5 w-3.5" />
                Export Profit CSV
              </Button>
            )}
          </div>
        </div>

        {/* ─── TAB 1: MASTER INVENTORY CATALOG ─────────────────────────────── */}
        <TabsContent value="catalog" className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-center gap-3 bg-card p-3 rounded-xl border">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory by title, SKU, barcode, or category..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category Dropdown Filter */}
            <div className="w-full sm:w-48 shrink-0">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto overflow-x-auto">
              {["ALL", "DRAFT", "ACTIVE"].map((st) => (
                <Button
                  key={st}
                  variant={statusFilter === st ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-9 cursor-pointer"
                  onClick={() => setStatusFilter(st)}
                >
                  {st === "DRAFT" ? "Draft in Inventory" : st === "ACTIVE" ? "Published to Store" : "All Products"}
                </Button>
              ))}
            </div>
          </div>

          {/* Master Catalog Table */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <tr className="bg-muted/40 text-xs">
                  <TableHead className="font-semibold">Product Name & Category</TableHead>
                  <TableHead className="font-semibold">SKU & Barcode</TableHead>
                  <TableHead className="font-semibold text-center">Available Stock</TableHead>
                  <TableHead className="font-semibold text-right">Cost Price</TableHead>
                  <TableHead className="font-semibold text-right">Selling Price</TableHead>
                  <TableHead className="font-semibold text-right">Unit Profit</TableHead>
                  <TableHead className="font-semibold text-center">Margin</TableHead>
                  <TableHead className="font-semibold text-center">Store Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {filteredCatalog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No inventory products found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCatalog.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/20 text-xs">
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-tight">{item.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {item.category}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {item.variantCount} color/size variants
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-mono text-[11px] space-y-0.5">
                          <p className="text-foreground">{item.sku}</p>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <BarcodeIcon className="h-3 w-3" />
                            {item.barcode}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant={item.totalAvailable <= 0 ? "destructive" : item.totalAvailable <= 10 ? "secondary" : "outline"}
                          className="font-bold text-xs"
                        >
                          {item.totalAvailable} units
                        </Badge>
                        {item.totalDispatched > 0 && (
                          <p className="text-[10px] text-purple-600 mt-0.5 font-medium">
                            +{item.totalDispatched} in branches
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-medium text-muted-foreground">
                        ৳{item.costPrice.toLocaleString()}
                      </TableCell>

                      <TableCell className="text-right font-bold text-foreground">
                        ৳{item.basePrice.toLocaleString()}
                      </TableCell>

                      <TableCell className="text-right font-semibold text-emerald-600">
                        +৳{item.unitProfit.toLocaleString()}
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          {item.profitMarginPercent}%
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant={item.status === "ACTIVE" ? "default" : "secondary"}
                          className="text-[10px] cursor-pointer"
                          onClick={() => handleTogglePublish(item.id)}
                          title="Click to toggle publish status"
                        >
                          {item.status === "ACTIVE" ? "Published (Live)" : "Draft in Inventory"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            title="Print Barcode Stickers"
                            onClick={() => handlePrintItemBarcodes(item)}
                          >
                            <Printer className="h-3.5 w-3.5 text-blue-600" />
                            Print
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            title="Dispatch to Retail Branch"
                            onClick={() => handleOpenTransferForProduct(item)}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 text-purple-600" />
                            Branch
                          </Button>

                          <Link href={`/admin/products/${item.id}/edit`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              title="Edit Description, Media & Images"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-amber-600" />
                              Media
                            </Button>
                          </Link>

                          <Button
                            variant={item.status === "ACTIVE" ? "outline" : "default"}
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            disabled={togglingId === item.id}
                            onClick={() => handleTogglePublish(item.id)}
                          >
                            {item.status === "ACTIVE" ? "Unpublish" : "Publish"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── TAB 2: BRANCH DISPATCH REPORT ──────────────────────────────── */}
        <TabsContent value="branches" className="space-y-5">
          {/* Summary Cards per Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {branchSummaries.map((b: any) => (
              <Card key={b.branchId} className="border-border/70 shadow-xs">
                <CardHeader className="p-3.5 pb-2">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span className="truncate">{b.branchName}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {b.branchCode}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-1">
                  <div className="text-xl font-black text-purple-600">
                    {b.totalUnits.toLocaleString()} units
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Valuation: <strong className="text-foreground">৳{b.totalRetailValue.toLocaleString()}</strong>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.transferCount} dispatches logged
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Branch Transfers Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Branch Dispatch History Log</h3>
                <p className="text-xs text-muted-foreground">
                  Audit trail of all products sent from central inventory to retail showrooms.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => {
                  setPreselectedVariantId(undefined);
                  setTransferOpen(true);
                }}
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-purple-600" />
                + New Branch Dispatch
              </Button>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
              <Table>
                <TableHeader>
                  <tr className="bg-muted/40 text-xs">
                    <TableHead className="font-semibold">Transfer #</TableHead>
                    <TableHead className="font-semibold">Target Branch</TableHead>
                    <TableHead className="font-semibold">Product & SKU</TableHead>
                    <TableHead className="font-semibold text-center">Quantity Sent</TableHead>
                    <TableHead className="font-semibold text-right">Retail Value</TableHead>
                    <TableHead className="font-semibold text-center">Date</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {recentTransfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No branch dispatches recorded yet. Click &quot;New Branch Dispatch&quot; to transfer stock.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentTransfers.map((t: any) => (
                      <TableRow key={t.id} className="hover:bg-muted/20 text-xs">
                        <TableCell className="font-mono font-medium">{t.transferNumber}</TableCell>
                        <TableCell className="font-semibold text-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                          {t.branchName}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">{t.productName}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {t.sku}{" "}
                            {t.attributes &&
                              `(${Object.values(t.attributes).filter(Boolean).join(" / ")})`}
                          </p>
                        </TableCell>
                        <TableCell className="text-center font-bold text-foreground">
                          {t.quantity} units
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          ৳{t.totalRetail.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {t.dispatchedAt ? new Date(t.dispatchedAt).toLocaleDateString() : "Just now"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-50 border-purple-200">
                            {t.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 3: PROFIT & MARGIN INTELLIGENCE ────────────────────────── */}
        <TabsContent value="financials" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Product-Level Profit Margin Intelligence</h3>
              <p className="text-xs text-muted-foreground">
                Detailed cost, selling price, gross profit margins, and inventory valuation per product.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 cursor-pointer"
              onClick={handleExportFinancials}
            >
              <Download className="h-3.5 w-3.5" />
              Export Financial Report
            </Button>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <tr className="bg-muted/40 text-xs">
                  <TableHead className="font-semibold">Product Name</TableHead>
                  <TableHead className="font-semibold text-right">Cost Price (COGS)</TableHead>
                  <TableHead className="font-semibold text-right">Selling Price (MRP)</TableHead>
                  <TableHead className="font-semibold text-right">Unit Gross Profit</TableHead>
                  <TableHead className="font-semibold text-center">Margin %</TableHead>
                  <TableHead className="font-semibold text-center">In-Stock</TableHead>
                  <TableHead className="font-semibold text-right">Total Cost Value</TableHead>
                  <TableHead className="font-semibold text-right">Potential Gross Revenue</TableHead>
                  <TableHead className="font-semibold text-center">Margin Health</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {financialProducts.map((p: any) => {
                  let healthLabel = "Healthy";
                  let healthClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  if (p.marginPercent >= 50) {
                    healthLabel = "High Margin";
                    healthClass = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
                  } else if (p.marginPercent < 30) {
                    healthLabel = "Low Margin";
                    healthClass = "bg-amber-50 text-amber-800 border-amber-200";
                  }

                  return (
                    <TableRow key={p.id} className="hover:bg-muted/20 text-xs">
                      <TableCell className="font-medium">
                        <p className="font-semibold text-foreground text-sm">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{p.sku}</p>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ৳{p.costPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        ৳{p.basePrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        +৳{p.unitProfit.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-bold text-foreground">
                        {p.marginPercent}%
                      </TableCell>
                      <TableCell className="text-center font-semibold text-foreground">
                        {p.inStock} units
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ৳{p.costValuation.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        ৳{p.retailValuation.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${healthClass}`}>
                          {healthLabel}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Intake Dialog */}
      <InventoryMasterIntakeDialog
        open={intakeOpen}
        onOpenChange={setIntakeOpen}
        categories={categories}
        onSuccess={() => router.refresh()}
      />

      {/* Branch Transfer Modal */}
      <BranchTransferModal
        open={transferOpen}
        onOpenChange={setTransferOpen}
        warehouses={warehouses}
        branches={branches}
        variants={allVariants}
        preselectedVariantId={preselectedVariantId}
        onSuccess={() => router.refresh()}
      />

      {/* Print Barcode Modal */}
      <PrintBarcodeModal
        open={printOpen}
        onOpenChange={setPrintOpen}
        labels={printLabels}
      />
    </div>
  );
}
