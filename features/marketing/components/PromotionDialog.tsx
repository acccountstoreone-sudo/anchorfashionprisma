"use client";

import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Sparkles,
  Upload,
  Image as ImageIcon,
  X,
  Link as LinkIcon,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import {
  promotionSchema,
  PromotionFormValues,
} from "@/validators/marketing.schema";
import { PromotionRecord } from "@/lib/repositories/marketing/promotion.repository";
import {
  createPromotionAction,
  updatePromotionAction,
} from "@/actions/marketing.actions";
import { uploadMedia } from "@/actions/cms.actions";
import Image from "next/image";

interface PromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  initialData?: PromotionRecord | null;
  onSuccess?: (promo: PromotionRecord) => void;
}

export function PromotionDialog({
  open,
  onOpenChange,
  mode = "create",
  initialData,
  onSuccess,
}: PromotionDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: "",
      discount_percentage: 10,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      is_active: true,
      banner_url: "",
      banner_link: "",
      show_popup: true,
      popup_delay: 5,
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        form.reset({
          name: initialData.name,
          discount_percentage: initialData.discount_percentage,
          start_date: new Date(initialData.start_date)
            .toISOString()
            .split("T")[0],
          end_date: new Date(initialData.end_date).toISOString().split("T")[0],
          is_active: initialData.is_active,
          banner_url: initialData.banner_url || "",
          banner_link: initialData.banner_link || "",
          show_popup: initialData.show_popup ?? true,
          popup_delay: initialData.popup_delay ?? 5,
          description: initialData.description || "",
        });
      } else {
        form.reset({
          name: "",
          discount_percentage: 10,
          start_date: new Date().toISOString().split("T")[0],
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          is_active: true,
          banner_url: "",
          banner_link: "",
          show_popup: true,
          popup_delay: 5,
          description: "",
        });
      }
    }
  }, [open, mode, initialData, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be less than 10MB");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      const res = await uploadMedia(formData);
      if (res?.success && res.data?.[0]?.file_url) {
        const uploadedUrl = res.data[0].file_url;
        form.setValue("banner_url", uploadedUrl);
        toast.success("Banner photo uploaded successfully!");
      } else {
        toast.error("Failed to upload image. Please enter an image URL.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload banner photo");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onSubmit = async (values: PromotionFormValues) => {
    setSubmitting(true);
    try {
      if (mode === "edit" && initialData?.id) {
        const res = await updatePromotionAction(initialData.id, values);
        if (!res.success) {
          toast.error(res.error || "Failed to update promotion");
          return;
        }
        toast.success(`Promotion "${values.name}" updated successfully`);
        if (res.data) onSuccess?.(res.data);
      } else {
        const res = await createPromotionAction(values);
        if (!res.success) {
          toast.error(res.error || "Failed to create promotion");
          return;
        }
        toast.success(`Promotion "${values.name}" created successfully`);
        if (res.data) onSuccess?.(res.data);
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const currentBannerUrl = form.watch("banner_url");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {mode === "edit" ? "Edit Promotion" : "Create New Promotion"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Modify campaign dates, banner photo, popup timings, or discount percentage."
              : "Set up a promotional campaign with photos, popup banner, and automated storewide discount application."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Promotion Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Promotion Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Eid Mega Discount Festive Sale"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Discount Percentage */}
            <FormField
              control={form.control}
              name="discount_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Discount Percentage (%) <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      placeholder="15"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    This discount will automatically reduce product prices across the website during this campaign.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Banner Photo Section */}
            <div className="space-y-2 rounded-lg border border-border p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Promotion Photo / Banner Image
                  </FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upload a promotional photo or banner to show in the website popup.
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex items-center gap-1.5"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploadingImage ? "Uploading..." : "Upload Image"}
                </Button>
              </div>

              {currentBannerUrl ? (
                <div className="relative mt-2 rounded-lg overflow-hidden border border-border bg-black/5 aspect-[16/7] max-h-48 flex items-center justify-center">
                  <Image
                    src={currentBannerUrl}
                    alt="Promotion Banner"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => form.setValue("banner_url", "")}
                    className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black text-white rounded-full transition-colors shadow"
                    title="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              <FormField
                control={form.control}
                name="banner_url"
                render={({ field }) => (
                  <FormItem className="mt-2">
                    <FormControl>
                      <Input
                        placeholder="Or paste external image URL (https://...)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Optional Banner Link */}
            <FormField
              control={form.control}
              name="banner_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    Banner Link <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., /products?category=festive or /products or custom URL"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    When visitors click on the popup banner, they will be redirected to this link.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Popup Settings Grid: Toggle & Delay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-border p-3.5 bg-muted/10">
              <FormField
                control={form.control}
                name="show_popup"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between sm:justify-start gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm font-medium cursor-pointer">
                        Show Popup Banner
                      </FormLabel>
                      <div className="text-xs text-muted-foreground">
                        Display popup on customer website
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="popup_delay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                      Popup Delay (Seconds)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        placeholder="5"
                        {...field}
                        value={field.value ?? 5}
                        onChange={(e) => field.onChange(Number(e.target.value) || 5)}
                      />
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      Show banner after 5s or 7s of opening website.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            {/* Dates: Start and End */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Start Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      End Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Active Status Toggle */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">
                      Enable Promotion
                    </FormLabel>
                    <div className="text-xs text-muted-foreground">
                      When enabled, discounts apply automatically and banner appears.
                    </div>
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

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : mode === "edit" ? (
                  "Save Changes"
                ) : (
                  "Create Promotion"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
