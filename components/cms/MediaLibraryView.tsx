"use client";

import React, { useState, useMemo, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Upload,
  Search,
  Filter,
  Image as ImageIcon,
  FileText,
  Video,
  Trash2,
  Link as LinkIcon,
  MoreVertical,
  Download,
  Eye,
  Check,
  X,
  Database,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowUpDown,
  Calendar,
  HardDrive,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MediaUploader } from "@/components/cms/MediaUploader";
import { CMSMediaItem } from "@/types/cms.types";
import { deleteMedia, seedSampleMedia, uploadMedia } from "@/actions/cms.actions";

type FilterType = "all" | "image" | "video" | "document";
type SortOption = "newest" | "oldest" | "name_asc" | "name_desc" | "size_desc" | "size_asc";
type DateOption = "all" | "today" | "week" | "month";

interface MediaLibraryViewProps {
  initialMedia: CMSMediaItem[];
}

export function MediaLibraryView({ initialMedia }: MediaLibraryViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [dateFilter, setDateFilter] = useState<DateOption>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Preview & Delete Dialog States
  const [previewItem, setPreviewItem] = useState<CMSMediaItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<CMSMediaItem | null>(null);

  // Drag and Drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Format File Size
  const formatBytes = (bytes: number, decimals = 1) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Helper for icons
  const getIcon = (type: string, className = "h-8 w-8") => {
    if (type.startsWith("image/")) return <ImageIcon className={`${className} text-blue-500`} />;
    if (type.startsWith("video/")) return <Video className={`${className} text-purple-500`} />;
    return <FileText className={`${className} text-amber-500`} />;
  };

  // Category counts
  const counts = useMemo(() => {
    const total = initialMedia.length;
    const images = initialMedia.filter((m) => m.file_type.startsWith("image/")).length;
    const videos = initialMedia.filter((m) => m.file_type.startsWith("video/")).length;
    const documents = initialMedia.filter(
      (m) => !m.file_type.startsWith("image/") && !m.file_type.startsWith("video/")
    ).length;
    return { total, images, videos, documents };
  }, [initialMedia]);

  // Filtered & Sorted Media
  const filteredMedia = useMemo(() => {
    let result = [...initialMedia];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.file_name.toLowerCase().includes(q) ||
          item.alt_text?.toLowerCase().includes(q) ||
          item.file_type.toLowerCase().includes(q)
      );
    }

    // 2. Category Tab Filter
    if (selectedCategory === "image") {
      result = result.filter((item) => item.file_type.startsWith("image/"));
    } else if (selectedCategory === "video") {
      result = result.filter((item) => item.file_type.startsWith("video/"));
    } else if (selectedCategory === "document") {
      result = result.filter(
        (item) => !item.file_type.startsWith("image/") && !item.file_type.startsWith("video/")
      );
    }

    // 3. Date Filter
    if (dateFilter !== "all") {
      const now = new Date();
      result = result.filter((item) => {
        const itemDate = new Date(item.created_at);
        const diffMs = now.getTime() - itemDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (dateFilter === "today") return diffHours <= 24;
        if (dateFilter === "week") return diffHours <= 24 * 7;
        if (dateFilter === "month") return diffHours <= 24 * 30;
        return true;
      });
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "name_asc") {
        return a.file_name.localeCompare(b.file_name);
      }
      if (sortBy === "name_desc") {
        return b.file_name.localeCompare(a.file_name);
      }
      if (sortBy === "size_desc") {
        return b.file_size_bytes - a.file_size_bytes;
      }
      if (sortBy === "size_asc") {
        return a.file_size_bytes - b.file_size_bytes;
      }
      return 0;
    });

    return result;
  }, [initialMedia, searchQuery, selectedCategory, dateFilter, sortBy]);

  // Actions
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Public URL copied to clipboard!");
    } catch {
      toast.error("Failed to copy URL to clipboard");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete.id);
    try {
      const res = await deleteMedia(itemToDelete.id, itemToDelete.file_url);
      if (res?.success) {
        toast.success(`Deleted "${itemToDelete.file_name}"`);
        setItemToDelete(null);
        router.refresh();
      } else {
        toast.error(res?.error || "Failed to delete file");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete file");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSeedMedia = async () => {
    setIsSeeding(true);
    try {
      const res = await seedSampleMedia();
      if (res.success) {
        toast.success(`Seeded ${res.count} fashion sample media files!`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to seed sample media");
      }
    } catch (err: any) {
      toast.error(err.message || "Seeding failed");
    } finally {
      setIsSeeding(false);
    }
  };

  // Drag & Drop handlers on the card container
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    const toastId = toast.loading(`Uploading ${files.length} file(s)...`);
    try {
      const res = await uploadMedia(formData);
      if (res?.success) {
        toast.success(`Uploaded ${files.length} file(s) successfully!`, { id: toastId });
        router.refresh();
      } else {
        toast.error("Upload failed", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed", { id: toastId });
    }
  };

  // Check if any filters are active (excluding default category = all, date = all, sort = newest)
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "all" ||
    dateFilter !== "all" ||
    sortBy !== "newest";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setDateFilter("all");
    setSortBy("newest");
  };

  const activeFilterCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (dateFilter !== "all" ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header with Title and Primary Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
            <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Supabase Storage (media)
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage product images, lookbooks, banners, and digital documents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seed button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedMedia}
            disabled={isSeeding}
            className="text-xs"
            title="Seed high-quality demo fashion media assets"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            {isSeeding ? "Seeding..." : "Seed Demo Media"}
          </Button>

          {/* Filter Popover Button */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                id="media-filter-btn"
                variant={activeFilterCount > 0 ? "default" : "outline"}
                size="sm"
                className="relative"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-primary" /> Filter & Sort Media
                </h4>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Reset all
                  </button>
                )}
              </div>

              {/* Sort By */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <ArrowUpDown className="h-3.5 w-3.5" /> Sort Order
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    { id: "newest", label: "Newest first" },
                    { id: "oldest", label: "Oldest first" },
                    { id: "name_asc", label: "Name (A-Z)" },
                    { id: "name_desc", label: "Name (Z-A)" },
                    { id: "size_desc", label: "Size (Largest)" },
                    { id: "size_asc", label: "Size (Smallest)" },
                  ].map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      variant={sortBy === s.id ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setSortBy(s.id as SortOption)}
                      className={`justify-start text-xs h-8 ${
                        sortBy === s.id ? "font-semibold text-primary border border-primary/20" : ""
                      }`}
                    >
                      {sortBy === s.id && <Check className="mr-1 h-3 w-3" />}
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date Added Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Upload Date
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    { id: "all", label: "All Time" },
                    { id: "today", label: "Past 24 Hours" },
                    { id: "week", label: "Past 7 Days" },
                    { id: "month", label: "Past 30 Days" },
                  ].map((d) => (
                    <Button
                      key={d.id}
                      type="button"
                      variant={dateFilter === d.id ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setDateFilter(d.id as DateOption)}
                      className={`justify-start text-xs h-8 ${
                        dateFilter === d.id ? "font-semibold text-primary border border-primary/20" : ""
                      }`}
                    >
                      {dateFilter === d.id && <Check className="mr-1 h-3 w-3" />}
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t flex justify-end">
                <Button size="sm" onClick={() => setIsFilterOpen(false)} className="w-full text-xs">
                  Apply Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Upload Button */}
          <MediaUploader onSuccess={() => router.refresh()} />
        </div>
      </div>

      {/* Main Card */}
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative transition-all duration-200 ${
          isDraggingOver ? "ring-2 ring-primary ring-offset-2 border-primary bg-primary/5" : ""
        }`}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary">
            <Upload className="h-12 w-12 text-primary animate-bounce mb-2" />
            <p className="text-lg font-semibold text-foreground">Drop files here to upload</p>
            <p className="text-xs text-muted-foreground">Up to 50MB per file will be uploaded to Supabase Storage</p>
          </div>
        )}

        <CardHeader className="border-b py-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            {/* Quick Category Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "All Files", count: counts.total },
                { id: "image", label: "Images", count: counts.images },
                { id: "video", label: "Videos", count: counts.videos },
                { id: "document", label: "Documents", count: counts.documents },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  id={`filter-tab-${tab.id}`}
                  variant={selectedCategory === tab.id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(tab.id as FilterType)}
                  className={`rounded-full text-xs transition-colors ${
                    selectedCategory === tab.id
                      ? "bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      selectedCategory === tab.id
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                </Button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="media-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by file name or type..."
                className="pl-8 pr-8 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-3 text-xs text-muted-foreground">
              <span className="font-medium">Active filters:</span>
              {searchQuery && (
                <Badge variant="outline" className="gap-1 bg-muted/40 font-normal">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery("")} className="hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="outline" className="gap-1 bg-muted/40 font-normal capitalize">
                  Type: {selectedCategory}
                  <button onClick={() => setSelectedCategory("all")} className="hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {dateFilter !== "all" && (
                <Badge variant="outline" className="gap-1 bg-muted/40 font-normal">
                  Date: {dateFilter === "today" ? "24 Hours" : dateFilter === "week" ? "7 Days" : "30 Days"}
                  <button onClick={() => setDateFilter("all")} className="hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {sortBy !== "newest" && (
                <Badge variant="outline" className="gap-1 bg-muted/40 font-normal">
                  Sort: {sortBy.replace("_", " ")}
                  <button onClick={() => setSortBy("newest")} className="hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6">
          {/* Media Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg hover:border-primary/40"
              >
                {/* Media Thumbnail Container */}
                <div
                  className="relative flex aspect-square w-full items-center justify-center bg-muted/40 overflow-hidden cursor-pointer"
                  onClick={() => setPreviewItem(item)}
                >
                  {item.file_type.startsWith("image/") ? (
                    <Image
                      src={item.file_url}
                      alt={item.alt_text || item.file_name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized={item.file_url.startsWith("http")}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                      {getIcon(item.file_type, "h-10 w-10")}
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {item.file_type.split("/")[1] || "FILE"}
                      </span>
                    </div>
                  )}

                  {/* Hover Overlay with Preview Icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center pointer-events-none">
                    <span className="rounded-full bg-white/20 p-2 text-white backdrop-blur-md">
                      <Eye className="h-5 w-5" />
                    </span>
                  </div>

                  {/* Dropdown Menu on top-right */}
                  <div
                    className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow-md backdrop-blur-md hover:bg-background outline-none">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setPreviewItem(item)}>
                          <Eye className="mr-2 h-4 w-4 text-muted-foreground" /> Preview Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyUrl(item.file_url)}>
                          <LinkIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Copy Public URL
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(item.file_url, "_blank")}>
                          <Download className="mr-2 h-4 w-4 text-muted-foreground" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setItemToDelete(item)}
                          variant="destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete File
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Info Footer */}
                <div className="p-3 flex flex-col justify-between flex-1 bg-card">
                  <p
                    className="truncate text-xs font-semibold text-foreground"
                    title={item.file_name}
                  >
                    {item.file_name}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{formatBytes(item.file_size_bytes)}</span>
                    <span className="uppercase font-mono">
                      {item.file_type.split("/")[1] || "FILE"}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State when no media matches filters */}
            {filteredMedia.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/60">
                  {hasActiveFilters ? (
                    <Search className="h-8 w-8 text-muted-foreground opacity-60" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground opacity-60" />
                  )}
                </div>

                <h3 className="text-base font-semibold text-foreground">
                  {hasActiveFilters ? "No matching media files found" : "Your media library is empty"}
                </h3>

                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  {hasActiveFilters
                    ? "Try adjusting your search keywords, category filters, or sort criteria."
                    : "Upload images, banners, or lookbooks, or seed sample fashion assets to get started."}
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {hasActiveFilters ? (
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      Reset Filters
                    </Button>
                  ) : (
                    <>
                      <MediaUploader
                        onSuccess={() => router.refresh()}
                        buttonText="Upload First Media"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSeedMedia}
                        disabled={isSeeding}
                      >
                        <Sparkles className="mr-1.5 h-4 w-4 text-amber-500" />
                        {isSeeding ? "Seeding..." : "Seed Demo Fashion Assets"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="truncate text-base font-bold">
                {previewItem.file_name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Uploaded on {new Date(previewItem.created_at).toLocaleDateString()} at{" "}
                {new Date(previewItem.created_at).toLocaleTimeString()}
              </DialogDescription>
            </DialogHeader>

            {/* Media Display */}
            <div className="relative mt-2 flex min-h-[300px] max-h-[450px] w-full items-center justify-center rounded-xl bg-muted/50 overflow-hidden border">
              {previewItem.file_type.startsWith("image/") ? (
                <div className="relative h-96 w-full">
                  <Image
                    src={previewItem.file_url}
                    alt={previewItem.alt_text || previewItem.file_name}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : previewItem.file_type.startsWith("video/") ? (
                <video src={previewItem.file_url} controls className="max-h-96 w-full rounded-lg" />
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <FileText className="h-16 w-16 text-amber-500" />
                  <p className="font-medium text-sm">{previewItem.file_name}</p>
                  <p className="text-xs text-muted-foreground">{previewItem.file_type}</p>
                </div>
              )}
            </div>

            {/* Metadata Table */}
            <div className="grid grid-cols-2 gap-2 text-xs border rounded-lg p-3 bg-muted/20">
              <div>
                <span className="text-muted-foreground">File Size:</span>{" "}
                <span className="font-medium">{formatBytes(previewItem.file_size_bytes)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">MIME Type:</span>{" "}
                <span className="font-medium">{previewItem.file_type}</span>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-2 overflow-hidden">
                <span className="text-muted-foreground shrink-0">Public URL:</span>
                <input
                  type="text"
                  readOnly
                  value={previewItem.file_url}
                  className="w-full bg-background border rounded px-2 py-0.5 text-xs text-muted-foreground font-mono truncate"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px] shrink-0"
                  onClick={() => handleCopyUrl(previewItem.file_url)}
                >
                  <LinkIcon className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between gap-2 pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const toDel = previewItem;
                  setPreviewItem(null);
                  setItemToDelete(toDel);
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={previewItem.file_url} target="_blank" rel="noopener noreferrer">
                    Open in New Tab
                  </a>
                </Button>
                <Button size="sm" asChild>
                  <a href={previewItem.file_url} download={previewItem.file_name}>
                    <Download className="mr-1.5 h-4 w-4" /> Download
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {itemToDelete && (
        <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Confirm Deletion
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-foreground">"{itemToDelete.file_name}"</span>?
                This will remove the file from both the database and Supabase storage bucket.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItemToDelete(null)}
                disabled={!!deletingId}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={!!deletingId}
              >
                {deletingId ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
