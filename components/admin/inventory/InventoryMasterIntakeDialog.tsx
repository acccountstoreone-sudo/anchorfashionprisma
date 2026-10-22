"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInventoryMasterIntakeAction, generateProductCodeAction } from "@/lib/actions/admin/inventory-master.actions";
import { generateEAN13Sync } from "@/lib/utils/barcode";
import { PrintBarcodeModal, BarcodeLabelData } from "@/components/admin/inventory/PrintBarcodeModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PackagePlus,
  Boxes,
  Sparkles,
  Barcode as BarcodeIcon,
  Calculator,
  Printer,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Loader2,
  RefreshCw,
  Percent,
  TrendingUp,
  Tag,
  Wand2,
  Layers,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
}

interface InventoryMasterIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  onSuccess?: (createdProduct?: any) => void;
  defaultCategoryId?: string;
}

import { APPAREL_SIZE_SYSTEMS, detectApparelSystemForCategory } from "@/lib/utils/product-code";

const PRESET_COLORS = [
  "Black",
  "Navy Blue",
  "White",
  "Maroon",
  "Orange",
  "Olive Green",
  "Charcoal Grey",
  "Beige",
  "Sky Blue",
  "Red",
  "Royal Blue",
  "Golden",
  "Emerald Green",
];

export function InventoryMasterIntakeDialog({
  open,
  onOpenChange,
  categories = [],
  onSuccess,
  defaultCategoryId,
}: InventoryMasterIntakeDialogProps) {
  const router = useRouter();

  // Master Details
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId || categories[0]?.id || "");
  const [styleCode, setStyleCode] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [basePrice, setBasePrice] = useState<number>(2500);
  const [costPrice, setCostPrice] = useState<number>(1500);
  const [totalQuantity, setTotalQuantity] = useState<number>(100);
  const [notes, setNotes] = useState("");

  // Post-Intake Success Action State
  const [createdIntakeSuccess, setCreatedIntakeSuccess] = useState<any | null>(null);

  // Variants selection & Apparel Size System
  const [activeSizeSystem, setActiveSizeSystem] = useState<string>("alpha");
  const [selectedColors, setSelectedColors] = useState<string[]>(["Black", "Navy Blue"]);
  const [newColorInput, setNewColorInput] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["M", "L", "XL", "XXL"]);
  const [newSizeInput, setNewSizeInput] = useState("");

  // Category-Aware Size System Auto Switch
  useEffect(() => {
    if (open && defaultCategoryId) {
      setCategoryId(defaultCategoryId);
    }
  }, [open, defaultCategoryId]);

  useEffect(() => {
    if (!categoryId) return;
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      const detected = detectApparelSystemForCategory(cat.name);
      setActiveSizeSystem(detected.systemId);
      setSelectedSizes(detected.defaultSizes);
    }
  }, [categoryId, categories]);

  // Current system sizes available
  const currentSystemSizes = useMemo(() => {
    const sys = APPAREL_SIZE_SYSTEMS.find((s) => s.id === activeSizeSystem);
    return sys ? sys.sizes : ["S", "M", "L", "XL", "XXL", "3XL"];
  }, [activeSizeSystem]);

  const handleSelectSizeSystem = (systemId: string) => {
    setActiveSizeSystem(systemId);
    const found = APPAREL_SIZE_SYSTEMS.find((s) => s.id === systemId);
    if (found) {
      setSelectedSizes(found.sizes.slice(0, 4));
    }
  };

  // Distribution Matrix: Record<`${color}-${size}`, number>
  const [matrix, setMatrix] = useState<Record<string, number>>({});

  // Barcode Printing State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printLabels, setPrintLabels] = useState<BarcodeLabelData[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-distribute quantity across selected colors & sizes
  const handleAutoDistribute = (qty = totalQuantity) => {
    if (selectedColors.length === 0 || selectedSizes.length === 0) return;

    const totalCells = selectedColors.length * selectedSizes.length;
    if (totalCells === 0) return;

    const basePerCell = Math.floor(qty / totalCells);
    let remainder = qty % totalCells;

    const newMatrix: Record<string, number> = {};
    for (const color of selectedColors) {
      for (const size of selectedSizes) {
        const key = `${color}-${size}`;
        let cellQty = basePerCell;
        if (remainder > 0) {
          cellQty += 1;
          remainder -= 1;
        }
        newMatrix[key] = cellQty;
      }
    }
    setMatrix(newMatrix);
  };

  // Initial distribution when colors or sizes change
  useEffect(() => {
    if (open) {
      handleAutoDistribute(totalQuantity);
    }
  }, [open, selectedColors.join(","), selectedSizes.join(",")]);

  // Financial Calculations
  const unitProfit = basePrice - costPrice;
  const marginPercent = basePrice > 0 ? (unitProfit / basePrice) * 100 : 0;
  const markupPercent = costPrice > 0 ? (unitProfit / costPrice) * 100 : 0;

  const allocatedTotal = useMemo(() => {
    return Object.values(matrix).reduce((acc, q) => acc + (Number(q) || 0), 0);
  }, [matrix]);

  const totalCostValuation = allocatedTotal * costPrice;
  const totalRetailValuation = allocatedTotal * basePrice;
  const totalProjectedProfit = totalRetailValuation - totalCostValuation;

  // Merchandising Break-Even Calculations
  const breakEvenUnits = basePrice > 0 ? Math.ceil(totalCostValuation / basePrice) : 0;
  const breakEvenPercent = allocatedTotal > 0 ? Math.min(100, Math.round((breakEvenUnits / allocatedTotal) * 100)) : 0;
  const pureProfitUnits = Math.max(0, allocatedTotal - breakEvenUnits);
  const pureProfitRevenue = pureProfitUnits * basePrice;

  const isBalanced = allocatedTotal === totalQuantity;

  // Add custom color
  const handleAddCustomColor = () => {
    const val = newColorInput.trim();
    if (val && !selectedColors.includes(val)) {
      setSelectedColors([...selectedColors, val]);
      setNewColorInput("");
    }
  };

  // Add custom size
  const handleAddCustomSize = () => {
    const val = newSizeInput.trim().toUpperCase();
    if (val && !selectedSizes.includes(val)) {
      setSelectedSizes([...selectedSizes, val]);
      setNewSizeInput("");
    }
  };

  // Toggle color
  const toggleColor = (c: string) => {
    if (selectedColors.includes(c)) {
      if (selectedColors.length > 1) {
        setSelectedColors(selectedColors.filter((item) => item !== c));
      } else {
        toast.warning("At least one color is required.");
      }
    } else {
      setSelectedColors([...selectedColors, c]);
    }
  };

  // Toggle size
  const toggleSize = (s: string) => {
    if (selectedSizes.includes(s)) {
      if (selectedSizes.length > 1) {
        setSelectedSizes(selectedSizes.filter((item) => item !== s));
      } else {
        toast.warning("At least one size is required.");
      }
    } else {
      setSelectedSizes([...selectedSizes, s]);
    }
  };

  // Update cell
  const handleCellChange = (color: string, size: string, val: number) => {
    setMatrix((prev) => ({
      ...prev,
      [`${color}-${size}`]: Math.max(0, val || 0),
    }));
  };

  // Generate Unique Dynamic Style Code (e.g. AFPTS1)
  const handleGenerateCode = async () => {
    if (!name.trim()) {
      toast.warning("Please enter a product name first to generate a style code.");
      return;
    }
    try {
      setIsGeneratingCode(true);
      const code = await generateProductCodeAction({
        productName: name.trim(),
        categoryNameOrId: categoryId,
        brandPrefix: "AF",
      });
      setStyleCode(code);
      toast.success(`Generated short style code: ${code}`);
    } catch (err: any) {
      toast.error("Failed to generate style code");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (publishImmediately: boolean) => {
    if (!name.trim()) {
      toast.error("Please enter a product name.");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category.");
      return;
    }
    if (basePrice <= 0) {
      toast.error("Selling price must be greater than zero.");
      return;
    }
    if (selectedColors.length === 0 || selectedSizes.length === 0) {
      toast.error("Please select at least one color and size.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Format payload
      const colorVariants = selectedColors.map((color) => ({
        color,
        sizes: selectedSizes.map((size) => ({
          size,
          quantity: matrix[`${color}-${size}`] ?? 0,
        })),
      }));

      const res = await createInventoryMasterIntakeAction({
        name: name.trim(),
        categoryId,
        basePrice,
        costPrice,
        totalQuantity: allocatedTotal,
        colorVariants,
        publishImmediately,
        notes,
        skuPrefix: styleCode.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success(res.message);

        // Prepare print labels
        const labels: BarcodeLabelData[] = res.data.variants.map((v: any) => ({
          productName: name.trim(),
          sku: v.sku,
          barcode: v.barcode,
          color: v.color,
          size: v.size,
          price: basePrice,
        }));

        setPrintLabels(labels);

        if (onSuccess) onSuccess(res.data);
        onOpenChange(false);

        if (publishImmediately) {
          toast.success("🚀 Product published live to storefront!");
          setPrintModalOpen(true);
        } else {
          // Open decision prompt: Publish with images/description, print stickers, or view in inventory
          setCreatedIntakeSuccess(res.data);
        }
      } else {
        toast.error(res.error || "Failed to create master inventory intake.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2.5">
              <PackagePlus className="h-6 w-6 text-primary" />
              Master Inventory Intake & Matrix Generator
            </DialogTitle>
            <DialogDescription>
              Add products directly to Inventory with auto color/size distribution, EAN-13 barcodes, and instant financial margin calculation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Step 1: Core Product, Category & Dynamic Style Code */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">1. Category</Label>
                  <Select
                    value={categoryId}
                    onValueChange={setCategoryId}
                    items={categories.map((c) => ({ value: c.id, label: c.name }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category">
                        {categories.find((c) => c.id === categoryId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">2. Product Name / Title</Label>
                  <Input
                    placeholder="e.g. Polo T-Shirt / Oxford Cotton Shirt"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              {/* Dynamic Clothing Brand Product Style Code */}
              <div className="p-3 bg-muted/40 border border-primary/20 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      Dynamic Product Style Code (POS & Storefront SKU)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Unique clothing brand code (e.g. <span className="font-mono font-semibold text-primary">AFPTS1</span> for Anchor Fashion Polo T-Shirt #1).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCode}
                    disabled={isGeneratingCode || !name.trim()}
                    className="h-8 gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10 shrink-0"
                  >
                    {isGeneratingCode ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    Generate Code
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. AFPTS1 (or leave blank to auto-generate)"
                    value={styleCode}
                    onChange={(e) => setStyleCode(e.target.value.toUpperCase())}
                    className="font-mono font-bold tracking-wider text-sm h-9 bg-background"
                  />
                  {styleCode && (
                    <Badge variant="secondary" className="h-9 px-3 font-mono text-xs shrink-0 flex items-center gap-1">
                      Preview: {styleCode}-{selectedColors[0]?.slice(0, 3).toUpperCase() || "BLK"}-{selectedSizes[0] || "M"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Pricing, Cost & Financials */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Selling Price / MRP (৳)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={basePrice}
                    onChange={(e) => setBasePrice(Math.max(1, parseFloat(e.target.value) || 0))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Cost / Buy Price COGS (৳)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={costPrice}
                    onChange={(e) => setCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Total Stock Quantity</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={totalQuantity}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setTotalQuantity(val);
                        handleAutoDistribute(val);
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAutoDistribute(totalQuantity)}
                      title="Evenly distribute total across all variant combinations"
                      className="shrink-0 gap-1 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Auto Split
                    </Button>
                  </div>
                </div>
              </div>

              {/* Live Financial Margin Badge Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-xl border">
                <div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    Unit Gross Profit
                  </span>
                  <p className="text-base font-bold text-emerald-600">৳{unitProfit.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Percent className="h-3 w-3 text-primary" />
                    Profit Margin
                  </span>
                  <p className="text-base font-bold text-primary">{Math.round(marginPercent * 10) / 10}%</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Total Stock Cost</span>
                  <p className="text-base font-semibold text-foreground">৳{totalCostValuation.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Potential Profit</span>
                  <p className="text-base font-bold text-foreground">৳{totalProjectedProfit.toLocaleString()}</p>
                </div>
              </div>

              {/* Merchandising & Break-Even Intelligence Card */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-transparent rounded-xl border border-emerald-500/30 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        Merchandising Intelligence & Break-Even Analysis
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Sell <span className="font-semibold text-emerald-600">{breakEvenUnits}</span> out of {allocatedTotal} units ({breakEvenPercent}%) to fully recover batch investment.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 bg-emerald-50/50">
                      Markup: {Math.round(markupPercent)}%
                    </Badge>
                    <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5">
                      Margin: {Math.round(marginPercent * 10) / 10}%
                    </Badge>
                  </div>
                </div>

                {/* Visual Progress Bar: Break-Even Recovery vs Pure Profit Zone */}
                <div className="space-y-1">
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="bg-amber-500 h-full transition-all"
                      style={{ width: `${breakEvenPercent}%` }}
                      title={`Break-Even Point: ${breakEvenUnits} units`}
                    />
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${100 - breakEvenPercent}%` }}
                      title={`Pure Profit Zone: ${pureProfitUnits} units`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                      Recovery Phase: <strong>{breakEvenUnits} units</strong> (৳{totalCostValuation.toLocaleString()})
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                      Pure Profit Runway: <strong>{pureProfitUnits} units</strong> (+৳{pureProfitRevenue.toLocaleString()})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Colors Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">3. Select Available Colors</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((color) => {
                  const isSelected = selectedColors.includes(color);
                  return (
                    <Badge
                      key={color}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer px-2.5 py-1 text-xs transition-all"
                      onClick={() => toggleColor(color)}
                    >
                      {color}
                      {isSelected && <span className="ml-1 text-xs opacity-70">✓</span>}
                    </Badge>
                  );
                })}
              </div>

              {/* Add Custom Color */}
              <div className="flex items-center gap-2 max-w-xs pt-1">
                <Input
                  placeholder="Custom Color (e.g. Royal Purple)"
                  value={newColorInput}
                  onChange={(e) => setNewColorInput(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomColor();
                    }
                  }}
                />
                <Button type="button" size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={handleAddCustomColor}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Step 4: Sizes Selection with Apparel Size Systems */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <Label className="text-xs font-semibold">4. Select Size System & Available Sizes</Label>
                <span className="text-[11px] text-muted-foreground">Auto-adapts to category presets</span>
              </div>

              {/* Size System Category Pills */}
              <div className="flex flex-wrap gap-1.5">
                {APPAREL_SIZE_SYSTEMS.map((sys) => {
                  const isActive = activeSizeSystem === sys.id;
                  return (
                    <Button
                      key={sys.id}
                      type="button"
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-7 text-xs px-2.5 rounded-full transition-all cursor-pointer",
                        isActive ? "shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => handleSelectSizeSystem(sys.id)}
                    >
                      {sys.label}
                    </Button>
                  );
                })}
              </div>

              {/* Sizes within Active System */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentSystemSizes.map((size) => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <Badge
                      key={size}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-3 py-1 text-xs transition-all",
                        isSelected ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted"
                      )}
                      onClick={() => toggleSize(size)}
                    >
                      {size}
                      {isSelected && <span className="ml-1 text-xs opacity-80">✓</span>}
                    </Badge>
                  );
                })}

                {/* Custom Sizes not in current system */}
                {selectedSizes
                  .filter((s) => !currentSystemSizes.includes(s))
                  .map((customSize) => (
                    <Badge
                      key={customSize}
                      variant="default"
                      className="cursor-pointer px-3 py-1 text-xs transition-all bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => toggleSize(customSize)}
                    >
                      {customSize} <span className="ml-1 text-xs opacity-80">✓</span>
                    </Badge>
                  ))}
              </div>

              {/* Add Custom Size */}
              <div className="flex items-center gap-2 max-w-xs pt-1">
                <Input
                  placeholder="Custom Size (e.g. 38 or 4XL)"
                  value={newSizeInput}
                  onChange={(e) => setNewSizeInput(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomSize();
                    }
                  }}
                />
                <Button type="button" size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={handleAddCustomSize}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Step 5: Live Matrix Allocation Table */}
            <div className="space-y-2 border rounded-xl p-4 bg-card shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-primary" />
                    Color × Size Stock Distribution Matrix
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    System automatically generates barcodes & SKUs for each combination.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={isBalanced ? "secondary" : "destructive"} className="text-xs">
                    Allocated: {allocatedTotal} / {totalQuantity} units
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleAutoDistribute(totalQuantity)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Re-Distribute
                  </Button>
                </div>
              </div>

              {/* The Matrix Table */}
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="p-2 font-semibold">Color \ Size</th>
                      {selectedSizes.map((sz) => (
                        <th key={sz} className="p-2 font-semibold text-center w-24">
                          Size {sz}
                        </th>
                      ))}
                      <th className="p-2 font-semibold text-right">Color Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedColors.map((color) => {
                      const colorRowTotal = selectedSizes.reduce(
                        (sum, sz) => sum + (matrix[`${color}-${sz}`] || 0),
                        0
                      );
                      return (
                        <tr key={color} className="border-b hover:bg-muted/10">
                          <td className="p-2 font-medium flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary/70 inline-block" />
                            {color}
                          </td>
                          {selectedSizes.map((sz) => {
                            const key = `${color}-${sz}`;
                            const val = matrix[key] ?? 0;
                            return (
                              <td key={sz} className="p-1.5 text-center">
                                <Input
                                  type="number"
                                  min={0}
                                  value={val}
                                  onChange={(e) =>
                                    handleCellChange(color, sz, parseInt(e.target.value) || 0)
                                  }
                                  className="h-8 w-20 text-center mx-auto text-xs"
                                />
                              </td>
                            );
                          })}
                          <td className="p-2 text-right font-bold text-foreground">
                            {colorRowTotal} units
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 6: Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes / Purchase Memo (Optional)</Label>
              <Textarea
                placeholder="e.g. Batch #2026-Q1 from Central Stitching Unit"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Save to Inventory Master (Draft)
            </Button>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Save & Publish to Store (Live)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Print Modal */}
      <PrintBarcodeModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        labels={printLabels}
      />

      {/* Post-Intake Action Modal (Seamless Transition to Storefront Product Add) */}
      <Dialog
        open={Boolean(createdIntakeSuccess)}
        onOpenChange={(v) => {
          if (!v) setCreatedIntakeSuccess(null);
        }}
      >
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-emerald-600 mb-1">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Master Intake Created!
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Stock units have been allocated and assigned unique EAN-13 barcodes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/40 p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center pb-1.5 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Product Name:</span>
              <span className="font-bold text-foreground text-sm">
                {createdIntakeSuccess?.product?.name}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Style Code (SKU):</span>
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                {createdIntakeSuccess?.product?.sku}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Allocated Quantity:</span>
              <span className="font-bold text-emerald-600">
                {createdIntakeSuccess?.totalStockUnits || allocatedTotal} units across{" "}
                {createdIntakeSuccess?.totalCreatedVariants || createdIntakeSuccess?.variants?.length} variants
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Pricing &amp; Margins:</span>
              <span className="font-semibold text-foreground">
                Buy: ৳{costPrice} &rarr; Sell: ৳{basePrice} (+৳{basePrice - costPrice} profit/pc)
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              type="button"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 cursor-pointer shadow-md py-5 text-sm"
              onClick={() => {
                const prodId = createdIntakeSuccess?.product?.id;
                setCreatedIntakeSuccess(null);
                router.push(`/admin/products/new?importId=${prodId}`);
              }}
            >
              <Sparkles className="h-4 w-4" />
              Add Photos &amp; Publish to Storefront
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-1.5 cursor-pointer text-xs"
                onClick={() => {
                  setCreatedIntakeSuccess(null);
                  setPrintModalOpen(true);
                }}
              >
                <Printer className="h-3.5 w-3.5 text-blue-600" />
                Print Barcode Stickers
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setCreatedIntakeSuccess(null);
                  router.refresh();
                }}
              >
                Done (Stay in Inventory)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
