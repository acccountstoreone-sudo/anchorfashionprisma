"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  ScanBarcode,
  Camera,
  CameraOff,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  Package,
  Warehouse,
  Loader2,
  ArrowRight,
  History,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  lookupBarcodeAction,
  adjustScannedStockAction,
} from "@/actions/admin/scan.actions";

export function ScanStationClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState<any | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");

  // Adjustment Controls
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustNote, setAdjustNote] = useState<string>("");
  const [adjusting, setAdjusting] = useState(false);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scan History
  const [history, setHistory] = useState<
    Array<{ sku: string; name: string; barcode?: string; time: string }>
  >([]);

  // Stop camera tracks cleanly
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start Camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported by your browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Check if native BarcodeDetector is supported
      if ("BarcodeDetector" in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ["code_128", "code_39", "ean_13", "ean_8", "qr_code", "upc_a", "upc_e"],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const detectedCode = barcodes[0].rawValue;
                if (detectedCode) {
                  stopCamera();
                  toast.success(`Barcode detected: ${detectedCode}`);
                  handleLookup(detectedCode);
                }
              }
            } catch (err) {
              // detection frame error, ignore
            }
          }
        }, 500);
      } else {
        toast.info("Native scanner not available in this browser. Point camera or use manual input.");
      }
    } catch (err: any) {
      console.error("[startCamera]", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please grant camera access."
          : err.message || "Failed to initialize camera."
      );
      setCameraActive(false);
    }
  };

  const handleLookup = async (codeToSearch?: string) => {
    const term = codeToSearch || query;
    if (!term.trim()) {
      toast.error("Please enter a SKU or barcode");
      return;
    }

    setLoading(true);
    const res = await lookupBarcodeAction(term);
    setLoading(false);

    if (res.success && res.data) {
      setScannedData(res.data.variant);
      setWarehouses(res.data.warehouses || []);
      if (res.data.warehouses?.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(res.data.warehouses[0].id);
      }

      // Add to session history
      const v: any = res.data.variant;
      const productName = Array.isArray(v.product) ? v.product[0]?.name : v.product?.name || "Product";
      setHistory((prev) => [
        {
          sku: v.sku,
          name: productName,
          barcode: v.barcode || undefined,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev.filter((h) => h.sku !== v.sku).slice(0, 4),
      ]);

      toast.success(`Found: ${productName || v.sku}`);
    } else {
      toast.error(res.error || "No matching product found");
      setScannedData(null);
    }
  };

  const handleQuickAdjust = async (type: "IN" | "OUT", delta: number) => {
    if (!scannedData || !selectedWarehouseId) {
      toast.error("Please select a target warehouse facility");
      return;
    }

    setAdjusting(true);
    const res = await adjustScannedStockAction({
      variantId: scannedData.id,
      warehouseId: selectedWarehouseId,
      deltaQuantity: delta,
      movementType: type,
      note: adjustNote || undefined,
    });
    setAdjusting(false);

    if (res.success && res.data) {
      toast.success(
        `Stock updated (${type === "IN" ? "+" : "-"}${delta} units). New level: ${res.data.newQuantity}`
      );
      setAdjustNote("");
      // Refresh scanned data
      handleLookup(scannedData.sku);
    } else {
      toast.error(res.error || "Failed to adjust stock");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl flex items-center gap-2">
          <ScanBarcode className="h-7 w-7 text-[#C9A86A]" />
          Barcode & QR Scan Station
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          High-throughput barcode scanning, instant stock lookup, and quick inbound/outbound adjustments.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Scanner & Input (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Manual Input Search Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Scan or Enter Code</CardTitle>
              <CardDescription>
                Use a physical USB scanner, mobile camera, or type SKU / Barcode manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ScanBarcode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Scan barcode or type SKU (e.g. TSH-BLK-M)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                    className="pl-9 font-mono text-sm"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={() => handleLookup()}
                  disabled={loading}
                  className="bg-[#C9A86A] text-white hover:bg-[#b09156] shrink-0"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-1.5" />}
                  Lookup
                </Button>
              </div>

              {/* Camera Scanner Toggle */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={cameraActive ? "destructive" : "outline"}
                    size="sm"
                    onClick={cameraActive ? stopCamera : startCamera}
                    className="text-xs"
                  >
                    {cameraActive ? (
                      <>
                        <CameraOff className="mr-1.5 h-3.5 w-3.5" /> Stop Camera
                      </>
                    ) : (
                      <>
                        <Camera className="mr-1.5 h-3.5 w-3.5" /> Start Camera Scanner
                      </>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {cameraActive ? "Camera viewfinder active" : "Use device webcam / camera"}
                  </span>
                </div>
              </div>

              {/* Camera Video Viewfinder */}
              {cameraActive && (
                <div className="relative rounded-lg overflow-hidden border border-border bg-black aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Target Box Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-56 h-36 border-2 border-[#C9A86A] rounded-lg shadow-lg relative animate-pulse">
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 shadow-sm" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 text-xs text-white/80 bg-black/60 px-2.5 py-1 rounded">
                    Align barcode within gold frame
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scanned Result Details Card */}
          {scannedData ? (
            <Card className="border-border bg-card border-2 border-[#C9A86A]/40 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {scannedData.product?.name || "Product"}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs mt-0.5">
                      SKU: {scannedData.sku} {scannedData.barcode ? `• Barcode: ${scannedData.barcode}` : ""}
                    </CardDescription>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    ৳{parseFloat(scannedData.sale_price || scannedData.price_override || scannedData.product?.base_price || 0).toLocaleString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-5">
                {/* Warehouse Inventory Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Warehouse className="h-3.5 w-3.5 text-[#C9A86A]" />
                    Facility Stock Breakdown
                  </h4>
                  <div className="rounded-md border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border bg-muted/40">
                          <TableHead className="py-2 font-semibold text-xs">Warehouse</TableHead>
                          <TableHead className="py-2 font-semibold text-xs text-center">Available</TableHead>
                          <TableHead className="py-2 font-semibold text-xs text-center">Reserved</TableHead>
                          <TableHead className="py-2 font-semibold text-xs text-right">Reorder Alert</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(scannedData.inventory_levels || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground">
                              No inventory levels recorded across warehouses.
                            </TableCell>
                          </TableRow>
                        ) : (
                          scannedData.inventory_levels.map((lvl: any) => (
                            <TableRow key={lvl.id} className="border-b border-border/40">
                              <TableCell className="py-2 text-xs font-medium">
                                {lvl.warehouse?.name || "Warehouse"} ({lvl.warehouse?.code || "WH"})
                              </TableCell>
                              <TableCell className="py-2 text-xs font-bold text-center text-emerald-500">
                                {lvl.quantity_available} units
                              </TableCell>
                              <TableCell className="py-2 text-xs text-center text-muted-foreground">
                                {lvl.quantity_reserved} units
                              </TableCell>
                              <TableCell className="py-2 text-xs text-right">
                                {lvl.quantity_available <= lvl.reorder_point ? (
                                  <span className="text-amber-500 font-semibold">Low Stock</span>
                                ) : (
                                  <span className="text-muted-foreground">Normal</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Quick Stock Adjustment Section */}
                <div className="rounded-lg bg-muted/30 p-4 border border-border space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quick Stock Action
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Target Facility</Label>
                      <select
                        value={selectedWarehouseId}
                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Custom Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={adjustQty}
                        onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Audit / Batch Note (Optional)</Label>
                    <Input
                      placeholder="e.g. Received from Supplier Box #3"
                      value={adjustNote}
                      onChange={(e) => setAdjustNote(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      disabled={adjusting}
                      onClick={() => handleQuickAdjust("IN", 1)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Receive +1
                    </Button>
                    <Button
                      size="sm"
                      disabled={adjusting}
                      onClick={() => handleQuickAdjust("IN", adjustQty)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Receive +{adjustQty}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={adjusting}
                      onClick={() => handleQuickAdjust("OUT", 1)}
                      className="text-xs h-8 border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                    >
                      <Minus className="mr-1 h-3.5 w-3.5" /> Dispatch -1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={adjusting}
                      onClick={() => handleQuickAdjust("OUT", adjustQty)}
                      className="text-xs h-8 border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                    >
                      <Minus className="mr-1 h-3.5 w-3.5" /> Dispatch -{adjustQty}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="py-12 text-center text-muted-foreground">
                <ScanBarcode className="mx-auto h-12 w-12 opacity-30 mb-2" />
                <p className="text-sm">Scan a barcode or type a SKU to inspect product and update inventory.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Scan Station Guide & Recent Scans (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Quick Operations Guide */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Scan Station Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2.5">
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-[#C9A86A]/20 text-[#C9A86A] flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <p>Plug in standard USB / Bluetooth barcode scanners directly into your computer or tablet.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-[#C9A86A]/20 text-[#C9A86A] flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <p>Hardware scanners simulate keyboard input and auto-submit on scan.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-[#C9A86A]/20 text-[#C9A86A] flex items-center justify-center font-bold shrink-0">
                  3
                </div>
                <p>Stock adjustments automatically generate atomic database entries in `stock_movements` for audit compliance.</p>
              </div>
            </CardContent>
          </Card>

          {/* Session Scan History */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-[#C9A86A]" />
                Recent Scans in Session
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No barcodes scanned in this session yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {history.map((h, i) => (
                    <div
                      key={i}
                      onClick={() => handleLookup(h.sku)}
                      className="p-3 text-xs flex items-center justify-between hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{h.name}</div>
                        <div className="font-mono text-muted-foreground mt-0.5">SKU: {h.sku}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground">{h.time}</span>
                        <div className="text-[#C9A86A] font-medium text-[11px] mt-0.5">Re-select →</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
