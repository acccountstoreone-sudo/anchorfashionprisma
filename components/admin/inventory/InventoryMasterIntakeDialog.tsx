"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInventoryMasterIntakeAction, generateEAN13Sync } from "@/lib/actions/admin/inventory-master.actions";
import { PrintBarcodeModal, BarcodeLabelData } from "@/components/admin/inventory/PrintBarcodeModal";
import { toast } from "sonner";
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
} from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
}

interface InventoryMasterIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  onSuccess?: () => void;
}

const PRESET_COLORS = ["Black", "Navy Blue", "White", "Maroon", "Olive Green", "Charcoal Grey", "Beige", "Sky Blue"];
const PRESET_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];

export function InventoryMasterIntakeDialog({
  open,
  onOpenChange,
  categories = [],
  onSuccess,
}: InventoryMasterIntakeDialogProps) {
  // Master Details
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [basePrice, setBasePrice] = useState<number>(5000);
  const [costPrice, setCostPrice] = useState<number>(2300);
  const [totalQuantity, setTotalQuantity] = useState<number>(100);
  const [notes, setNotes] = useState("");

  // Variants selection
  const [selectedColors, setSelectedColors] = useState<string[]>(["Black", "Navy Blue"]);
  const [newColorInput, setNewColorInput] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["M", "L", "XL", "XXL"]);
  const [newSizeInput, setNewSizeInput] = useState("");

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

        if (onSuccess) onSuccess();
        onOpenChange(false);

        // Prompt to print stickers
        setPrintModalOpen(true);
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
            {/* Step 1: Core Product & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">1. Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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
                  placeholder="e.g. Royal Oxford Premium Cotton Shirt"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
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

            {/* Step 4: Sizes Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">4. Select Available Sizes</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SIZES.map((size) => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <Badge
                      key={size}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1 text-xs transition-all"
                      onClick={() => toggleSize(size)}
                    >
                      {size}
                      {isSelected && <span className="ml-1 text-xs opacity-70">✓</span>}
                    </Badge>
                  );
                })}
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
    </>
  );
}
