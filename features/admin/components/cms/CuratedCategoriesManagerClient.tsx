"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Save,
  RotateCcw,
  ExternalLink,
  Upload,
  Loader2,
  Check,
  ChevronDown,
  Search,
  X,
  Eye,
  Sliders,
  HelpCircle,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  CuratedCategoriesSettings,
  CuratedCategorySlot,
  DEFAULT_CURATED_CATEGORIES,
} from "@/types/curated-categories.types";
import { Category } from "@/types/catalog.types";
import {
  updateCuratedCategoriesSettings,
  resetCuratedCategoriesSettings,
} from "@/actions/curated-categories.actions";
import { uploadImageAction } from "@/lib/actions/upload.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { jost } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface CuratedCategoriesManagerClientProps {
  initialSettings: CuratedCategoriesSettings;
  allCategories: Category[];
}

const SLOT_CONFIGS = [
  {
    index: 0,
    slotId: "slot-1",
    name: "Slot 1 — Primary Hero",
    badgeLabel: "Top Left Large",
    description: "The primary landscape focal point of the bento grid.",
    defaultSubtitle: "Classic & Contemporary",
  },
  {
    index: 1,
    slotId: "slot-2",
    name: "Slot 2 — Signature Tall",
    badgeLabel: "Right Column Tall",
    description: "The tall portrait editorial card on the right.",
    defaultSubtitle: "Signature Collection",
  },
  {
    index: 2,
    slotId: "slot-3",
    name: "Slot 3 — Grid Square 1",
    badgeLabel: "Bottom Left Square",
    description: "First square card under the primary hero.",
    defaultSubtitle: "Shop Now",
  },
  {
    index: 3,
    slotId: "slot-4",
    name: "Slot 4 — Grid Square 2",
    badgeLabel: "Bottom Left Square",
    description: "Second square card under the primary hero.",
    defaultSubtitle: "Shop Now",
  },
];

