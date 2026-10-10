"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Plus, Download, ArrowLeftRight, Package } from "lucide-react";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/utils/export";
import { getWarehouses, getVariants } from "@/app/actions/admin/procurement.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addStockAction,
  transferStock,
  recordManualMovementAction,
} from "@/actions/inventory.actions";
import { StockInwardDialog } from "@/features/inventory/components/StockInwardDialog";
import { Loader2 } from "lucide-react";

// ─── Add Stock ────────────────────────────────────────────────────────────────

const addStockSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  quantity: z.coerce
    .number()
    .int("Must be a whole number")
    .positive("Quantity must be positive"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

type AddStockForm = z.infer<typeof addStockSchema>;

interface AddStockDialogProps {
  inventory: any[];
  allWarehouses?: any[];
  allVariants?: any[];
}

function AddStockDialog({ inventory, allWarehouses = [], allVariants = [] }: AddStockDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [warehousesList, setWarehousesList] = useState<any[]>(allWarehouses);
  const [variantsList, setVariantsList] = useState<any[]>(allVariants);

  useEffect(() => {
    if (allWarehouses.length > 0) setWarehousesList(allWarehouses);
    if (allVariants.length > 0) setVariantsList(allVariants);
  }, [allWarehouses, allVariants]);

  useEffect(() => {
    if (open) {
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
    }
  }, [open]);

  const form = useForm<AddStockForm>({
    resolver: zodResolver(addStockSchema),
    defaultValues: {
      variantId: "",
      warehouseId: "",
      quantity: 1,
      reason: "RESTOCK",
      notes: "",
    },
  });

  const onSubmit = async (values: AddStockForm) => {
    setLoading(true);
    const res = await addStockAction(values);
    setLoading(false);
    if (res.error) {
      toast.error("Failed to add stock", { description: res.error });
    } else {
      toast.success("Stock added successfully");
      setOpen(false);
      form.reset();
      router.refresh();
    }
  };

  // Build warehouse list from state or fallback to inventory records
  const warehouses = warehousesList.length > 0
    ? warehousesList.map((w) => ({
        id: w.id,
        name: w.name + (w.code || w.warehouse_code ? ` (${w.code || w.warehouse_code})` : ""),
      }))
    : Array.from(
        new Map(
          inventory
            .filter((i) => i.warehouses)
            .map((i) => [i.warehouse_id, { id: i.warehouse_id, name: i.warehouses?.name }])
        ).values()
      );

  // Build variants list from state or fallback to inventory records
  const variants = variantsList.length > 0
    ? variantsList.map((v) => ({
        id: v.id,
        name: v.name || `${v.sku} — ${v.product?.name || v.product_name || "Standard"}`,
      }))
    : Array.from(
        new Map(
          inventory
            .filter((i) => i.variants)
            .map((i) => [i.variant_id, { id: i.variant_id, name: `${i.variants?.sku} — ${i.variants?.name || "Standard"}` }])
        ).values()
      );

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Add Stock
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Stock</DialogTitle>
            <DialogDescription>
              Increase inventory quantity for a product variant in a warehouse.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="variantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Variant</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={variants.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={variants.length === 0 ? "Loading variants..." : "Select variant"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {variants.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={warehouses.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={warehouses.length === 0 ? "Loading warehouses..." : "Select warehouse"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity to Add</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RESTOCK">Restock</SelectItem>
                        <SelectItem value="PURCHASE_RECEIPT">Purchase Receipt</SelectItem>
                        <SelectItem value="RETURN">Customer Return</SelectItem>
                        <SelectItem value="CORRECTION">Inventory Correction</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details about this stock addition..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Stock
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Transfer Stock ───────────────────────────────────────────────────────────

const transferSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  fromWarehouseId: z.string().min(1, "Source warehouse is required"),
  toWarehouseId: z.string().min(1, "Destination warehouse is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
}).refine((d) => d.fromWarehouseId !== d.toWarehouseId, {
  message: "Source and destination warehouses must be different",
  path: ["toWarehouseId"],
});

type TransferForm = z.infer<typeof transferSchema>;

interface TransferStockDialogProps {
  allWarehouses?: any[];
  allVariants?: any[];
}

function TransferStockDialog({ allWarehouses = [], allVariants = [] }: TransferStockDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [warehousesList, setWarehousesList] = useState<any[]>(allWarehouses);
  const [variantsList, setVariantsList] = useState<any[]>(allVariants);

  useEffect(() => {
    if (allWarehouses.length > 0) setWarehousesList(allWarehouses);
    if (allVariants.length > 0) setVariantsList(allVariants);
  }, [allWarehouses, allVariants]);

  useEffect(() => {
    if (open) {
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
    }
  }, [open]);

  const form = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      variantId: "",
      fromWarehouseId: "",
      toWarehouseId: "",
      quantity: 1,
      reason: "TRANSFER",
      notes: "",
    },
  });

  const onSubmit = async (values: TransferForm) => {
    setLoading(true);
    const res = await transferStock(
      values.variantId,
      values.fromWarehouseId,
      values.toWarehouseId,
      values.quantity,
      values.reason,
      values.notes
    );
    setLoading(false);
    if (res.error) {
      toast.error("Transfer failed", { description: res.error });
    } else {
      toast.success("Stock transferred successfully");
      setOpen(false);
      form.reset();
      router.refresh();
    }
  };

  const variants = variantsList.map((v) => ({
    id: v.id,
    name: v.name || `${v.sku} — ${v.product?.name || v.product_name || "Standard"}`,
  }));

  const warehouses = warehousesList.map((w) => ({
    id: w.id,
    name: w.name + (w.code || w.warehouse_code ? ` (${w.code || w.warehouse_code})` : ""),
  }));

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ArrowLeftRight className="mr-2 h-4 w-4" /> Transfer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Stock</DialogTitle>
            <DialogDescription>
              Move inventory between warehouses. Select product variant and locations.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="variantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Variant</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={variants.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={variants.length === 0 ? "Loading variants..." : "Select variant"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {variants.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromWarehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Warehouse</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={warehouses.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={warehouses.length === 0 ? "Loading..." : "Source"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toWarehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Warehouse</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={warehouses.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={warehouses.length === 0 ? "Loading..." : "Destination"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TRANSFER">Internal Transfer</SelectItem>
                        <SelectItem value="REBALANCE">Stock Rebalancing</SelectItem>
                        <SelectItem value="FULFILLMENT_PREP">Fulfillment Preparation</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea className="resize-none" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Transfer Stock
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Record Movement ──────────────────────────────────────────────────────────

