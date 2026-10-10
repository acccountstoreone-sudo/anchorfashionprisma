"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PlusCircle, Loader2, Star, X, UploadCloud } from "lucide-react";
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
  createReviewAction,
  fetchPurchasedProductsAction,
} from "@/app/actions/customer.actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const reviewSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  orderId: z.string().optional(),
  rating: z.number().min(1, "Please select a rating").max(5),
  title: z.string().optional(),
  body: z.string().min(10, "Review must be at least 10 characters"),
});

type ReviewForm = z.infer<typeof reviewSchema>;

interface WriteReviewButtonProps {
  productId?: string;
  productName?: string;
  orderId?: string;
}

export function WriteReviewButton({
  productId,
  productName,
  orderId,
}: WriteReviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [availableProducts, setAvailableProducts] = useState<
    Array<{
      productId: string;
      productName: string;
      orderId: string;
      orderNumber: string;
    }>
  >([]);
  const router = useRouter();

  const form = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      productId: productId || "",
      orderId: orderId || "",
      rating: 0,
      title: "",
      body: "",
    },
  });

  useEffect(() => {
    if (open && !productId) {
      setLoadingProducts(true);
      fetchPurchasedProductsAction().then((res) => {
        if (res.data) {
          setAvailableProducts(res.data);
          if (res.data.length > 0 && !form.getValues("productId")) {
            form.setValue("productId", res.data[0].productId);
            form.setValue("orderId", res.data[0].orderId);
          }
        }
        setLoadingProducts(false);
      });
    }
  }, [open, productId, form]);

  const selectedRating = form.watch("rating");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (files.length + selectedFiles.length > 3) {
        toast.error("You can only upload up to 3 images.");
        return;
      }
      
      const validFiles = selectedFiles.filter(f => {
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`${f.name} exceeds the 5MB limit.`);
          return false;
        }
        return true;
      });

      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (files.length === 0) return [];
    
    const supabase = createClient();
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${form.getValues("productId")}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('review_images')
        .upload(filePath, file);

      if (error) {
        console.error("Upload error:", error);
        toast.error(`Failed to upload ${file.name}`);
      } else if (data) {
        const { data: { publicUrl } } = supabase.storage
          .from('review_images')
          .getPublicUrl(data.path);
        uploadedUrls.push(publicUrl);
      }
    }
    
    return uploadedUrls;
  };

  const onSubmit = async (values: ReviewForm) => {
    setLoading(true);
    try {
      const imageUrls = await uploadImages();

      const res = await createReviewAction({
        productId: values.productId,
        rating: values.rating,
        title: values.title || undefined,
        body: values.body,
        images: imageUrls,
      });

      if (res.error) {
        toast.error(res.error || "Failed to submit review");
      } else {
        toast.success("Thank you! Your review has been published.");
        setOpen(false);
        form.reset({
          productId: productId || "",
          orderId: orderId || "",
          rating: 0,
          title: "",
          body: "",
        });
        setFiles([]);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenClick = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please sign in to write a product review.");
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setOpen(true);
  };

  return (
    <>
      <Button onClick={handleOpenClick} className="gap-2">
        <PlusCircle className="h-4 w-4" />
        Write a Review
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Write a Product Review</DialogTitle>
            <DialogDescription>
              {productName
                ? `Share your verified experience with ${productName}.`
                : "Select a purchased item and share your genuine review with other shoppers."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              {/* Product Selector */}
              {!productId && (
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Product to Review</FormLabel>
                      {loadingProducts ? (
                        <div className="flex items-center gap-2 p-2 border rounded-md text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading your purchased items...
                        </div>
                      ) : availableProducts.length > 0 ? (
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            const matched = availableProducts.find((p) => p.productId === val);
                            if (matched?.orderId) {
                              form.setValue("orderId", matched.orderId);
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full text-xs">
                              <SelectValue placeholder="Choose a product from your orders" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableProducts.map((p) => (
                              <SelectItem key={p.productId} value={p.productId} className="text-xs">
                                {p.productName} ({p.orderNumber})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-xs text-red-500 border border-red-100 bg-red-50 p-3 rounded-md">
                          You do not have any eligible products to review. Only delivered purchases can be reviewed.
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Star Rating */}
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating</FormLabel>
                    <FormControl>
                      <div
                        className="flex gap-1.5 py-1"
                        onMouseLeave={() => setHoverRating(0)}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => field.onChange(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            className="focus:outline-none transition-transform hover:scale-110"
                          >
                            <Star
                              className={cn(
                                "h-7 w-7 transition-colors",
                                star <= (hoverRating || selectedRating)
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-muted text-muted-foreground/30"
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Review Headline */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headline / Title (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Excellent fabric quality and fit"
                        {...field}
                        className="text-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Detailed Review */}
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Review</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share your genuine thoughts regarding size, fit, comfort, and fabric..."
                        className="resize-none text-xs leading-relaxed"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Photo Upload */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">Add Photos (Max 3)</Label>
                <div className="flex items-center gap-3">
                  <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 border-gray-300">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-6 h-6 text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-500">Upload</span>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFileChange}
                      disabled={files.length >= 3 || loading}
                    />
                  </label>

                  {/* Previews */}
                  {files.map((file, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt="Preview" 
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400">Supported formats: JPEG, PNG, WEBP (Max 5MB each)</p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    form.reset();
                    setFiles([]);
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || selectedRating === 0 || (!productId && availableProducts.length === 0)}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Review
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
