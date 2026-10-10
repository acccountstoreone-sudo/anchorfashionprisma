"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Loader2, Building2, MapPin, Phone, SlidersHorizontal, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWarehouse, updateWarehouse } from "@/actions/warehouse.actions";
import { Warehouse } from "@/types/inventory.types";

export const warehouseFormSchema = z.object({
  // Basic Information
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must be 20 characters or less")
    .regex(/^[A-Za-z0-9_-]+$/, "Code must contain only letters, numbers, hyphens, and underscores"),
  operational_type: z.string().min(1, "Warehouse type is required"),
  capacity_sqft: z.coerce.number().optional(),

  // Location
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("Bangladesh"),
  postal_code: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),

  // Contact
  manager_name: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),

  // Settings
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  allow_negative_stock: z.boolean().default(false),
  enable_stock_tracking: z.boolean().default(true),
  enable_batch_tracking: z.boolean().default(false),
  enable_serial_tracking: z.boolean().default(false),

  // Description
  notes: z.string().optional(),
  description: z.string().optional(),
});

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;

export function AddWarehouseButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      name: "",
      code: "",
      operational_type: "MAIN_WAREHOUSE",
      capacity_sqft: undefined,
      address: "",
      city: "",
      state: "",
      country: "Bangladesh",
      postal_code: "",
      manager_name: "",
      contact_person: "",
      phone: "",
      email: "",
      is_active: true,
      is_default: false,
      allow_negative_stock: false,
      enable_stock_tracking: true,
      enable_batch_tracking: false,
      enable_serial_tracking: false,
      notes: "",
      description: "",
    },
  });

  const onSubmit = async (values: WarehouseFormValues) => {
    setLoading(true);
    // Map operational_type to DB check constraint type ('WAREHOUSE' or 'RETAIL_STORE')
    const dbType = values.operational_type === "STORE" ? "RETAIL_STORE" : "WAREHOUSE";

    const res = await createWarehouse({
      ...values,
      type: dbType,
      code: values.code.trim().toUpperCase(),
    });
    setLoading(false);

    if (res.error) {
      toast.error("Failed to create warehouse", { description: res.error });
    } else {
      toast.success(`Warehouse "${values.name}" created successfully!`);
      setOpen(false);
      form.reset();
      router.refresh();
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" /> Add Warehouse
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Add New Warehouse
            </DialogTitle>
            <DialogDescription>
              Create a new physical storage facility, distribution node, or retail branch.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="basic" className="text-xs sm:text-sm">
                    <Building2 className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
                    Basic Info
                  </TabsTrigger>
                  <TabsTrigger value="location" className="text-xs sm:text-sm">
                    <MapPin className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
                    Location
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs sm:text-sm">
                    <Phone className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
                    Contact
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs sm:text-sm">
                    <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                {/* 1. BASIC INFORMATION TAB */}
                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warehouse Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Dhaka Central Hub"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                if (!form.getValues("code")) {
                                  const auto = e.target.value
                                    .replace(/[^A-Za-z0-9]/g, "")
                                    .slice(0, 5)
                                    .toUpperCase();
                                  form.setValue("code", auto ? `WH-${auto}` : "");
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warehouse Code *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. WH-DHK-01"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">Unique identifier code</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="operational_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warehouse Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MAIN_WAREHOUSE">Main Warehouse</SelectItem>
                              <SelectItem value="DISTRIBUTION_CENTER">Distribution Center</SelectItem>
                              <SelectItem value="STORE">Store / Retail Outlet</SelectItem>
                              <SelectItem value="FACTORY">Factory / Production</SelectItem>
                              <SelectItem value="TRANSIT_WAREHOUSE">Transit Warehouse</SelectItem>
                              <SelectItem value="OTHER">Other Location</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capacity_sqft"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storage Capacity (Sq. Ft)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g. 25000"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Operational notes, primary distribution scope, logistics partners..."
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* 2. LOCATION TAB */}
                <TabsContent value="location" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Plot 12, Road 4, Tejgaon Industrial Area" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Dhaka" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State / Division</FormLabel>
                          <FormControl>
                            <Input placeholder="Dhaka Division" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="Bangladesh" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="1208" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude (GPS)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="23.8103"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude (GPS)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="90.4125"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* 3. CONTACT TAB */}
                <TabsContent value="contact" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="manager_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warehouse Manager</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Md. Anwar Hossain" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_person"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person / Supervisor</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Tanvir Ahmed" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+880 1712-345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="warehouse@anchorfashion.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* 4. SETTINGS & POLICIES TAB */}
                <TabsContent value="settings" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 gap-3 border rounded-lg p-4 bg-muted/20">
                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-1">
                          <div>
                            <FormLabel className="font-semibold cursor-pointer">Active Status</FormLabel>
                            <FormDescription className="text-xs">
                              Inactive warehouses cannot receive new stock or participate in active transfers.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="border-t my-1" />

                    <FormField
                      control={form.control}
                      name="is_default"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-1">
                          <div>
                            <FormLabel className="font-semibold cursor-pointer">Default Warehouse</FormLabel>
                            <FormDescription className="text-xs">
                              Designate this warehouse as primary fulfillment origin.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="border-t my-1" />

                    <FormField
                      control={form.control}
                      name="allow_negative_stock"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-1">
                          <div>
                            <FormLabel className="font-semibold cursor-pointer">Allow Negative Stock</FormLabel>
                            <FormDescription className="text-xs">
                              Permits dispatch operations even when inventory counters indicate zero available.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="border-t my-1" />

                    <FormField
                      control={form.control}
                      name="enable_stock_tracking"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-1">
                          <div>
                            <FormLabel className="font-semibold cursor-pointer">Enable Stock Tracking</FormLabel>
                            <FormDescription className="text-xs">
                              Maintain real-time ledger updates on every purchase, dispatch, and movement.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="border-t my-1" />

                    <FormField
                      control={form.control}
                      name="enable_batch_tracking"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-1">
                          <div>
                            <FormLabel className="font-semibold cursor-pointer">Batch / Lot Tracking</FormLabel>
                            <FormDescription className="text-xs">
                              Require batch numbers on incoming goods receipts and dispatches.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="border-t my-1" />

                    <FormField
                      control={form.control}
                      name="enable_serial_tracking"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-1">
                          <div>
                            <FormLabel className="font-semibold cursor-pointer">Serial Number Tracking</FormLabel>
                            <FormDescription className="text-xs">
                              Trace items down to distinct serialized units.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operational Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Special security requirements, dock timings, access restrictions..."
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Warehouse
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Edit Warehouse / Settings Dialog ─────────────────────────────────────────

