"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SeoSettings, updateSeoSettings } from "@/lib/actions/settings.actions";
import { toast } from "sonner";
import { Loader2, Globe, Sparkles } from "lucide-react";

export function SeoSettingsClient({ initialSettings }: { initialSettings: SeoSettings }) {
  const [settings, setSettings] = useState<SeoSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateSeoSettings(settings);
      if (res.success) {
        toast.success("SEO settings saved successfully and applied to public meta tags");
      } else {
        toast.error(res.error || "Failed to save SEO settings");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Default Meta Data & OpenGraph</CardTitle>
            <CardDescription>
              These settings configure how your storefront appears in search results and social previews.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="meta-title">Default Meta Title</Label>
          <Input 
            id="meta-title" 
            value={settings.meta_title} 
            onChange={(e) => setSettings({ ...settings, meta_title: e.target.value })} 
            placeholder="e.g. Anchor Fashion | Premium Apparel Brand"
          />
          <p className="text-xs text-muted-foreground">
            Recommended length: 50-60 characters ({settings.meta_title.length} characters)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta-description">Default Meta Description</Label>
          <Textarea
            id="meta-description"
            rows={3}
            value={settings.meta_description}
            onChange={(e) => setSettings({ ...settings, meta_description: e.target.value })}
            placeholder="Brief summary of your store for search engine snippets..."
          />
          <p className="text-xs text-muted-foreground">
            Recommended length: 140-160 characters ({settings.meta_description.length} characters)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Meta Keywords</Label>
          <Input 
            id="keywords" 
            value={settings.keywords || ""} 
            onChange={(e) => setSettings({ ...settings, keywords: e.target.value })} 
            placeholder="fashion, apparel, clothing, premium style"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="social-image">Default Social Share Image (OG Image) URL</Label>
          <Input 
            id="social-image" 
            value={settings.social_image} 
            onChange={(e) => setSettings({ ...settings, social_image: e.target.value })} 
            placeholder="https://yourdomain.com/og-image.jpg"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-border pt-4">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Changes take effect immediately across all storefront pages
        </span>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save SEO Settings
        </Button>
      </CardFooter>
    </Card>
  );
}
