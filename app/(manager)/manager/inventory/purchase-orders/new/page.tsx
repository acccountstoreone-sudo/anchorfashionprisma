"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  createPurchaseOrderAction, 
  getSuppliersAction, 
  getWarehousesAction 
} from "@/app/actions/manager/procurement.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Supplier, Warehouse } from "@/types/inventory.types";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  const [items, setItems] = useState([{ variant_id: "", quantity_ordered: 1, unit_cost: 0 }]);

  useEffect(() => {
    async function fetchData() {
      const [suppliersRes, warehousesRes] = await Promise.all([
        getSuppliersAction(),
        getWarehousesAction()
      ]);
      if (suppliersRes.success && suppliersRes.data) setSuppliers(suppliersRes.data);
      if (warehousesRes.success && warehousesRes.data) setWarehouses(warehousesRes.data);
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
    setItems(newItems);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const supplier_id = formData.get("supplier_id") as string;
    const destination_warehouse_id = formData.get("destination_warehouse_id") as string;
    
    if (!supplier_id || !destination_warehouse_id) {
      toast.error("Please select a supplier and destination warehouse.");
      setLoading(false);
      return;
    }

    // Filter out invalid items
    const validItems = items.filter(i => 
      i.variant_id.trim() !== "" && 
      i.quantity_ordered > 0 && 
      !isNaN(i.unit_cost)
    );
    
    if (validItems.length === 0) {
      toast.error("Please add at least one valid item to the order.");
      setLoading(false);
      return;
    }

    const totalAmount = validItems.reduce((acc, item) => acc + (item.quantity_ordered * item.unit_cost), 0);
    const expectedDelivery = formData.get("expected_delivery_date") as string;

    const poData = {
      po_number: `PO-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`, // Unique date + random chars
      supplier_id,
      destination_warehouse_id,
      status: "DRAFT" as const,
      total_amount: totalAmount,
      expected_delivery_date: expectedDelivery || undefined
    };

    const formattedItems = validItems.map(item => ({
      ...item,
      quantity_received: 0, // Initial value
    }));

    const res = await createPurchaseOrderAction(poData, formattedItems as any);
    setLoading(false);

    if (res.success) {
      toast.success("Purchase Order created successfully");
      router.push("/manager/inventory/purchase-orders");
    } else {
      toast.error(res.error || "Failed to create PO");
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/manager/inventory/purchase-orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Purchase Order</h1>
          <p className="text-muted-foreground">Draft a new order for your suppliers.</p>
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
                <Select name="supplier_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <CardTitle>Order Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-4 items-start md:items-end p-4 border rounded-md relative">
                <div className="space-y-2 flex-1 w-full">
                  <Label>Variant ID / SKU</Label>
                  <Input 
                    required 
                    placeholder="e.g. var_123456" 
                    value={item.variant_id}
                    onChange={(e) => handleItemChange(index, "variant_id", e.target.value)}
                  />
                </div>
                <div className="space-y-2 w-full md:w-32">
                  <Label>Quantity</Label>
                  <Input 
                    type="number" 
                    required 
                    min="1" 
                    value={item.quantity_ordered || ""}
                    onChange={(e) => handleItemChange(index, "quantity_ordered", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2 w-full md:w-32">
                  <Label>Unit Cost ($)</Label>
                  <Input 
                    type="number" 
                    required 
                    min="0" 
                    step="0.01" 
                    value={item.unit_cost || ""}
                    onChange={(e) => handleItemChange(index, "unit_cost", parseFloat(e.target.value) || 0)}
                  />
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
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" asChild>
            <Link href="/manager/inventory/purchase-orders">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
