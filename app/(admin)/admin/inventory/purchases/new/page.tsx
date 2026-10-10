"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  createProcurementOrder, 
  getSupplierProfiles, 
  getWarehouses,
  getVariants
} from "@/app/actions/admin/procurement.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SupplierItem {
  id: string;
  name?: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

interface WarehouseItem {
  id: string;
  name: string;
  code?: string;
  location?: string;
}

interface VariantItem {
  id: string;
  sku: string;
  name?: string;
  product_name?: string;
  title?: string;
  price?: number;
}

interface PurchaseOrderItem {
  variant_id: string;
  quantity_ordered: number;
  unit_cost: number;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  
  const [items, setItems] = useState<PurchaseOrderItem[]>([{ variant_id: "", quantity_ordered: 1, unit_cost: 0 }]);

  useEffect(() => {
    async function fetchData() {
      const [suppliersRes, warehousesRes, variantsRes] = await Promise.all([
        getSupplierProfiles(),
        getWarehouses(),
        getVariants()
      ]);
      if (suppliersRes.success && suppliersRes.data) setSuppliers(suppliersRes.data);
      if (warehousesRes.success && warehousesRes.data) setWarehouses(warehousesRes.data);
      if (variantsRes.success && variantsRes.data) setVariants(variantsRes.data);
    }
    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { variant_id: "", quantity_ordered: 1, unit_cost: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto fill unit cost if variant is selected
    if (field === "variant_id") {
      const selectedVariant = variants.find(v => v.id === value);
      if (selectedVariant && selectedVariant.price) {
        newItems[index].unit_cost = selectedVariant.price * 0.6; // Assuming cost is 60% of retail price
      }
    }
    
    setItems(newItems);
  };

  const [taxRate, setTaxRate] = useState<number>(0.05);

  const subtotal = items.reduce((acc, item) => {
    if (item.variant_id && item.quantity_ordered > 0) {
      return acc + item.quantity_ordered * (Number(item.unit_cost) || 0);
    }
    return acc;
  }, 0);
  const taxAmount = subtotal * taxRate;
  const grandTotal = subtotal + taxAmount;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const supplier_id = formData.get("supplier_id") as string;
    const destination_warehouse_id = formData.get("destination_warehouse_id") as string;
    
    if (!supplier_id) {
      toast.error("Please select a supplier. If none are available, please add one first.");
      setLoading(false);
      return;
    }
    if (!destination_warehouse_id) {
      toast.error("Please select a destination warehouse.");
      setLoading(false);
      return;
    }

    // Filter out invalid items
    const validItems = items.filter(i => i.variant_id.trim() !== "" && i.quantity_ordered > 0);
    
    if (validItems.length === 0) {
      toast.error("Please add at least one valid item with a selected product and quantity to the order.");
      setLoading(false);
      return;
    }

    const expectedDelivery = formData.get("expected_delivery_date") as string;

    const poData = {
      po_number: `PO-${Date.now().toString().slice(-6)}`,
      supplier_id,
      destination_warehouse_id,
      expected_delivery_date: expectedDelivery || undefined,
      tax_rate: taxRate,
    };

    const res = await createProcurementOrder(poData, validItems);
    setLoading(false);

    if (res.success) {
      toast.success("Purchase Order created successfully");
      router.push("/admin/inventory/purchases");
    } else {
      toast.error(res.error || "Failed to create PO");
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/inventory/purchases">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Purchase Order</h1>
          <p className="text-muted-foreground">Draft a new procurement order for your suppliers.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_id">Supplier <span className="text-destructive">*</span></Label>
                {suppliers.length > 0 ? (
                  <Select name="supplier_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-muted-foreground border border-dashed rounded-md p-3 text-center">
                    No suppliers found. <br />
                    <Link href="/admin/inventory/suppliers" className="text-primary hover:underline font-medium">Add Supplier</Link>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination_warehouse_id">Destination Warehouse <span className="text-destructive">*</span></Label>
                <Select name="destination_warehouse_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
              <Input id="expected_delivery_date" name="expected_delivery_date" type="date" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Order Items</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Line totals are automatically calculated.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => {
              const lineTotal = (item.quantity_ordered || 0) * (Number(item.unit_cost) || 0);
              return (
                <div key={index} className="flex flex-col md:flex-row gap-4 items-start md:items-end p-4 border rounded-md relative bg-muted/10">
                  <div className="space-y-2 flex-1 w-full">
                    <Label>Product Variant</Label>
                    <Select 
                      value={item.variant_id}
                      onValueChange={(val) => handleItemChange(index, "variant_id", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product variant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {variants.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 w-full md:w-28">
                    <Label>Quantity</Label>
                    <Input 
                      type="number" 
                      required 
                      min="1" 
                      value={item.quantity_ordered}
                      onChange={(e) => handleItemChange(index, "quantity_ordered", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-32">
                    <Label>Unit Cost (BDT)</Label>
                    <Input 
                      type="number" 
                      required 
                      min="0" 
                      step="0.01" 
                      value={item.unit_cost}
                      onChange={(e) => handleItemChange(index, "unit_cost", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-32">
                    <Label className="text-muted-foreground">Line Total</Label>
                    <div className="h-10 px-3 py-2 border rounded-md bg-muted/40 font-semibold text-sm flex items-center">
                      BDT {lineTotal.toFixed(2)}
                    </div>
                  </div>
                  {items.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive md:mb-0.5 absolute top-2 right-2 md:relative md:top-0 md:right-0"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items Subtotal</span>
              <span className="font-semibold">BDT {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tax / VAT</span>
                <Select
                  value={taxRate.toString()}
                  onValueChange={(val) => setTaxRate(parseFloat(val || "0"))}
                >
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="0.05">5% VAT</SelectItem>
                    <SelectItem value="0.10">10% VAT</SelectItem>
                    <SelectItem value="0.15">15% VAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="font-semibold">BDT {taxAmount.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-base font-bold">
              <span>Grand Total</span>
              <span className="text-primary">BDT {grandTotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/inventory/purchases">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading || suppliers.length === 0}>
            {loading ? "Creating..." : `Create Purchase Order (BDT ${grandTotal.toFixed(2)})`}
          </Button>
        </div>
      </form>
    </div>
  );
}