export function ManageWarehouseSettingsButton({
  warehouse,
  variant = "outline",
  size = "icon",
}: {
  warehouse: Warehouse;
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      name: warehouse.name || "",
      code: warehouse.code || warehouse.warehouse_code || "",
      operational_type: warehouse.operational_type || (warehouse.type === "RETAIL_STORE" ? "STORE" : "MAIN_WAREHOUSE"),
      capacity_sqft: warehouse.capacity_sqft,
      address: warehouse.address || "",
      city: warehouse.city || "",
      state: warehouse.state || "",
      country: warehouse.country || "Bangladesh",
      postal_code: warehouse.postal_code || "",
      latitude: warehouse.latitude,
      longitude: warehouse.longitude,
      manager_name: warehouse.manager_name || "",
      contact_person: warehouse.contact_person || "",
      phone: warehouse.phone || "",
      email: warehouse.email || "",
      is_active: warehouse.is_active !== undefined ? warehouse.is_active : true,
      is_default: warehouse.is_default || false,
      allow_negative_stock: warehouse.allow_negative_stock || false,
      enable_stock_tracking: warehouse.enable_stock_tracking !== undefined ? warehouse.enable_stock_tracking : true,
      enable_batch_tracking: warehouse.enable_batch_tracking || false,
      enable_serial_tracking: warehouse.enable_serial_tracking || false,
      notes: warehouse.notes || "",
      description: warehouse.description || "",
    },
  });

  const onSubmit = async (values: WarehouseFormValues) => {
    setLoading(true);
    const dbType = values.operational_type === "STORE" ? "RETAIL_STORE" : "WAREHOUSE";

    const res = await updateWarehouse(warehouse.id, {
      ...values,
      type: dbType,
      code: values.code.trim().toUpperCase(),
    });
    setLoading(false);

    if (res.error) {
      toast.error("Failed to update warehouse", { description: res.error });
    } else {
      toast.success(`Warehouse "${values.name}" updated successfully!`);
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => {
          form.reset({
            name: warehouse.name || "",
            code: warehouse.code || warehouse.warehouse_code || "",
            operational_type: warehouse.operational_type || (warehouse.type === "RETAIL_STORE" ? "STORE" : "MAIN_WAREHOUSE"),
            capacity_sqft: warehouse.capacity_sqft,
            address: warehouse.address || "",
            city: warehouse.city || "",
            state: warehouse.state || "",
            country: warehouse.country || "Bangladesh",
            postal_code: warehouse.postal_code || "",
            latitude: warehouse.latitude,
            longitude: warehouse.longitude,
            manager_name: warehouse.manager_name || "",
            contact_person: warehouse.contact_person || "",
            phone: warehouse.phone || "",
            email: warehouse.email || "",
            is_active: warehouse.is_active !== undefined ? warehouse.is_active : true,
            is_default: warehouse.is_default || false,
            allow_negative_stock: warehouse.allow_negative_stock || false,
            enable_stock_tracking: warehouse.enable_stock_tracking !== undefined ? warehouse.enable_stock_tracking : true,
            enable_batch_tracking: warehouse.enable_batch_tracking || false,
            enable_serial_tracking: warehouse.enable_serial_tracking || false,
            notes: warehouse.notes || "",
            description: warehouse.description || "",
          });
          setOpen(true);
        }}
        title="Warehouse Settings"
      >
        <Settings className="h-4 w-4" />
        {size !== "icon" && <span className="ml-2">Settings</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Edit Warehouse: {warehouse.name}
            </DialogTitle>
            <DialogDescription>
              Configure locations, capacity, staff contacts, and inventory management policies.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Info</TabsTrigger>
                  <TabsTrigger value="location" className="text-xs sm:text-sm">Location</TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs sm:text-sm">Contact</TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
                </TabsList>

                {/* BASIC INFO */}
                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warehouse Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warehouse Code *</FormLabel>
                          <FormControl>
                            <Input {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="operational_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warehouse Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MAIN_WAREHOUSE">Main Warehouse</SelectItem>
                              <SelectItem value="DISTRIBUTION_CENTER">Distribution Center</SelectItem>
                              <SelectItem value="STORE">Store / Retail Outlet</SelectItem>
                              <SelectItem value="FACTORY">Factory / Production</SelectItem>
                              <SelectItem value="TRANSIT_WAREHOUSE">Transit Warehouse</SelectItem>
                              <SelectItem value="OTHER">Other Location</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capacity_sqft"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storage Capacity (Sq. Ft)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Description</FormLabel>
                        <FormControl>
                          <Textarea className="resize-none" rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* LOCATION */}
                <TabsContent value="location" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State / Division</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude (GPS)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude (GPS)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* CONTACT */}
                <TabsContent value="contact" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="manager_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warehouse Manager</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_person"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person / Supervisor</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* SETTINGS */}
                <TabsContent value="settings" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 gap-3 border rounded-lg p-4 bg-muted/20">
                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-1">
                          <div>
                            <FormLabel className="font-semibold cursor-pointer">Active Status</FormLabel>
                            <FormDescription className="text-xs">
                              Inactive warehouses cannot receive new stock.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="border-t my-1" />

                    <FormField
                      control={form.control}
                      name="is_default"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-1">
                          <div>
                            <FormLabel className="font-semibold cursor-pointer">Default Warehouse</FormLabel>
                            <FormDescription className="text-xs">
                              Designate this warehouse as primary fulfillment origin.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="border-t my-1" />

                    <FormField
                      control={form.control}
                      name="allow_negative_stock"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-1">
                          <div>
                            <FormLabel className="font-semibold cursor-pointer">Allow Negative Stock</FormLabel>
                            <FormDescription className="text-xs">
                              Permit stock removals even if quantity reaches below zero.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="border-t my-1" />

                    <FormField
                      control={form.control}
                      name="enable_stock_tracking"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-1">
                          <div>
                            <FormLabel className="font-semibold cursor-pointer">Enable Stock Tracking</FormLabel>
                            <FormDescription className="text-xs">
                              Log inventory ledger updates on every transaction.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="border-t my-1" />

                    <FormField
                      control={form.control}
                      name="enable_batch_tracking"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-1">
                          <div>
                            <FormLabel className="font-semibold cursor-pointer">Batch / Lot Tracking</FormLabel>
                            <FormDescription className="text-xs">
                              Require batch numbers on incoming receipts.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="border-t my-1" />

                    <FormField
                      control={form.control}
                      name="enable_serial_tracking"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-1">
                          <div>
                            <FormLabel className="font-semibold cursor-pointer">Serial Number Tracking</FormLabel>
                            <FormDescription className="text-xs">
                              Trace inventory at the individual serial unit level.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operational Notes</FormLabel>
                        <FormControl>
                          <Textarea className="resize-none" rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