export function CuratedCategoriesManagerClient({
  initialSettings,
  allCategories,
}: CuratedCategoriesManagerClientProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCategories = allCategories.filter((c) => c.is_active);

  // Normalize initial settings and pre-populate empty slots with active categories
  const normalizedInitial: CuratedCategoriesSettings = {
    ...initialSettings,
    slots: SLOT_CONFIGS.map((cfg, idx) => {
      const existing =
        (initialSettings.slots || []).find((s) => s.id === cfg.slotId) ||
        (initialSettings.slots || [])[cfg.index];

      // If slot categoryId is empty, pre-populate with the active category at that position
      const fallbackCatId = activeCategories[idx]?.id || "";

      return {
        id: cfg.slotId,
        categoryId: existing?.categoryId || fallbackCatId,
        subtitle: existing?.subtitle || cfg.defaultSubtitle,
        customTitle: existing?.customTitle || "",
        customImageUrl: existing?.customImageUrl || "",
      };
    }),
  };

  const [settings, setSettings] = useState<CuratedCategoriesSettings>(normalizedInitial);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Search filter and open state for slot dropdowns
  const [dropdownSearch, setDropdownSearch] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  const handleSlotChange = (
    slotId: string,
    field: keyof CuratedCategorySlot,
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      slots: prev.slots.map((s) =>
        s.id === slotId ? { ...s, [field]: value } : s
      ),
    }));
  };

  const handleImageUpload = async (
    slotId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploadingSlot(slotId);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "products");
      formData.append("folder", "cms/curated-categories");

      const res = await uploadImageAction(formData);
      if (res.success && res.url) {
        handleSlotChange(slotId, "customImageUrl", res.url);
        toast.success("Image uploaded successfully");
      } else {
        toast.error(res.error || "Failed to upload image");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingSlot(null);
      if (e.target) e.target.value = "";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateCuratedCategoriesSettings(settings);
      if (res.success) {
        toast.success("Curated categories published successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to save settings");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "Are you sure you want to reset this section to the default auto-category configuration?"
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetCuratedCategoriesSettings();
      if (res.success) {
        // Reset local state pre-populating with first 4 active categories
        const resetSlots = SLOT_CONFIGS.map((cfg, idx) => ({
          id: cfg.slotId,
          categoryId: activeCategories[idx]?.id || "",
          subtitle: cfg.defaultSubtitle,
          customTitle: "",
          customImageUrl: "",
        }));

        setSettings({
          ...DEFAULT_CURATED_CATEGORIES,
          slots: resetSlots,
        });

        toast.success("Reset to default categories!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to reset settings");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset");
    } finally {
      setIsResetting(false);
    }
  };

  // Helper to resolve slot category display info
  const getSlotCategoryInfo = (slot: CuratedCategorySlot, fallbackIdx: number) => {
    const category = allCategories.find((c) => c.id === slot.categoryId);
    const fallbackCategory = activeCategories[fallbackIdx];
    const resolvedCat = category || fallbackCategory;

    const name =
      slot.customTitle?.trim() || resolvedCat?.name || `Category ${fallbackIdx + 1}`;
    const slug = resolvedCat?.slug || "all";
    const imageUrl =
      slot.customImageUrl?.trim() ||
      resolvedCat?.imageUrl ||
      resolvedCat?.icon_url ||
      null;
    const subtitle =
      slot.subtitle?.trim() || SLOT_CONFIGS[fallbackIdx]?.defaultSubtitle || "Shop Now";

    return { resolvedCat, name, slug, imageUrl, subtitle };
  };

  // Helper to get category display label with parent if present
  const getCategoryDisplayLabel = (cat: Category) => {
    if (cat.parent?.name) {
      return `${cat.parent.name} → ${cat.name}`;
    }
    return cat.name;
  };

  return (
    <div className="space-y-6 pb-20" ref={dropdownRef}>
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Curated Categories
            </h1>
            <Badge
              variant={settings.isEnabled ? "default" : "secondary"}
              className={cn(
                "ml-2 text-xs uppercase font-medium",
                settings.isEnabled
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {settings.isEnabled ? "Live on Homepage" : "Disabled"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Decide which categories appear in "The Style Edit" signature showcase on your storefront homepage.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            View Storefront
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isResetting || isSaving}
            className="gap-1.5 text-xs"
          >
            {isResetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Reset to Auto
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 bg-[#C9A86A] text-black hover:bg-[#b89555] font-semibold text-xs shadow-sm"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs Switcher: Editor vs Live Store Preview */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("edit")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer",
            activeTab === "edit"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Sliders className="h-4 w-4" />
          Slot Editor
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer",
            activeTab === "preview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Eye className="h-4 w-4" />
          Live Homepage Preview
        </button>
      </div>

      {activeTab === "edit" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Section Metadata & Visibility Controls */}
          <div className="space-y-6 lg:col-span-4">
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>Section Visibility</span>
                  <Switch
                    checked={settings.isEnabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, isEnabled: checked }))
                    }
                  />
                </CardTitle>
                <CardDescription className="text-xs">
                  Toggle whether this editorial block appears on the public homepage.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Section Typography & CTA
                </CardTitle>
                <CardDescription className="text-xs">
                  Customize the heading, subtitle, and action link displayed above the categories.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div>
                  <label className="mb-1 block font-medium text-foreground">
                    Section Eyebrow Badge
                  </label>
                  <Input
                    value={settings.badge}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, badge: e.target.value }))
                    }
                    placeholder="e.g. THE STYLE EDIT"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-foreground">
                    Section Heading
                  </label>
                  <Input
                    value={settings.title}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g. Curated Categories"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-foreground">
                    Description Subtitle
                  </label>
                  <Textarea
                    rows={3}
                    value={settings.description}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe this curated collection..."
                    className="text-xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="mb-1 block font-medium text-foreground">
                      Button Label
                    </label>
                    <Input
                      value={settings.viewAllText}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          viewAllText: e.target.value,
                        }))
                      }
                      placeholder="Shop All Categories"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-foreground">
                      Button Link
                    </label>
                    <Input
                      value={settings.viewAllLink}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          viewAllLink: e.target.value,
                        }))
                      }
                      placeholder="/categories"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Layout Guide Helper Card */}
            <Card className="border border-border/80 bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                  <HelpCircle className="h-3.5 w-3.5 text-[#C9A86A]" />
                  Editorial Grid Layout Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] leading-relaxed text-muted-foreground space-y-2">
                <p>
                  • <strong>Slot 1:</strong> Featured landscape card on top left. Ideal for core staples (e.g. Belt, Formal Wear).
                </p>
                <p>
                  • <strong>Slot 2:</strong> Signature tall portrait card on the right column. Ideal for showcase silhouettes (e.g. Panjabi, Premium Suits).
                </p>
                <p>
                  • <strong>Slots 3 & 4:</strong> Twin square grid cards under Slot 1. Ideal for fast-moving collections (e.g. Formal Shirts, Polos).
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: 4 Bento Slot Configurators */}
          <div className="space-y-6 lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SLOT_CONFIGS.map((config, index) => {
                const slot = settings.slots[index] || {
                  id: config.slotId,
                  categoryId: "",
                  subtitle: config.defaultSubtitle,
                };
                const selectedCat = allCategories.find(
                  (c) => c.id === slot.categoryId
                );
                const isDropdownOpen = openDropdown === config.slotId;
                const searchQuery = dropdownSearch[config.slotId] || "";

                const filteredCatOptions = activeCategories.filter((c) =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (c.parent?.name &&
                    c.parent.name.toLowerCase().includes(searchQuery.toLowerCase()))
                );

                return (
                  <Card
                    key={config.slotId}
                    className="border border-border shadow-sm flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3 border-b border-border/40">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A86A]/20 text-[10px] font-bold text-[#97793d]">
                              {index + 1}
                            </span>
                            <CardTitle className="text-sm font-semibold">
                              {config.name}
                            </CardTitle>
                          </div>
                          <CardDescription className="text-[11px] mt-0.5">
                            {config.description}
                          </CardDescription>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0"
                        >
                          {config.badgeLabel}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-4 text-xs flex-1">
                      {/* Category Selector Dropdown */}
                      <div className="relative">
                        <label className="mb-1 block font-medium text-foreground">
                          Target Category <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenDropdown(isDropdownOpen ? null : config.slotId)
                          }
                          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-sm hover:bg-muted/50 cursor-pointer text-left"
                        >
                          <span
                            className={cn(
                              "truncate",
                              !selectedCat && "text-muted-foreground"
                            )}
                          >
                            {selectedCat
                              ? getCategoryDisplayLabel(selectedCat)
                              : "Select a category..."}
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-1" />
                        </button>

                        {/* Searchable Options Menu */}
                        {isDropdownOpen && (
                          <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
                            <div className="p-1 border-b border-border/60 mb-1">
                              <div className="flex items-center gap-2 px-2 py-1 rounded-sm bg-muted/50 text-muted-foreground">
                                <Search className="h-3.5 w-3.5 shrink-0" />
                                <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) =>
                                    setDropdownSearch((prev) => ({
                                      ...prev,
                                      [config.slotId]: e.target.value,
                                    }))
                                  }
                                  placeholder="Search categories..."
                                  className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                                  autoFocus
                                />
                                {searchQuery && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDropdownSearch((prev) => ({
                                        ...prev,
                                        [config.slotId]: "",
                                      }))
                                    }
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="max-h-52 overflow-y-auto space-y-0.5 p-0.5">
                              {filteredCatOptions.length === 0 ? (
                                <div className="px-2.5 py-3 text-center text-xs text-muted-foreground">
                                  No categories match.
                                </div>
                              ) : (
                                filteredCatOptions.map((cat) => {
                                  const isSelected = selectedCat?.id === cat.id;
                                  return (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() => {
                                        handleSlotChange(
                                          config.slotId,
                                          "categoryId",
                                          cat.id
                                        );
                                        setOpenDropdown(null);
                                      }}
                                      className={cn(
                                        "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-xs text-left transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                        isSelected && "bg-accent/60 font-medium text-foreground"
                                      )}
                                    >
                                      <div className="truncate pr-2">
                                        <div className="font-medium truncate">
                                          {cat.name}
                                        </div>
                                        {cat.parent?.name && (
                                          <div className="text-[10px] text-muted-foreground truncate">
                                            Parent: {cat.parent.name}
                                          </div>
                                        )}
                                      </div>
                                      {isSelected && (
                                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Subtitle / Eyebrow Input */}
                      <div>
                        <label className="mb-1 block font-medium text-foreground">
                          Badge Subtitle Text
                        </label>
                        <Input
                          value={slot.subtitle || ""}
                          onChange={(e) =>
                            handleSlotChange(
                              config.slotId,
                              "subtitle",
                              e.target.value
                            )
                          }
                          placeholder={config.defaultSubtitle}
                          className="h-9 text-xs"
                        />
                      </div>

                      {/* Custom Title Override Input */}
                      <div>
                        <label className="mb-1 block font-medium text-foreground">
                          Custom Title Override{" "}
                          <span className="text-muted-foreground font-normal">
                            (Optional)
                          </span>
                        </label>
                        <Input
                          value={slot.customTitle || ""}
                          onChange={(e) =>
                            handleSlotChange(
                              config.slotId,
                              "customTitle",
                              e.target.value
                            )
                          }
                          placeholder={
                            selectedCat
                              ? selectedCat.name
                              : "Default to category name"
                          }
                          className="h-9 text-xs"
                        />
                      </div>

                      {/* Image Preview & Custom Image Override */}
                      <div className="pt-1">
                        <label className="mb-1.5 block font-medium text-foreground">
                          Card Media
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-neutral-900 flex items-center justify-center">
                            {slot.customImageUrl || selectedCat?.imageUrl || selectedCat?.icon_url ? (
                              <Image
                                src={
                                  slot.customImageUrl ||
                                  selectedCat?.imageUrl ||
                                  selectedCat?.icon_url ||
                                  ""
                                }
                                alt="Category thumbnail"
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <span className="text-xs font-light text-[#C9A86A]">
                                {selectedCat?.name
                                  ? selectedCat.name.slice(0, 2).toUpperCase()
                                  : "AF"}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 space-y-1.5">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm hover:bg-muted transition-colors">
                              {uploadingSlot === config.slotId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Upload className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span>Upload Custom Image</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(config.slotId, e)}
                                disabled={uploadingSlot === config.slotId}
                                className="hidden"
                              />
                            </label>

                            {slot.customImageUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSlotChange(
                                    config.slotId,
                                    "customImageUrl",
                                    ""
                                  )
                                }
                                className="block text-[10px] text-rose-500 hover:underline"
                              >
                                Remove custom image (use category image)
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Live Storefront Preview Tab */
        <Card className="border border-gray-200 overflow-hidden shadow-lg bg-white">
          <CardHeader className="bg-neutral-900 text-white pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
                  <Eye className="h-4 w-4 text-[#C9A86A]" />
                  Live Storefront Bento Simulation
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400">
                  This is an exact preview of how your Curated Categories will render on the storefront.
                </CardDescription>
              </div>
              <Badge className="bg-[#C9A86A] text-black text-[10px] font-bold uppercase tracking-wider">
                Storefront View
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 md:p-10">
            {/* Warning if section is toggled off */}
            {!settings.isEnabled && (
              <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Notice:</strong> This section is currently <strong>Disabled</strong>. It will not be shown on the storefront homepage until you toggle "Section Visibility" on in the Slot Editor.
                </span>
              </div>
            )}

            {/* Simulation of the Storefront Section */}
            <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <div className="max-w-xl">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.3em] text-[#C9A86A]">
                  {settings.badge || "The Style Edit"}
                </span>
                <h2
                  className={`${jost.className} mb-3 text-3xl font-light tracking-tight text-[#1A1A1A] md:text-5xl`}
                >
                  {settings.title || "Curated Categories"}
                </h2>
                <p className="text-sm font-light tracking-wide text-gray-500">
                  {settings.description ||
                    "Explore our most sought-after silhouettes and luxury tailoring, designed for modern elegance."}
                </p>
              </div>
              <span className="border-b border-black pb-1 text-xs font-bold uppercase tracking-[0.2em] text-black">
                {settings.viewAllText || "Shop All Categories"}
              </span>
            </div>

            {/* 4-Item Masonry Preview */}
            {(() => {
              const item0 = getSlotCategoryInfo(settings.slots[0], 0);
              const item1 = getSlotCategoryInfo(settings.slots[1], 1);
              const item2 = getSlotCategoryInfo(settings.slots[2], 2);
              const item3 = getSlotCategoryInfo(settings.slots[3], 3);

              return (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
                  {/* Left Column (Slot 1 Hero + Slot 3 & 4 Squares) */}
                  <div className="flex flex-col gap-4 md:col-span-7 md:gap-6">
                    {/* Slot 1 Large Hero */}
                    <div className="group relative block aspect-[4/5] w-full overflow-hidden bg-neutral-900 md:aspect-auto md:h-[450px] rounded-lg shadow-sm">
                      {item0.imageUrl ? (
                        <Image
                          src={item0.imageUrl}
                          alt={item0.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 flex flex-col items-center justify-center">
                          <div className="h-16 w-16 rounded-full bg-white/5 border border-[#C9A86A]/20 flex items-center justify-center mb-3">
                            <span className="text-xl font-light text-[#C9A86A] uppercase tracking-widest">
                              {item0.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                        <div className="text-white">
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                            {item0.subtitle}
                          </span>
                          <h3 className={`${jost.className} text-2xl md:text-3xl font-medium`}>
                            {item0.name}
                          </h3>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
                          <ArrowUpRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                    {/* Slot 3 & 4 Squares */}
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                      {/* Slot 3 */}
                      <div className="group relative block aspect-square w-full overflow-hidden bg-neutral-900 md:aspect-auto md:h-[260px] rounded-lg shadow-sm">
                        {item2.imageUrl ? (
                          <Image
                            src={item2.imageUrl}
                            alt={item2.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 flex flex-col items-center justify-center">
                            <div className="h-12 w-12 rounded-full bg-white/5 border border-[#C9A86A]/20 flex items-center justify-center mb-2">
                              <span className="text-base font-light text-[#C9A86A] uppercase tracking-widest">
                                {item2.name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-4 left-4 text-white">
                          <h3 className={`${jost.className} mb-1 text-lg font-medium`}>
                            {item2.name}
                          </h3>
                          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#C9A86A]">
                            {item2.subtitle} <ArrowUpRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>

                      {/* Slot 4 */}
                      <div className="group relative block aspect-square w-full overflow-hidden bg-neutral-900 md:aspect-auto md:h-[260px] rounded-lg shadow-sm">
                        {item3.imageUrl ? (
                          <Image
                            src={item3.imageUrl}
                            alt={item3.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 flex flex-col items-center justify-center">
                            <div className="h-12 w-12 rounded-full bg-white/5 border border-[#C9A86A]/20 flex items-center justify-center mb-2">
                              <span className="text-base font-light text-[#C9A86A] uppercase tracking-widest">
                                {item3.name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-4 left-4 text-white">
                          <h3 className={`${jost.className} mb-1 text-lg font-medium`}>
                            {item3.name}
                          </h3>
                          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#C9A86A]">
                            {item3.subtitle} <ArrowUpRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Slot 2 Tall Signature) */}
                  <div className="aspect-[4/5] md:col-span-5 md:h-auto md:aspect-auto">
                    <div className="group relative block h-full w-full overflow-hidden bg-neutral-900 min-h-[400px] md:min-h-[500px] rounded-lg shadow-sm">
                      {item1.imageUrl ? (
                        <Image
                          src={item1.imageUrl}
                          alt={item1.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 flex flex-col items-center justify-center">
                          <div className="h-16 w-16 rounded-full bg-white/5 border border-[#C9A86A]/20 flex items-center justify-center mb-3">
                            <span className="text-xl font-light text-[#C9A86A] uppercase tracking-widest">
                              {item1.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                        <div className="text-white">
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                            {item1.subtitle}
                          </span>
                          <h3 className={`${jost.className} text-2xl md:text-3xl font-medium`}>
                            {item1.name}
                          </h3>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
                          <ArrowUpRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
