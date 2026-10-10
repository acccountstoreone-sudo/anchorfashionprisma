"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ShieldCheck,
  Truck,
  RefreshCcw,
  HeartHandshake,
  Award,
  Clock,
  Sparkles,
  CheckCircle2,
  CreditCard,
  Package,
  Leaf,
  Star,
  Headphones,
  Zap,
  Lock,
  Upload,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  RotateCcw,
  Save,
  Eye,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  WhyChooseUsSettings,
  WhyChooseUsBenefit,
  DEFAULT_WHY_CHOOSE_US,
} from "@/types/why-choose-us.types";
import {
  updateWhyChooseUsSettings,
  resetWhyChooseUsSettings,
} from "@/actions/why-choose-us.actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jost } from "@/lib/fonts";

const AVAILABLE_ICONS = [
  { value: "ShieldCheck", label: "Shield / Quality", icon: ShieldCheck },
  { value: "Truck", label: "Truck / Shipping", icon: Truck },
  { value: "RefreshCcw", label: "Refresh / Returns", icon: RefreshCcw },
  { value: "HeartHandshake", label: "Handshake / Ethics", icon: HeartHandshake },
  { value: "Award", label: "Award / Guarantee", icon: Award },
  { value: "Clock", label: "Clock / Fast Delivery", icon: Clock },
  { value: "Sparkles", label: "Sparkles / Premium", icon: Sparkles },
  { value: "CheckCircle2", label: "Check / Verified", icon: CheckCircle2 },
  { value: "CreditCard", label: "Card / Secure Pay", icon: CreditCard },
  { value: "Package", label: "Package / Box", icon: Package },
  { value: "Leaf", label: "Leaf / Eco-Friendly", icon: Leaf },
  { value: "Star", label: "Star / Rating", icon: Star },
  { value: "Headphones", label: "Headphones / Support", icon: Headphones },
  { value: "Zap", label: "Zap / Express", icon: Zap },
  { value: "Lock", label: "Lock / Privacy", icon: Lock },
];

