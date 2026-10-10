"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  upsertHeroSlideWithUpload,
  deleteHeroSlide,
  deleteAllHeroSlides,
  HeroSlide,
} from "@/actions/cms.actions";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Edit2,
  Calendar,
  Loader2,
} from "lucide-react";
import Image from "next/image";

interface BannerFormData {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  cta_text: string;
  link_url: string;
  display_order: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  image_url: string;
  placement: "hero" | "promo";
  file: File | null;
}

const emptyBannerForm: BannerFormData = {
  title: "",
  subtitle: "",
  description: "",
  cta_text: "Shop Now",
  link_url: "/products",
  display_order: 0,
  is_active: true,
  start_date: "",
  end_date: "",
  image_url: "",
  placement: "hero",
  file: null,
};

export function BannersManager({
  initialSlides,
}: {
  initialSlides: HeroSlide[];
}) {
  const [slides, setSlides] = useState<HeroSlide[]>(initialSlides);
  const [filterPlacement, setFilterPlacement] = useState<"all" | "hero" | "promo">("all");
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<BannerFormData>(emptyBannerForm);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const handleOpenAdd = () => {
    setFormData({
      ...emptyBannerForm,
      placement: filterPlacement === "promo" ? "promo" : "hero",
      display_order: slides.length,
    });
    setPreviewUrl("");
    setModalOpen(true);
  };

  const handleOpenEdit = (slide: HeroSlide) => {
    setFormData({
      id: slide.id !== undefined ? String(slide.id) : undefined,
      title: slide.title || "",
      subtitle: slide.subtitle || "",
      description: slide.description || "",
      cta_text: slide.cta_text || "Shop Now",
      link_url: slide.link_url || "/products",
      display_order: slide.display_order ?? 0,
      is_active: slide.is_active ?? true,
      start_date: slide.start_date ? slide.start_date.split("T")[0] : "",
      end_date: slide.end_date ? slide.end_date.split("T")[0] : "",
      image_url: slide.image_url || "",
      placement: slide.placement || "hero",
      file: null,
    });
    setPreviewUrl(slide.image_url || "");
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, file }));
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.image_url && !formData.file) {
      toast.error("Please upload or provide a banner image");
      return;
    }

    startTransition(async () => {
      const data = new FormData();
      if (formData.id && !formData.id.startsWith("default-")) {
        data.append("id", formData.id);
      }
      data.append("title", formData.title);
      data.append("subtitle", formData.subtitle);
      data.append("description", formData.description);
      data.append("cta_text", formData.cta_text);
      data.append("link_url", formData.link_url);
      data.append("display_order", String(formData.display_order));
      data.append("is_active", String(formData.is_active));
      data.append("placement", formData.placement);
      data.append("start_date", formData.start_date || "");
      data.append("end_date", formData.end_date || "");
      if (formData.image_url) data.append("image_url", formData.image_url);
      if (formData.file) data.append("file", formData.file);

      const result = await upsertHeroSlideWithUpload(data);
      if (result.success) {
        toast.success(formData.id ? "Banner updated successfully" : "Banner created successfully");
        setModalOpen(false);

        const updatedImageUrl = result.image_url || formData.image_url;
        const updatedSlide: HeroSlide = {
          id: (result as any).id || formData.id || `banner-${Date.now()}`,
          title: formData.title,
          subtitle: formData.subtitle,
          description: formData.description,
          cta_text: formData.cta_text,
          link_url: formData.link_url,
          display_order: formData.display_order,
          is_active: formData.is_active,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          image_url: updatedImageUrl,
          placement: formData.placement,
        };

        setSlides((prev) => {
          const exists = prev.some((s) => s.id === formData.id);
          if (exists) {
            return prev.map((s) => (s.id === formData.id ? updatedSlide : s));
          } else {
            return [...prev, updatedSlide].sort(
              (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
            );
          }
        });
      } else {
        toast.error(result.error || "Failed to save banner");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteHeroSlide(id);
      if (res.success) {
        setSlides((prev) => prev.filter((s) => s.id !== id));
        setDeleteConfirmId(null);
        toast.success("Banner deleted successfully");
      } else {
        toast.error(res.error || "Failed to delete banner");
      }
    });
  };

  const handleDeleteAll = () => {
    startTransition(async () => {
      const res = await deleteAllHeroSlides();
      if (res.success) {
        setSlides([]);
        setDeleteAllConfirmOpen(false);
        toast.success("All banners deleted successfully");
      } else {
        toast.error(res.error || "Failed to delete banners");
      }
    });
  };

  const filteredSlides = slides.filter((slide) => {
    if (filterPlacement === "hero") return slide.placement !== "promo";
    if (filterPlacement === "promo") return slide.placement === "promo";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Homepage Banners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the carousel slides and featured promo banners shown on the homepage.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {slides.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setDeleteAllConfirmOpen(true)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30"
              disabled={isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear All
            </Button>
          )}
          <Button onClick={handleOpenAdd} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Add Banner
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b pb-3">
        <Button
          variant={filterPlacement === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterPlacement("all")}
          className="text-xs font-medium"
        >
          All Banners ({slides.length})
        </Button>
        <Button
          variant={filterPlacement === "hero" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterPlacement("hero")}
          className="text-xs font-medium"
        >
          Hero Carousel ({slides.filter((s) => s.placement !== "promo").length})
        </Button>
        <Button
          variant={filterPlacement === "promo" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterPlacement("promo")}
          className="text-xs font-medium"
        >
          Featured Promo ({slides.filter((s) => s.placement === "promo").length})
        </Button>
      </div>

      {filteredSlides.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ImageIcon className="mb-4 h-12 w-12 opacity-30" />
            <p className="text-base font-medium">No banners found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filterPlacement === "promo"
                ? "No featured promo banner created yet. Add one to showcase promotional campaigns."
                : "Add a banner to showcase products and promotional collections on your store."}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleOpenAdd}>
              <Plus className="mr-2 h-4 w-4" /> Add Your First Banner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSlides.map((slide, index) => (
            <Card key={slide.id} className="overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: Image & Info */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative h-28 w-full sm:w-48 flex-shrink-0 overflow-hidden rounded-lg border bg-muted">
                      {slide.image_url ? (
                        <Image
                          src={slide.image_url}
                          alt={slide.title || `Slide ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized={slide.image_url.startsWith("http")}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8 opacity-40" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs bg-background/90 backdrop-blur">
                          Order {slide.display_order ?? index}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold">
                          {slide.title || `Banner #${index + 1}`}
                        </h3>
                        {slide.placement === "promo" ? (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs">
                            Featured Promo Banner
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs">
                            Hero Carousel
                          </Badge>
                        )}
                        <Badge
                          variant={slide.is_active !== false ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {slide.is_active !== false ? "Active" : "Draft / Inactive"}
                        </Badge>
                      </div>

                      {slide.subtitle && (
                        <p className="text-sm font-medium text-foreground/80 line-clamp-1">
                          {slide.subtitle}
                        </p>
                      )}

                      {slide.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          "{slide.description}"
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{slide.link_url || "/products"}</span>
                        </div>
                        {slide.cta_text && (
                          <span>• CTA: <strong className="text-foreground">{slide.cta_text}</strong></span>
                        )}
                        {(slide.start_date || slide.end_date) && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {slide.start_date ? new Date(slide.start_date).toLocaleDateString() : "Any"}
                              {" → "}
                              {slide.end_date ? new Date(slide.end_date).toLocaleDateString() : "Forever"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(slide)}
                    >
                      <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirmId(String(slide.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit / Add Slide Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formData.id
                ? formData.placement === "promo"
                  ? "Edit Featured Promo Banner"
                  : "Edit Hero Banner"
                : formData.placement === "promo"
                ? "Add Featured Promo Banner"
                : "Add New Hero Banner"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Banner Placement Selection */}
            <div className="space-y-1.5">
              <Label>Banner Section / Placement</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, placement: "hero" }))}
                  className={`flex flex-col text-left rounded-lg border p-3 transition-colors ${
                    formData.placement === "hero"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="text-sm font-semibold">Hero Carousel Slide</span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    Top homepage slider (1600 × 600 px)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, placement: "promo" }))}
                  className={`flex flex-col text-left rounded-lg border p-3 transition-colors ${
                    formData.placement === "promo"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="text-sm font-semibold">Featured Promo Banner</span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    Mid-page editorial banner (1600 × 800 px)
                  </span>
                </button>
              </div>
            </div>

            {/* Image Preview & Upload */}
            <div className="space-y-2">
              <Label>
                Banner Image (Recommended: {formData.placement === "promo" ? "1600 × 800 px" : "1600 × 600 px"})
              </Label>
              {previewUrl && (
                <div className="relative h-36 w-full overflow-hidden rounded-lg border bg-muted">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                    unoptimized={previewUrl.startsWith("blob:") || previewUrl.startsWith("http")}
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Upload JPG, PNG or WebP. Max size: 5MB.
              </p>
            </div>

            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="banner-title">Heading / Title</Label>
                <Input
                  id="banner-title"
                  placeholder="e.g. Summer Collection 2026"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="banner-subtitle">Subtitle / Tagline</Label>
                <Input
                  id="banner-subtitle"
                  placeholder="e.g. Crafted for Comfort & Elegance"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subtitle: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Description (Textarea) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="banner-desc">Description</Label>
                {formData.placement === "promo" && (
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    Shown prominently on Featured Promo Banner
                  </span>
                )}
              </div>
              <Textarea
                id="banner-desc"
                placeholder="e.g. Elevate your wardrobe with our latest curated collection. Exclusive pieces designed for the modern individual who values both aesthetics and comfort."
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Editorial copy displayed on the promo banner.
              </p>
            </div>

            {/* CTA Text & Link URL */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="banner-cta">Button / CTA Text</Label>
                <Input
                  id="banner-cta"
                  placeholder="Shop Now"
                  value={formData.cta_text}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, cta_text: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="banner-link">Target URL</Label>
                <Input
                  id="banner-link"
                  placeholder="/products or /categories/ethnic"
                  value={formData.link_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, link_url: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            {/* Display Order & Active Toggle */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="banner-order">Display Order (Sort Index)</Label>
                <Input
                  id="banner-order"
                  type="number"
                  min="0"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      display_order: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </div>

              <div className="flex flex-col justify-center space-y-2 pt-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="banner-active" className="font-medium cursor-pointer">
                      Active Status
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable to display on live site
                    </p>
                  </div>
                  <Switch
                    id="banner-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Date Range Scheduling */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="banner-start">Schedule Start Date (Optional)</Label>
                <Input
                  id="banner-start"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, start_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="banner-end">Schedule End Date (Optional)</Label>
                <Input
                  id="banner-end"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, end_date: e.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {formData.id ? "Save Changes" : "Create Banner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Banner</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this hero banner? This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog
        open={deleteAllConfirmOpen}
        onOpenChange={(open) => !open && setDeleteAllConfirmOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Banners</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete ALL banners? This will remove all hero slides and promo banners. This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteAllConfirmOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete All Banners
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
