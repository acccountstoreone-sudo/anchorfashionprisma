"use client";

import { useRouter } from "next/navigation";
import { createSupplierAction } from "@/app/actions/manager/procurement.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const supplierSchema = z.object({
  name: z.string().trim().min(2, "Supplier name must be at least 2 characters"),
  contact_email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .or(z.literal(""))
    .optional(),
  contact_phone: z.string().trim().optional(),
  lead_time_days: z.coerce.number().int().min(0, "Lead time must be 0 or more days"),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export default function NewSupplierPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contact_email: "",
      contact_phone: "",
      lead_time_days: 7,
    },
  });

  async function onSubmit(values: SupplierFormValues) {
    try {
      const supplier = {
        name: values.name,
        contact_email: values.contact_email || "",
        contact_phone: values.contact_phone || "",
        lead_time_days: Number(values.lead_time_days ?? 7),
        rating: 0,
      };

      const res = await createSupplierAction(supplier);

      if (res.success) {
        toast.success("Supplier created successfully");
        router.push("/manager/inventory/suppliers");
      } else {
        toast.error(res.error || "Failed to create supplier");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong creating supplier");
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/manager/inventory/suppliers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Supplier</h1>
          <p className="text-muted-foreground">Add a new vendor to your procurement list.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Supplier Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Acme Corp"
                {...register("name")}
                className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="contact@acme.com"
                  {...register("contact_email")}
                  className={errors.contact_email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.contact_email && (
                  <p className="text-xs text-destructive">{errors.contact_email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  {...register("contact_phone")}
                  className={errors.contact_phone ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.contact_phone && (
                  <p className="text-xs text-destructive">{errors.contact_phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead_time_days">Default Lead Time (Days)</Label>
              <Input
                id="lead_time_days"
                type="number"
                min="0"
                {...register("lead_time_days")}
                className={errors.lead_time_days ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.lead_time_days ? (
                <p className="text-xs text-destructive">{errors.lead_time_days.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Average number of days it takes for them to deliver an order.</p>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" type="button" asChild>
                <Link href="/manager/inventory/suppliers">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Supplier"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