export function WhyChooseUsManagerClient({
  initialData,
}: {
  initialData: WhyChooseUsSettings;
}) {
  const router = useRouter();
  const [data, setData] = useState<WhyChooseUsSettings>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "products");
      formData.append("folder", "cms/brand-ethos");

      const res = await uploadImageAction(formData);
      if (res.success && res.url) {
        const uploadedUrl = res.url;
        setData((prev) => ({ ...prev, imageUrl: uploadedUrl }));
        toast.success("Image uploaded successfully");
      } else {
        toast.error(res.error || "Failed to upload image");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleBenefitChange = (
    index: number,
    field: keyof WhyChooseUsBenefit,
    value: string
  ) => {
    setData((prev) => {
      const newBenefits = [...prev.benefits];
      newBenefits[index] = { ...newBenefits[index], [field]: value };
      return { ...prev, benefits: newBenefits };
    });
  };

  const handleAddBenefit = () => {
    if (data.benefits.length >= 8) {
      toast.error("Maximum 8 benefits allowed");
      return;
    }
    const newId = `benefit-${Date.now()}`;
    setData((prev) => ({
      ...prev,
      benefits: [
        ...prev.benefits,
        {
          id: newId,
          icon: "ShieldCheck",
          title: "New Feature",
          description: "Describe the customer benefit here.",
        },
      ],
    }));
  };

  const handleRemoveBenefit = (index: number) => {
    if (data.benefits.length <= 1) {
      toast.error("You must have at least 1 benefit");
      return;
    }
    setData((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateWhyChooseUsSettings(data);
      if (res.success) {
        toast.success("Brand Ethos & 'Why Choose Us' updated successfully!");
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
    if (!confirm("Are you sure you want to reset this section to the default copy and images?")) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await resetWhyChooseUsSettings();
      if (res.success) {
        setData(res.data);
        toast.success("Reset to defaults successfully");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to reset");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset");
    } finally {
      setIsResetting(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const match = AVAILABLE_ICONS.find((i) => i.value === iconName);
    return match ? match.icon : ShieldCheck;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Brand Ethos & &quot;Why Choose Us&quot;
            </h1>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
              Homepage CMS
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Customize the brand story, ethos badge, featured image, and customer benefits displayed on the homepage.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 border rounded-lg p-1 bg-muted/40">
            <Button
              type="button"
              size="sm"
              variant={previewTab === "edit" ? "secondary" : "ghost"}
              onClick={() => setPreviewTab("edit")}
              className="text-xs h-7 px-3 cursor-pointer"
            >
              Edit Form
            </Button>
            <Button
              type="button"
              size="sm"
              variant={previewTab === "preview" ? "secondary" : "ghost"}
              onClick={() => setPreviewTab("preview")}
              className="text-xs h-7 px-3 gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Live Preview
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleReset}
            disabled={isResetting || isSaving}
            className="text-xs h-8 gap-1.5 cursor-pointer"
          >
            {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reset Defaults
          </Button>

          <Button
            size="sm"
            type="button"
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 gap-1.5 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </Button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-2.5 h-8 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="View Homepage"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Visibility Toggle */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-r from-card to-muted/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Section Visibility</span>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                  data.isEnabled
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {data.isEnabled ? "Active on Homepage" : "Hidden"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Turn this toggle off if you want to temporarily hide the &quot;Why Choose Us&quot; section from the homepage.
            </p>
          </div>
          <Switch
            checked={data.isEnabled}
            onCheckedChange={(checked) =>
              setData((prev) => ({ ...prev, isEnabled: checked }))
            }
          />
        </CardContent>
      </Card>

      {previewTab === "preview" ? (
        /* Live Preview Mode */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Desktop & Mobile Live Preview (Reflects unsaved edits)</span>
            <span className="text-emerald-600 font-medium">✓ Real-time Sync</span>
          </div>
          <div className="rounded-xl border bg-white p-6 md:p-12 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 items-center gap-10 sm:gap-14 lg:grid-cols-2 lg:gap-16">
              {/* Left Side Preview */}
              <div className="relative aspect-[3/4] h-[450px] w-full overflow-hidden rounded-lg shadow-sm">
                <Image
                  src={data.imageUrl || DEFAULT_WHY_CHOOSE_US.imageUrl}
                  alt={data.title}
                  fill
                  sizes="50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 p-5 text-center backdrop-blur-sm shadow-md rounded">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.3em] text-[#C9A86A]">
                    {data.badge || "Our Ethos"}
                  </span>
                  <h2
                    className={`${jost.className} mb-2 text-xl font-light tracking-tight text-gray-900 md:text-2xl`}
                  >
                    {data.title || "The Anchor Fashion Difference"}
                  </h2>
                  <p className="text-xs leading-relaxed text-gray-500">
                    {data.description}
                  </p>
                </div>
              </div>

              {/* Right Side Preview */}
              <div className="flex flex-col gap-6">
                {data.benefits.map((benefit, idx) => {
                  const IconComp = getIconComponent(benefit.icon);
                  return (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-gray-200 text-[#C9A86A] bg-[#C9A86A]/5 rounded">
                        <IconComp className="h-5 w-5 stroke-[1.5]" />
                      </div>
                      <div>
                        <h3
                          className={`${jost.className} text-base font-medium text-[#1A1A1A]`}
                        >
                          {benefit.title}
                        </h3>
                        <p className="text-xs leading-relaxed text-gray-500 mt-0.5">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Form Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Brand Ethos & Featured Image (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">
                  Brand Ethos & Card
                </CardTitle>
                <CardDescription className="text-xs">
                  This card overlays the bottom of the featured brand image.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Badge */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Badge / Tagline
                  </label>
                  <Input
                    value={data.badge}
                    onChange={(e) =>
                      setData((prev) => ({ ...prev, badge: e.target.value }))
                    }
                    placeholder="e.g. OUR ETHOS"
                    className="text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Small golden uppercase label above the title.
                  </p>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Heading Title *
                  </label>
                  <Input
                    value={data.title}
                    onChange={(e) =>
                      setData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g. The Anchor Fashion Difference"
                    className="text-sm font-medium"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Description Paragraph *
                  </label>
                  <Textarea
                    rows={4}
                    value={data.description}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Write a short brand story..."
                    className="text-sm resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Featured Image Card */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">
                  Featured Image
                </CardTitle>
                <CardDescription className="text-xs">
                  Recommended portrait aspect ratio (3:4 or 4:5, e.g. 800x1000px).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image Preview */}
                <div className="relative aspect-[3/4] w-full max-h-[320px] rounded-lg overflow-hidden border bg-muted">
                  {data.imageUrl ? (
                    <Image
                      src={data.imageUrl}
                      alt="Brand preview"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No image selected
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs gap-2">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Uploading image...</span>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex items-center gap-3">
                  <label className="relative flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs h-9 cursor-pointer"
                      disabled={isUploading}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {isUploading ? "Uploading..." : "Upload New Image"}
                    </Button>
                  </label>
                </div>

                {/* Direct URL input */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    Or paste image URL:
                  </label>
                  <Input
                    value={data.imageUrl}
                    onChange={(e) =>
                      setData((prev) => ({ ...prev, imageUrl: e.target.value }))
                    }
                    placeholder="https://images.unsplash.com/..."
                    className="text-xs font-mono"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Features & Benefits List (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Benefits & Features List
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure the value proposition cards displayed next to the brand story.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddBenefit}
                  disabled={data.benefits.length >= 8}
                  className="gap-1.5 text-xs h-8 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Benefit
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                {data.benefits.map((benefit, index) => {
                  const IconComp = getIconComponent(benefit.icon);
                  return (
                    <div
                      key={benefit.id || index}
                      className="border rounded-lg p-4 bg-muted/20 space-y-3 relative group transition-colors hover:border-amber-300"
                    >
                      <div className="flex items-center justify-between pb-2 border-b">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[#C9A86A] text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-xs font-medium text-foreground">
                            Benefit #{index + 1}
                          </span>
                        </div>

                        {data.benefits.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBenefit(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0 cursor-pointer"
                            title="Delete this benefit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                        {/* Icon Picker (4 cols) */}
                        <div className="sm:col-span-4 space-y-1">
                          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                            Icon
                          </label>
                          <Select
                            value={benefit.icon}
                            onValueChange={(val) =>
                              handleBenefitChange(index, "icon", val || "ShieldCheck")
                            }
                            items={AVAILABLE_ICONS.map((item) => ({
                              value: item.value,
                              label: item.label,
                            }))}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <div className="flex items-center gap-2">
                                <IconComp className="w-4 h-4 text-[#C9A86A]" />
                                <SelectValue placeholder="Select icon">
                                  {AVAILABLE_ICONS.find((i) => i.value === benefit.icon)?.label}
                                </SelectValue>
                              </div>
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              {AVAILABLE_ICONS.map((item) => {
                                const ItemIcon = item.icon;
                                return (
                                  <SelectItem key={item.value} value={item.value}>
                                    <div className="flex items-center gap-2">
                                      <ItemIcon className="w-4 h-4 text-[#C9A86A]" />
                                      <span>{item.label}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Title (8 cols) */}
                        <div className="sm:col-span-8 space-y-1">
                          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                            Title *
                          </label>
                          <Input
                            value={benefit.title}
                            onChange={(e) =>
                              handleBenefitChange(index, "title", e.target.value)
                            }
                            placeholder="e.g. Premium Quality"
                            className="h-9 text-xs font-medium"
                          />
                        </div>

                        {/* Description (12 cols) */}
                        <div className="sm:col-span-12 space-y-1">
                          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                            Description *
                          </label>
                          <Textarea
                            rows={2}
                            value={benefit.description}
                            onChange={(e) =>
                              handleBenefitChange(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Crafted with the finest materials..."
                            className="text-xs resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBenefit}
                  disabled={data.benefits.length >= 8}
                  className="w-full gap-2 text-xs border-dashed h-9 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Another Benefit Card
                </Button>
              </CardContent>
            </Card>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
              <div>
                <p className="text-xs font-medium text-foreground">
                  Ready to apply changes?
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Homepage cache is updated immediately upon saving.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isUploading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-4 gap-2 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
