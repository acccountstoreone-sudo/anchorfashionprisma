"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createDeliveryZoneSchema, CreateDeliveryZoneData } from "@/schemas/shipping.schema";
import { useCreateDeliveryZone, useUpdateDeliveryZone } from "@/hooks/shipping/use-delivery-zones";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface Props {
  initialData?: any; // any existing zone
}

export function ZoneForm({ initialData }: Props) {
  const router = useRouter();
  const createMutation = useCreateDeliveryZone();
  const updateMutation = useUpdateDeliveryZone();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateDeliveryZoneData>({
    resolver: zodResolver(createDeliveryZoneSchema),
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      description: initialData?.description || "",
      districts: initialData?.districts || [],
      is_cod_available: initialData?.is_cod_available ?? true,
      is_active: initialData?.is_active ?? true,
      estimated_days_min: initialData?.estimated_days_min || 1,
      estimated_days_max: initialData?.estimated_days_max || 3,
    },
  });

  const onSubmit = async (data: CreateDeliveryZoneData) => {
    setIsSubmitting(true);
    try {
      if (initialData) {
        await updateMutation.mutateAsync({ zoneId: initialData.id, data });
        toast.success("Zone updated successfully");
        router.push("/admin/shipping/zones");
        router.refresh();
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Zone created successfully");
        router.push("/admin/shipping/zones");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save zone");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            {initialData ? "Edit Zone" : "Create Zone"}
          </h1>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Zone"}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Zone Details</CardTitle>
              <CardDescription>Basic information about this delivery zone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Inside Dhaka" {...field} />
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
                    <FormLabel>Zone Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. INSIDE_DHAKA" {...field} />
                    </FormControl>
                    <FormDescription>Must be uppercase, numbers, and underscores.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="estimated_days_min"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Min Days</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimated_days_max"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Max Days</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings & Districts</CardTitle>
              <CardDescription>Configure where this zone applies and its settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="districts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Districts (comma separated)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Dhaka, Gazipur, Narayanganj" 
                        value={field.value.join(", ")}
                        onChange={e => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_cod_available"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Cash on Delivery</FormLabel>
                      <FormDescription>
                        Allow COD for this delivery zone.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Enable or disable this zone.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}