const movementSchema = z.object({
  variantId: z.string().min(1, "Product Variant is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  movementType: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]),
  toWarehouseId: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
}).refine(
  (d) => d.movementType !== "TRANSFER" || (!!d.toWarehouseId && d.toWarehouseId !== d.warehouseId),
  {
    message: "Destination warehouse is required and must differ from source",
    path: ["toWarehouseId"],
  }
);

type MovementForm = z.infer<typeof movementSchema>;

interface RecordMovementDialogProps {
  allWarehouses?: any[];
  allVariants?: any[];
}

function RecordMovementDialog({ allWarehouses = [], allVariants = [] }: RecordMovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [warehousesList, setWarehousesList] = useState<any[]>(allWarehouses);
  const [variantsList, setVariantsList] = useState<any[]>(allVariants);

  useEffect(() => {
    if (allWarehouses.length > 0) setWarehousesList(allWarehouses);
    if (allVariants.length > 0) setVariantsList(allVariants);
  }, [allWarehouses, allVariants]);

  useEffect(() => {
    if (open) {
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
    }
  }, [open]);

  const form = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      variantId: "",
      warehouseId: "",
      movementType: "IN",
      toWarehouseId: "",
      quantity: 1,
      reason: "RESTOCK",
      notes: "",
    },
  });

  const selectedType = form.watch("movementType");

  const onSubmit = async (values: MovementForm) => {
    setLoading(true);
    const res = await recordManualMovementAction(values);
    setLoading(false);
    if (res.error) {
      toast.error("Failed to record movement", { description: res.error });
    } else {
      toast.success("Movement recorded successfully");
      setOpen(false);
      form.reset();
      router.refresh();
    }
  };

  const variants = variantsList.map((v) => ({
    id: v.id,
    name: v.name || `${v.sku} — ${v.product?.name || v.product_name || "Standard"}`,
  }));

  const warehouses = warehousesList.map((w) => ({
    id: w.id,
    name: w.name + (w.code || w.warehouse_code ? ` (${w.code || w.warehouse_code})` : ""),
  }));

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Package className="mr-2 h-4 w-4" /> Record Movement
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
            <DialogDescription>
              Record an inventory adjustment, receipt, transfer, or damage deduction.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="variantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Variant</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={variants.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={variants.length === 0 ? "Loading variants..." : "Select variant"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {variants.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="movementType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Movement Type</FormLabel>
                      <Select
                        onValueChange={(val: any) => {
                          field.onChange(val);
                          if (val === "IN") form.setValue("reason", "RESTOCK");
                          else if (val === "OUT") form.setValue("reason", "DAMAGE");
                          else if (val === "TRANSFER") form.setValue("reason", "TRANSFER");
                          else if (val === "ADJUSTMENT") form.setValue("reason", "CYCLE_COUNT");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IN">IN (Receive / Restock)</SelectItem>
                          <SelectItem value="OUT">OUT (Damage / Write-off)</SelectItem>
                          <SelectItem value="TRANSFER">TRANSFER (Between Warehouses)</SelectItem>
                          <SelectItem value="ADJUSTMENT">ADJUSTMENT (Audit / Count)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{selectedType === "TRANSFER" ? "From Warehouse" : "Warehouse"}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={warehouses.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={warehouses.length === 0 ? "Loading..." : "Select warehouse"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedType === "TRANSFER" && (
                <FormField
                  control={form.control}
                  name="toWarehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Warehouse</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={warehouses.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={warehouses.length === 0 ? "Loading..." : "Select destination warehouse"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason Code</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedType === "IN" && (
                          <>
                            <SelectItem value="RESTOCK">Restock</SelectItem>
                            <SelectItem value="PURCHASE_RECEIPT">Purchase Receipt</SelectItem>
                            <SelectItem value="RETURN">Customer Return</SelectItem>
                          </>
                        )}
                        {selectedType === "OUT" && (
                          <>
                            <SelectItem value="DAMAGE">Damage Write-off</SelectItem>
                            <SelectItem value="THEFT">Theft / Shrinkage</SelectItem>
                            <SelectItem value="SUPPLIER_RETURN">Supplier Return</SelectItem>
                            <SelectItem value="EXPIRY">Expired / Obsolete</SelectItem>
                          </>
                        )}
                        {selectedType === "TRANSFER" && (
                          <>
                            <SelectItem value="TRANSFER">Internal Transfer</SelectItem>
                            <SelectItem value="REBALANCE">Stock Rebalancing</SelectItem>
                            <SelectItem value="FULFILLMENT_PREP">Fulfillment Prep</SelectItem>
                          </>
                        )}
                        {selectedType === "ADJUSTMENT" && (
                          <>
                            <SelectItem value="CYCLE_COUNT">Cycle Count Correction</SelectItem>
                            <SelectItem value="MANUAL_ADJUSTMENT">Manual Adjustment</SelectItem>
                            <SelectItem value="INITIAL_COUNT">Initial Stock Count</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea className="resize-none" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Movement
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

interface StockControlActionsProps {
  inventory?: any[];
  allWarehouses?: any[];
  allVariants?: any[];
  allSuppliers?: any[];
}

export function StockControlActions({
  inventory = [],
  allWarehouses = [],
  allVariants = [],
  allSuppliers = [],
}: StockControlActionsProps) {
  const handleExport = () => {
    if (!inventory || inventory.length === 0) {
      toast.error("No inventory data to export.");
      return;
    }
    const exportData = inventory.map((item) => ({
      SKU: item.variants?.sku,
      Name: item.variants?.name || item.variants?.product?.name,
      Warehouse: item.warehouses?.name,
      Available: item.quantity_available,
      Reserved: item.quantity_reserved,
      Incoming: item.quantity_incoming,
    }));
    exportToCsv(
      `inventory_export_${new Date().toISOString().split("T")[0]}.csv`,
      exportData
    );
    toast.success("Inventory data exported successfully.");
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleExport}>
        <Download className="mr-2 h-4 w-4" /> Export
      </Button>
      <StockInwardDialog
        inventory={inventory}
        allWarehouses={allWarehouses}
        allVariants={allVariants}
        allSuppliers={allSuppliers}
      />
    </div>
  );
}

export { StockInwardDialog };


export function StockTransferActions({
  allWarehouses = [],
  allVariants = [],
}: {
  allWarehouses?: any[];
  allVariants?: any[];
} = {}) {
  return <TransferStockDialog allWarehouses={allWarehouses} allVariants={allVariants} />;
}

export function StockMovementActions({
  allWarehouses = [],
  allVariants = [],
}: {
  allWarehouses?: any[];
  allVariants?: any[];
} = {}) {
  return <RecordMovementDialog allWarehouses={allWarehouses} allVariants={allVariants} />;
}
