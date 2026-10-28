"use client";

import { useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PackagePlus,
  ArrowRightLeft,
  Printer,
  Sparkles,
  Search,
  Download,
  Boxes,
  TrendingUp,
  Building2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Barcode as BarcodeIcon,
  Warehouse,
  Coins,
  Tag,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Expanded variant rows
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  const toggleExpandProduct = (productId: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

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
    const catName = typeof item.category === "string" ? item.category : item.category?.name || "ND";
    const catTag = catName.slice(0, 3).toUpperCase();

    const labels: BarcodeLabelData[] = (item.variants || []).map((v: any) => {
      const color = v.attributes?.Color || v.attributes?.color || "";
      const size = v.attributes?.Size || v.attributes?.size || "";
      const variantStock =
        typeof v.stock === "number"
          ? v.stock
          : typeof v.quantityAvailable === "number"
          ? v.quantityAvailable
          : v.inventoryLevels?.reduce(
              (sum: number, lvl: any) => sum + (lvl.quantityAvailable || 0),
              0
            ) ?? 0;

      return {
        productName: item.name,
        sku: v.sku,
        barcode: v.barcode || item.barcode,
        color,
        size,
        price: item.basePrice || item.price || 0,
        stock: variantStock > 0 ? variantStock : 1,
        styleCode: item.sku || v.sku,
        categoryName: catName,
        brandName: "ANCHOR FASHION",
        tag: catTag,
      };
    });

    if (labels.length === 0) {
      labels.push({
        productName: item.name,
        sku: item.sku,
        barcode: item.barcode,
        price: item.basePrice || item.price || 0,
        stock: item.totalStock > 0 ? item.totalStock : 1,
        styleCode: item.sku,
        categoryName: catName,
        brandName: "ANCHOR FASHION",
        tag: catTag,
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
      "Units Sold": p.soldUnits || 0,
      "Realized Sales Revenue (BDT)": p.soldRevenue || 0,
      "Realized Profit (BDT)": p.realizedProfit || 0,
      "Sell-Through Rate (%)": p.sellThroughRate || 0,
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
    <div className="space-y-6 font-sans">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-foreground tracking-wide uppercase">
              <Boxes className="h-3 w-3 text-primary" />
              Anchor Central Warehouse
            </span>
            <span className="text-xs text-muted-foreground">&bull;</span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations Sync
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground font-sans">
            Inventory &amp; POS Command Center
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground max-w-2xl">
            Master catalog intake, variant matrix management, EAN-13 barcodes, multi-branch dispatch, and real-time margin analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setIntakeOpen(true)}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer h-9 px-4 text-xs rounded-lg"
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
            className="gap-2 border-border bg-card hover:bg-accent text-foreground font-medium cursor-pointer h-9 px-3.5 text-xs shadow-xs rounded-lg"
          >
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            Dispatch to Branch
          </Button>

          <Link href="/admin/products/new">
            <Button
              variant="outline"
              className="gap-2 border-border bg-card hover:bg-accent text-foreground font-medium cursor-pointer h-9 px-3.5 text-xs shadow-xs rounded-lg"
            >
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Publish to Store
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial & Operational KPI Cards - 5 Spacious Executive Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="border border-border bg-card shadow-xs hover:border-border/80 transition-all rounded-xl">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Total In Stock</span>
              <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight font-sans">
              {(finSummary.totalInStockUnits ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              +{(branchSummary.overallUnitsSent ?? 0).toLocaleString()} across {branchSummary.branchesCount ?? 5} branches
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs hover:border-border/80 transition-all rounded-xl">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Stock Cost (COGS)</span>
              <Coins className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight font-sans">
              ৳{(finSummary.totalStockCostValue ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Central inventory investment
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs hover:border-border/80 transition-all rounded-xl">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Retail Value (MRP)</span>
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight font-sans">
              ৳{(finSummary.totalStockRetailValue ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Projected showroom gross
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs hover:border-border/80 transition-all rounded-xl">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Gross Margin</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight font-sans">
              {finSummary.overallGrossMargin ?? 0}%
            </div>
            <p className="text-[11px] text-muted-foreground font-medium truncate">
              ৳{(finSummary.totalProjectedGrossProfit ?? 0).toLocaleString()} potential profit
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs hover:border-border/80 transition-all rounded-xl">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Realized Sales</span>
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight font-sans">
              ৳{(finSummary.totalRealizedRevenue ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              {(finSummary.totalSoldUnits ?? 0).toLocaleString()} units &bull; {finSummary.overallSellThroughRate ?? 0}% sell-through
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Interactive Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-2">
          <TabsList className="bg-muted p-1 rounded-xl">
            <TabsTrigger value="catalog" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
              <Boxes className="h-3.5 w-3.5" />
              Master Inventory Catalog ({filteredCatalog.length})
            </TabsTrigger>
            <TabsTrigger value="branches" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
              <Building2 className="h-3.5 w-3.5" />
              Branch Dispatch Report ({recentTransfers.length})
            </TabsTrigger>
            <TabsTrigger value="financials" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              Profit &amp; Margin Intelligence
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeTab === "catalog" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 cursor-pointer border-border bg-card hover:bg-accent text-foreground rounded-lg shadow-xs font-semibold"
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
                className="h-8 text-xs gap-1.5 cursor-pointer border-border bg-card hover:bg-accent text-foreground rounded-lg shadow-xs font-semibold"
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
                className="h-8 text-xs gap-1.5 cursor-pointer border-border bg-card hover:bg-accent text-foreground rounded-lg shadow-xs font-semibold"
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
          <div className="flex flex-col md:flex-row items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory by title, SKU, barcode, or category..."
                className="pl-9 h-9 text-xs bg-background border-border rounded-lg text-foreground placeholder:text-muted-foreground"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category Dropdown Filter */}
            <div className="w-full sm:w-48 shrink-0">
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
                items={[
                  { value: "ALL", label: "All Categories" },
                  ...categories.map((c) => ({ value: c.name, label: c.name })),
                ]}
              >
                <SelectTrigger className="h-9 text-xs border-border bg-background rounded-lg text-foreground">
                  <SelectValue placeholder="All Categories">
                    {categoryFilter === "ALL" ? "All Categories" : categoryFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-xl">
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
            <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto overflow-x-auto bg-muted p-1 rounded-lg">
              {["ALL", "DRAFT", "ACTIVE"].map((st) => {
                const isActive = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "DRAFT" ? "Draft in Warehouse" : st === "ACTIVE" ? "Published (Live)" : "All Products"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Master Catalog Table */}
          <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-xs">
            <Table className="min-w-full">
              <TableHeader>
                <tr className="bg-muted/40 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                  <TableHead className="font-semibold py-3 pl-4">Product Name &amp; Category</TableHead>
                  <TableHead className="font-semibold">SKU &amp; Barcode</TableHead>
                  <TableHead className="font-semibold text-center">Warehouse Stock</TableHead>
                  <TableHead className="font-semibold text-center">Units Sold</TableHead>
                  <TableHead className="font-semibold text-right">Pricing &amp; Cost</TableHead>
                  <TableHead className="font-semibold text-center">Gross Margin</TableHead>
                  <TableHead className="font-semibold text-center">Store Status</TableHead>
                  <TableHead className="font-semibold text-right pr-4 min-w-[210px]">Actions</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {filteredCatalog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No inventory products found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCatalog.map((item) => {
                    const isExpanded = expandedProductIds.has(item.id);
                    return (
                      <Fragment key={item.id}>
                        <TableRow className="hover:bg-muted/30 text-xs border-b border-border/60 transition-colors">
                          <TableCell className="font-medium py-3 pl-4">
                            <div className="flex items-start gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0 mt-0.5 rounded"
                                onClick={() => toggleExpandProduct(item.id)}
                                title={isExpanded ? "Collapse Variants" : "Expand Color/Size Breakdown"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                              <div>
                                <p className="font-bold text-foreground text-sm leading-tight font-sans">
                                  {item.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                                    {item.category}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandProduct(item.id)}
                                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer underline-offset-2 hover:underline"
                                  >
                                    {item.variantCount} color/size variants
                                  </button>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="font-mono text-[11px] space-y-0.5">
                              <p className="font-semibold text-foreground">{item.sku}</p>
                              <p className="text-muted-foreground flex items-center gap-1 text-[10px]">
                                <BarcodeIcon className="h-3 w-3" />
                                {item.barcode}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                item.totalAvailable <= 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                                  : item.totalAvailable <= 10
                                  ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                  : "bg-muted text-foreground border border-border font-semibold"
                              }`}
                            >
                              {item.totalAvailable} units
                            </span>
                            {item.totalDispatched > 0 && (
                              <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 font-medium">
                                +{item.totalDispatched} in branches
                              </p>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            {item.totalSold > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                  {item.totalSold} sold
                                </span>
                                <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                  {item.sellThroughRate}% rate
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="text-[11px] text-muted-foreground font-medium">0 sold</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {item.totalInflow || item.totalAvailable} intake
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <p className="font-bold text-foreground text-xs">
                              ৳{item.basePrice.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium">
                              Cost: ৳{item.costPrice.toLocaleString()}
                            </p>
                          </TableCell>

                          <TableCell className="text-center">
                            <p className="font-bold text-emerald-600 text-xs">
                              +৳{item.unitProfit.toLocaleString()}
                            </p>
                            <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                              {item.profitMarginPercent}% margin
                            </span>
                          </TableCell>

                          <TableCell className="text-center">
                            <span
                              onClick={() => handleTogglePublish(item.id)}
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition-all ${
                                item.status === "ACTIVE"
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                              }`}
                              title="Click to toggle publish status"
                            >
                              {item.status === "ACTIVE" ? "Live on Store" : "Draft in Warehouse"}
                            </span>
                          </TableCell>

                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              {item.status === "DRAFT" ? (
                                <Link href={`/admin/products/new?importId=${item.id}`}>
                                  <Button
                                    size="sm"
                                    className="h-7 px-2.5 text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer shadow-xs rounded-lg shrink-0"
                                    title="Open Product Form with pre-populated colors, sizes and barcodes to add photos & publish live"
                                  >
                                    <Sparkles className="h-3 w-3" />
                                    Publish
                                  </Button>
                                </Link>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs border-border bg-card text-foreground hover:bg-accent rounded-lg shrink-0"
                                  disabled={togglingId === item.id}
                                  onClick={() => handleTogglePublish(item.id)}
                                >
                                  Unpublish
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
                                title="Print Barcode Stickers"
                                onClick={() => handlePrintItemBarcodes(item)}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
                                title="Dispatch to Retail Branch"
                                onClick={() => handleOpenTransferForProduct(item)}
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                              </Button>

                              <Link href={`/admin/products/${item.id}/edit`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
                                  title="Edit Description, Media & Images"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Variant Expansion Row */}
                        {isExpanded && (
                          <TableRow className="bg-muted/20 border-b border-border hover:bg-muted/20">
                            <TableCell colSpan={8} className="p-3 pl-10">
                              <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs space-y-2.5">
                                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-2 border-b border-border">
                                  <span className="flex items-center gap-1.5 text-foreground font-medium">
                                    <Boxes className="h-3.5 w-3.5 text-primary" />
                                    Color &amp; Size Breakdown for &quot;{item.name}&quot; ({item.variants.length} variants)
                                  </span>
                                  <span className="font-mono text-[11px] text-muted-foreground">Base SKU: {item.sku}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
                                  {item.variants.map((v: any) => {
                                    const color = v.attributes?.Color || v.attributes?.color || "Standard";
                                    const size = v.attributes?.Size || v.attributes?.size || "Default";
                                    return (
                                      <div key={v.id} className="rounded-lg border border-border p-2.5 bg-muted/30 text-xs space-y-1">
                                        <div className="flex items-center justify-between font-bold">
                                          <span className="truncate text-foreground">{color}</span>
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold bg-background text-foreground border border-border">
                                            {size}
                                          </Badge>
                                        </div>
                                        <p className="font-mono text-[10px] text-muted-foreground truncate">{v.sku}</p>
                                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-border">
                                          <span className="text-emerald-600 font-semibold">{v.available} in stock</span>
                                          <span className="text-muted-foreground font-medium">{v.sold || 0} sold</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
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
              <Card key={b.branchId} className="border border-border bg-card rounded-xl shadow-xs hover:border-border/80 transition-all">
                <CardHeader className="p-3.5 pb-2">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span className="truncate">{b.branchName}</span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                      {b.branchCode}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-1">
                  <div className="text-xl font-bold text-foreground font-sans">
                    {b.totalUnits.toLocaleString()} units
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Valuation: <strong className="text-foreground font-semibold">৳{b.totalRetailValue.toLocaleString()}</strong>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.transferCount} dispatches logged
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Branch Transfers Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Branch Dispatch History Log</h3>
                <p className="text-xs text-muted-foreground">
                  Audit trail of all products dispatched from central inventory to retail outlets.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 rounded-lg border-border bg-card hover:bg-accent text-foreground shadow-xs font-semibold cursor-pointer"
                onClick={() => {
                  setPreselectedVariantId(undefined);
                  setTransferOpen(true);
                }}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                + New Branch Dispatch
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-xs">
              <Table className="min-w-full">
                <TableHeader>
                  <tr className="bg-muted/40 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                    <TableHead className="font-semibold py-3 pl-4">Transfer #</TableHead>
                    <TableHead className="font-semibold">Target Branch</TableHead>
                    <TableHead className="font-semibold">Product &amp; SKU</TableHead>
                    <TableHead className="font-semibold text-center">Quantity Sent</TableHead>
                    <TableHead className="font-semibold text-right">Retail Value</TableHead>
                    <TableHead className="font-semibold text-center">Date</TableHead>
                    <TableHead className="font-semibold text-center pr-4">Status</TableHead>
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
                      <TableRow key={t.id} className="hover:bg-muted/30 text-xs border-b border-border/60 transition-colors">
                        <TableCell className="font-mono font-semibold text-foreground py-3 pl-4">
                          {t.transferNumber}
                        </TableCell>
                        <TableCell className="font-bold text-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {t.branchName}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-foreground">{t.productName}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {t.sku}{" "}
                            {t.attributes &&
                              `(${Object.values(t.attributes).filter(Boolean).join(" / ")})`}
                          </p>
                        </TableCell>
                        <TableCell className="text-center font-bold text-foreground">
                          {t.quantity} units
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          ৳{t.totalRetail.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground text-[11px]">
                          {t.dispatchedAt ? new Date(t.dispatchedAt).toLocaleDateString() : "Just now"}
                        </TableCell>
                        <TableCell className="text-center pr-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            {t.status}
                          </span>
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
              <h3 className="text-sm font-bold text-foreground">Product-Level Profit Margin Intelligence</h3>
              <p className="text-xs text-muted-foreground">
                Detailed landed cost, selling price, gross profit margins, and inventory valuation per product style.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 cursor-pointer rounded-lg border-border bg-card hover:bg-accent text-foreground shadow-xs font-semibold"
              onClick={handleExportFinancials}
            >
              <Download className="h-3.5 w-3.5" />
              Export Financial Report
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-xs">
            <Table className="min-w-full">
              <TableHeader>
                <tr className="bg-muted/40 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                  <TableHead className="font-semibold py-3 pl-4">Product Name</TableHead>
                  <TableHead className="font-semibold text-right">Cost Price (COGS)</TableHead>
                  <TableHead className="font-semibold text-right">Selling Price (MRP)</TableHead>
                  <TableHead className="font-semibold text-right">Unit Gross Profit</TableHead>
                  <TableHead className="font-semibold text-center">Margin %</TableHead>
                  <TableHead className="font-semibold text-center">In-Stock</TableHead>
                  <TableHead className="font-semibold text-center">Units Sold</TableHead>
                  <TableHead className="font-semibold text-right">Realized Profit</TableHead>
                  <TableHead className="font-semibold text-right">Potential Revenue</TableHead>
                  <TableHead className="font-semibold text-center pr-4">Margin Health</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {financialProducts.map((p: any) => {
                  let healthLabel = "Healthy";
                  let healthClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
                  if (p.marginPercent >= 50) {
                    healthLabel = "High Margin";
                    healthClass = "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700";
                  } else if (p.marginPercent < 30) {
                    healthLabel = "Low Margin";
                    healthClass = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
                  }

                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30 text-xs border-b border-border/60 transition-colors">
                      <TableCell className="font-medium py-3 pl-4">
                        <p className="font-bold text-foreground text-sm">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ৳{p.costPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
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
                      <TableCell className="text-center font-bold text-primary">
                        {p.soldUnits || 0} sold
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        ৳{(p.realizedProfit || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        ৳{p.retailValuation.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center pr-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border ${healthClass}`}>
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
