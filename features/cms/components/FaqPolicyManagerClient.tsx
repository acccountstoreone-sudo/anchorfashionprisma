"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Truck,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  Save,
  Loader2,
  CheckCircle2,
  X,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FAQItem,
  ShippingPolicyConfig,
  ReturnPolicyConfig,
  createFaqAction,
  updateFaqAction,
  deleteFaqAction,
  updateStorePoliciesAction,
} from "@/app/actions/cms/faq-policy.actions";
import { toast } from "sonner";

const COMMON_CATEGORIES = [
  "Orders & Delivery",
  "Returns & Exchanges",
  "Payment & Security",
  "Products & Sizing",
  "General & Support",
];

interface FaqPolicyManagerClientProps {
  initialFaqs: FAQItem[];
  initialShipping: ShippingPolicyConfig;
  initialReturns: ReturnPolicyConfig;
  defaultTab?: string;
  baseRoute?: string; // "/manager/cms" or "/admin/cms"
}

export function FaqPolicyManagerClient({
  initialFaqs = [],
  initialShipping,
  initialReturns,
  defaultTab = "faqs",
  baseRoute = "/manager/cms",
}: FaqPolicyManagerClientProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [faqs, setFaqs] = useState<FAQItem[]>(initialFaqs);
  const [shipping, setShipping] = useState<ShippingPolicyConfig>(initialShipping);
  const [returns, setReturns] = useState<ReturnPolicyConfig>(initialReturns);

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // FAQ Modal states
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [faqForm, setFaqForm] = useState({
    category: "Orders & Delivery",
    customCategory: "",
    question: "",
    answer: "",
    display_order: 0,
  });

  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // New Reason input for returns
  const [newReasonInput, setNewReasonInput] = useState("");

  // Categories list derived from current items + standard
  const allCategories = Array.from(
    new Set([...COMMON_CATEGORIES, ...faqs.map((f) => f.category)])
  ).filter(Boolean);

  // Filtered FAQs
  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory =
      selectedCategory === "ALL" || faq.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      faq.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // Open Create FAQ Modal
  const handleOpenCreateFaq = () => {
    setEditingFaq(null);
    setFaqForm({
      category: COMMON_CATEGORIES[0],
      customCategory: "",
      question: "",
      answer: "",
      display_order: faqs.length + 1,
    });
    setIsFaqModalOpen(true);
  };

  // Open Edit FAQ Modal
  const handleOpenEditFaq = (item: FAQItem) => {
    setEditingFaq(item);
    const isStandard = COMMON_CATEGORIES.includes(item.category);
    setFaqForm({
      category: isStandard ? item.category : "CUSTOM",
      customCategory: isStandard ? "" : item.category,
      question: item.question,
      answer: item.answer,
      display_order: item.display_order,
    });
    setIsFaqModalOpen(true);
  };

  // Save FAQ (Create or Update)
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory =
      faqForm.category === "CUSTOM"
        ? faqForm.customCategory.trim()
        : faqForm.category.trim();

    if (!finalCategory) {
      toast.error("Please specify a category.");
      return;
    }
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      toast.error("Question and answer are required.");
      return;
    }

    startTransition(async () => {
      if (editingFaq) {
        const res = await updateFaqAction(editingFaq.id, {
          category: finalCategory,
          question: faqForm.question.trim(),
          answer: faqForm.answer.trim(),
          display_order: Number(faqForm.display_order) || 0,
        });

        if (res.success && res.data) {
          setFaqs((prev) =>
            prev.map((item) => (item.id === editingFaq.id ? res.data! : item))
          );
          toast.success("FAQ question updated successfully.");
          setIsFaqModalOpen(false);
        } else {
          toast.error(res.error || "Failed to update FAQ.");
        }
      } else {
        const res = await createFaqAction({
          category: finalCategory,
          question: faqForm.question.trim(),
          answer: faqForm.answer.trim(),
          display_order: Number(faqForm.display_order) || 0,
        });

        if (res.success && res.data) {
          setFaqs((prev) => [...prev, res.data!].sort((a, b) => a.display_order - b.display_order));
          toast.success("New FAQ added successfully.");
          setIsFaqModalOpen(false);
        } else {
          toast.error(res.error || "Failed to create FAQ.");
        }
      }
    });
  };

  // Delete FAQ
  const handleDeleteFaq = async (item: FAQItem) => {
    if (!confirm(`Are you sure you want to delete this FAQ?\n\n"${item.question}"`)) {
      return;
    }
    setDeleteId(item.id);
    const res = await deleteFaqAction(item.id);
    setDeleteId(null);

    if (res.success) {
      setFaqs((prev) => prev.filter((f) => f.id !== item.id));
      toast.success("FAQ deleted.");
    } else {
      toast.error(res.error || "Failed to delete FAQ.");
    }
  };

  // Save Shipping Policy
  const handleSaveShippingPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateStorePoliciesAction({ shipping });
      if (res.success) {
        toast.success("Shipping policies updated and live on storefront.");
      } else {
        toast.error(res.error || "Failed to update shipping policies.");
      }
    });
  };

  // Save Return Policy
  const handleSaveReturnPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateStorePoliciesAction({ returns });
      if (res.success) {
        toast.success("Return & exchange policies updated successfully.");
      } else {
        toast.error(res.error || "Failed to update return policies.");
      }
    });
  };

  // Add reason to return policy
  const handleAddReason = () => {
    if (!newReasonInput.trim()) return;
    if (returns.allowed_reasons.includes(newReasonInput.trim())) {
      toast.error("Reason already in list.");
      return;
    }
    setReturns({
      ...returns,
      allowed_reasons: [...returns.allowed_reasons, newReasonInput.trim()],
    });
    setNewReasonInput("");
  };

  const handleRemoveReason = (indexToRemove: number) => {
    setReturns({
      ...returns,
      allowed_reasons: returns.allowed_reasons.filter((_, i) => i !== indexToRemove),
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            <Link href={baseRoute} className="hover:underline">
              CMS
            </Link>
            <span>/</span>
            <span className="text-foreground">FAQs & Store Policies</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">FAQs & Policies Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage customer help center questions, shipping terms, and exchange rules. All updates immediately reflect on the live storefront.
          </p>
        </div>

        {/* Quick View Live Links */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/support/faq" target="_blank" className="flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Live FAQ Page</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/support/shipping" target="_blank" className="flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Live Shipping Policy</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl mb-6">
          <TabsTrigger value="faqs" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span>FAQs ({faqs.length})</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span>Shipping Policy</span>
          </TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Return Rules</span>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: FAQS MANAGER */}
        {/* ========================================================================= */}
        <TabsContent value="faqs" className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-xl border">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions or answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || "ALL")}>
                <SelectTrigger className="w-[180px] text-sm">
                  <SelectValue placeholder="Filter Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleOpenCreateFaq} className="shrink-0">
              <Plus className="mr-1.5 h-4 w-4" />
              Add New FAQ
            </Button>
          </div>

          {/* Category Chips Bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                selectedCategory === "ALL"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All ({faqs.length})
            </button>
            {allCategories.map((cat) => {
              const count = faqs.filter((f) => f.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* FAQs List */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed bg-card text-muted-foreground">
                <HelpCircle className="h-10 w-10 stroke-1 mb-2 opacity-50" />
                <h3 className="font-semibold text-foreground">No FAQs Found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {searchQuery || selectedCategory !== "ALL"
                    ? "Try adjusting your search query or category filter."
                    : "No FAQ questions yet. Click 'Add New FAQ' to create your first question."}
                </p>
                <Button onClick={handleOpenCreateFaq} size="sm" variant="outline" className="mt-4">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add First Question
                </Button>
              </div>
            ) : (
              filteredFaqs.map((faq, index) => (
                <Card key={faq.id} className="transition-all hover:border-primary/40 shadow-xs">
                  <CardContent className="p-5 flex flex-col md:flex-row items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {faq.category}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Order: #{faq.display_order}
                        </Badge>
                      </div>

                      <h3 className="text-base font-semibold text-foreground tracking-tight">
                        {faq.question}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditFaq(faq)}
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleteId === faq.id}
                        onClick={() => handleDeleteFaq(faq)}
                        className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                      >
                        {deleteId === faq.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: SHIPPING POLICY */}
        {/* ========================================================================= */}
        <TabsContent value="shipping">
          <form onSubmit={handleSaveShippingPolicy} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Delivery Rates & Timelines</CardTitle>
                    <CardDescription>
                      Configure standard shipping fees, delivery duration, and free shipping conditions shown to customers on the support pages and checkout.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Inside Dhaka */}
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-semibold text-sm text-foreground">Inside Dhaka Metropolitan</h4>
                      <Badge variant="outline" className="text-xs">Metro Area</Badge>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inside_dhaka_delivery_time">Delivery Timeline</Label>
                      <Input
                        id="inside_dhaka_delivery_time"
                        value={shipping.inside_dhaka_delivery_time}
                        onChange={(e) =>
                          setShipping({ ...shipping, inside_dhaka_delivery_time: e.target.value })
                        }
                        placeholder="e.g. 24 to 48 hours"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inside_dhaka_fee">Standard Delivery Fee (BDT ৳)</Label>
                      <Input
                        id="inside_dhaka_fee"
                        type="number"
                        min="0"
                        value={shipping.inside_dhaka_fee}
                        onChange={(e) =>
                          setShipping({ ...shipping, inside_dhaka_fee: Number(e.target.value) || 0 })
                        }
                        placeholder="60"
                        required
                      />
                    </div>
                  </div>

                  {/* Outside Dhaka */}
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-semibold text-sm text-foreground">Outside Dhaka (All Districts)</h4>
                      <Badge variant="outline" className="text-xs">Nationwide</Badge>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="outside_dhaka_delivery_time">Delivery Timeline</Label>
                      <Input
                        id="outside_dhaka_delivery_time"
                        value={shipping.outside_dhaka_delivery_time}
                        onChange={(e) =>
                          setShipping({ ...shipping, outside_dhaka_delivery_time: e.target.value })
                        }
                        placeholder="e.g. 3 to 5 business days"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="outside_dhaka_fee">Standard Delivery Fee (BDT ৳)</Label>
                      <Input
                        id="outside_dhaka_fee"
                        type="number"
                        min="0"
                        value={shipping.outside_dhaka_fee}
                        onChange={(e) =>
                          setShipping({ ...shipping, outside_dhaka_fee: Number(e.target.value) || 0 })
                        }
                        placeholder="120"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Free Shipping & Partners */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="free_shipping_threshold">Free Shipping Order Minimum (৳)</Label>
                    <Input
                      id="free_shipping_threshold"
                      type="number"
                      min="0"
                      value={shipping.free_shipping_threshold}
                      onChange={(e) =>
                        setShipping({
                          ...shipping,
                          free_shipping_threshold: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="999"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Orders above this total automatically receive free delivery.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="courier_partners">Courier Service Partners</Label>
                    <Input
                      id="courier_partners"
                      value={shipping.courier_partners}
                      onChange={(e) =>
                        setShipping({ ...shipping, courier_partners: e.target.value })
                      }
                      placeholder="e.g. Pathao, Steadfast, Paperfly"
                    />
                    <p className="text-xs text-muted-foreground">
                      Displayed on shipping policies and order dispatch notes.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="processing_time">Order Processing & Cutoff Time</Label>
                  <Input
                    id="processing_time"
                    value={shipping.processing_time}
                    onChange={(e) =>
                      setShipping({ ...shipping, processing_time: e.target.value })
                    }
                    placeholder="e.g. Orders placed before 2:00 PM are processed same-day"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipping_notice">Public Shipping Notice / Tracking Notes</Label>
                  <Textarea
                    id="shipping_notice"
                    rows={3}
                    value={shipping.notice || ""}
                    onChange={(e) => setShipping({ ...shipping, notice: e.target.value })}
                    placeholder="Real-time SMS tracking updates are sent to the customer upon courier pickup..."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending} className="px-6">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Shipping Policy
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: RETURN & EXCHANGE RULES */}
        {/* ========================================================================= */}
        <TabsContent value="returns">
          <form onSubmit={handleSaveReturnPolicy} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Return & Exchange Rules</CardTitle>
                    <CardDescription>
                      Define return eligibility, replacement windows, and allowed customer dispute reasons shown on the support portal.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="return_window_days">Return / Exchange Window (Days)</Label>
                    <Input
                      id="return_window_days"
                      type="number"
                      min="1"
                      max="90"
                      value={returns.return_window_days}
                      onChange={(e) =>
                        setReturns({
                          ...returns,
                          return_window_days: Number(e.target.value) || 7,
                        })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of days from delivery date within which customers can request returns/exchanges.
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label className="text-sm font-medium">Allow Size & Color Exchanges</Label>
                        <p className="text-xs text-muted-foreground">
                          Permit customers to exchange clothing for different sizes.
                        </p>
                      </div>
                      <Switch
                        checked={returns.allow_exchanges}
                        onCheckedChange={(checked) =>
                          setReturns({ ...returns, allow_exchanges: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label className="text-sm font-medium">Require Photo Proof For Damaged Items</Label>
                        <p className="text-xs text-muted-foreground">
                          Require unboxing photo or video when submitting damage claims.
                        </p>
                      </div>
                      <Switch
                        checked={returns.require_photo_for_damaged}
                        onCheckedChange={(checked) =>
                          setReturns({ ...returns, require_photo_for_damaged: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conditions">Product Eligibility Conditions</Label>
                  <Textarea
                    id="conditions"
                    rows={3}
                    value={returns.conditions}
                    onChange={(e) => setReturns({ ...returns, conditions: e.target.value })}
                    placeholder="Items must be unworn, unwashed, and with all original tags attached..."
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Displayed prominently on product details and support pages.
                  </p>
                </div>

                {/* Allowed Return Reasons Tag Editor */}
                <div className="space-y-3">
                  <Label>Allowed Return & Exchange Reasons</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {returns.allowed_reasons.map((reason, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="py-1 px-2.5 text-xs flex items-center gap-1.5"
                      >
                        <span>{reason}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveReason(idx)}
                          className="hover:text-destructive focus:outline-none"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2 max-w-md">
                    <Input
                      placeholder="Add another reason (e.g. Stitching flaw)..."
                      value={newReasonInput}
                      onChange={(e) => setNewReasonInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddReason();
                        }
                      }}
                      className="text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddReason}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policy_notice">Return Instructions / Customer Guidance Note</Label>
                  <Textarea
                    id="policy_notice"
                    rows={2}
                    value={returns.policy_notice || ""}
                    onChange={(e) => setReturns({ ...returns, policy_notice: e.target.value })}
                    placeholder="Contact customer service via phone or initiate through your user account..."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending} className="px-6">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Return Rules
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* ADD / EDIT FAQ DIALOG */}
      {/* ========================================================================= */}
      <Dialog open={isFaqModalOpen} onOpenChange={setIsFaqModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingFaq ? "Edit FAQ Question" : "Add Frequently Asked Question"}
            </DialogTitle>
            <DialogDescription>
              {editingFaq
                ? "Update question text, category or answer."
                : "Add a clear question and informative response for customers."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFaq} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="faq_category">Category</Label>
                <Select
                  value={faqForm.category}
                  onValueChange={(val) =>
                    setFaqForm({ ...faqForm, category: val || COMMON_CATEGORIES[0] })
                  }
                >
                  <SelectTrigger id="faq_category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="CUSTOM">+ Custom Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="faq_order">Display Priority Order</Label>
                <Input
                  id="faq_order"
                  type="number"
                  min="0"
                  value={faqForm.display_order}
                  onChange={(e) =>
                    setFaqForm({ ...faqForm, display_order: Number(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            {faqForm.category === "CUSTOM" && (
              <div className="space-y-2">
                <Label htmlFor="customCategory">Custom Category Name</Label>
                <Input
                  id="customCategory"
                  value={faqForm.customCategory}
                  onChange={(e) => setFaqForm({ ...faqForm, customCategory: e.target.value })}
                  placeholder="e.g. Loyalty & Discounts"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="faq_question">Question <span className="text-destructive">*</span></Label>
              <Input
                id="faq_question"
                value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                placeholder="e.g. How long does standard delivery take?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faq_answer">Answer <span className="text-destructive">*</span></Label>
              <Textarea
                id="faq_answer"
                rows={5}
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                placeholder="Provide a comprehensive and friendly answer for your customers..."
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFaqModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingFaq ? "Save Changes" : "Create FAQ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
