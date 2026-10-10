"use client";

import { useState, useTransition } from "react";
import { CustomerAddress } from "@/types/customer.types";
import {
  createAddressAction,
  deleteAddressAction,
} from "@/app/actions/customer.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const addressSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().min(7, "Valid phone number is required"),
  address_line_1: z.string().trim().min(3, "Address is required"),
  address_line_2: z.string().trim().optional(),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(1, "State / Division is required"),
  zip: z.string().trim().min(1, "ZIP / Postal code is required"),
  country: z.string().trim().min(1, "Country is required"),
  is_default_shipping: z.boolean().default(false),
  is_default_billing: z.boolean().default(false),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressBookProps {
  addresses: CustomerAddress[];
}

export function AddressBook({ addresses }: AddressBookProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      zip: "",
      country: "BD",
      is_default_shipping: false,
      is_default_billing: false,
    },
  });

  const onSubmit = (values: AddressFormValues) => {
    const formData = new FormData();
    formData.append("first_name", values.first_name);
    formData.append("last_name", values.last_name);
    formData.append("phone", values.phone);
    formData.append("address_line_1", values.address_line_1);
    if (values.address_line_2) formData.append("address_line_2", values.address_line_2);
    formData.append("city", values.city);
    formData.append("state", values.state);
    formData.append("zip", values.zip);
    formData.append("country", values.country);
    formData.append("is_default_shipping", values.is_default_shipping ? "true" : "false");
    formData.append("is_default_billing", values.is_default_billing ? "true" : "false");

    startTransition(async () => {
      try {
        await createAddressAction(formData);
        toast.success("Address added successfully");
        reset();
        setIsOpen(false);
      } catch (error: any) {
        toast.error(error.message || "Failed to add address");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteAddressAction(id);
        toast.success("Address deleted successfully");
      } catch (error) {
        toast.error("Failed to delete address");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Saved Addresses</h2>
        <Dialog
          open={isOpen}
          onOpenChange={(val) => {
            setIsOpen(val);
            if (!val) reset();
          }}
        >
          <DialogTrigger render={<Button />}>Add New Address</DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Address</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addr_first_name">First Name</Label>
                  <Input
                    id="addr_first_name"
                    {...register("first_name")}
                    className={errors.first_name ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.first_name && (
                    <p className="text-xs text-destructive">{errors.first_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addr_last_name">Last Name</Label>
                  <Input
                    id="addr_last_name"
                    {...register("last_name")}
                    className={errors.last_name ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.last_name && (
                    <p className="text-xs text-destructive">{errors.last_name.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr_phone">Phone Number</Label>
                <Input
                  id="addr_phone"
                  {...register("phone")}
                  className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_line_1">Address Line 1</Label>
                <Input
                  id="address_line_1"
                  {...register("address_line_1")}
                  className={errors.address_line_1 ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.address_line_1 && (
                  <p className="text-xs text-destructive">{errors.address_line_1.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_line_2">
                  Address Line 2 (Optional)
                </Label>
                <Input id="address_line_2" {...register("address_line_2")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addr_city">City</Label>
                  <Input
                    id="addr_city"
                    {...register("city")}
                    className={errors.city ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.city && (
                    <p className="text-xs text-destructive">{errors.city.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addr_state">State / Province</Label>
                  <Input
                    id="addr_state"
                    {...register("state")}
                    className={errors.state ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.state && (
                    <p className="text-xs text-destructive">{errors.state.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addr_zip">ZIP / Postal Code</Label>
                  <Input
                    id="addr_zip"
                    {...register("zip")}
                    className={errors.zip ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.zip && (
                    <p className="text-xs text-destructive">{errors.zip.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addr_country">Country</Label>
                  <Input
                    id="addr_country"
                    {...register("country")}
                    className={errors.country ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.country && (
                    <p className="text-xs text-destructive">{errors.country.message}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_default_shipping">
                  Set as Default Shipping
                </Label>
                <Controller
                  name="is_default_shipping"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="is_default_shipping"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_default_billing">
                  Set as Default Billing
                </Label>
                <Controller
                  name="is_default_billing"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="is_default_billing"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Address"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {addresses.length === 0 ? (
          <div className="col-span-full rounded-lg border bg-muted/20 py-8 text-center text-muted-foreground">
            No addresses saved yet.
          </div>
        ) : (
          addresses.map((address) => (
            <Card key={address.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    {address.first_name} {address.last_name}
                  </CardTitle>
                  <div className="flex gap-2">
                    {address.is_default_shipping && (
                      <span className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                        Shipping
                      </span>
                    )}
                    {address.is_default_billing && (
                      <span className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                        Billing
                      </span>
                    )}
                  </div>
                </div>
                <CardDescription>{address.phone}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{address.address_line_1}</p>
                {address.address_line_2 && <p>{address.address_line_2}</p>}
                <p>
                  {address.city}, {address.state} {address.zip}
                </p>
                <p>{address.country}</p>
              </CardContent>
              <CardFooter className="justify-end gap-2 pt-0">
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(address.id)}
                  disabled={isPending}
                >
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
