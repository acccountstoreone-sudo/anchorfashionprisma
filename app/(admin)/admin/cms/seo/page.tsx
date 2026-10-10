"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Globe } from "lucide-react";
import { toast } from "sonner";
import { updateSeoSettings } from "@/actions/cms.actions";

export default function SeoManager() {
  const [loading, setLoading] = useState(false);
  const [seoConfig, setSeoConfig] = useState({
    metaTitle: "Anchor Fashion | Premium Clothing",
    metaDescription:
      "Discover the latest trends in premium fashion at Anchor Fashion.",
    ogImage: "https://anchorfashion.com/og-image.jpg",
    twitterHandle: "@anchorfashion",
    enableIndex: true,
    jsonLd:
      '{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Anchor Fashion",\n  "url": "https://anchorfashion.com"\n}',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateSeoSettings(seoConfig);
      toast.success("Global SEO settings updated");
    } catch (error) {
      toast.error("Failed to update SEO settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SEO & Routing</h1>
          <p className="mt-1 text-muted-foreground">
            Configure global search engine optimization rules.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" /> Default Meta Tags
              </CardTitle>
              <CardDescription>
                Applied when page-specific tags are missing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Site Title Format</Label>
                <Input
                  id="metaTitle"
                  value={seoConfig.metaTitle}
                  onChange={(e) =>
                    setSeoConfig({ ...seoConfig, metaTitle: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaDescription">
                  Default Meta Description
                </Label>
                <Textarea
                  id="metaDescription"
                  value={seoConfig.metaDescription}
                  onChange={(e) =>
                    setSeoConfig({
                      ...seoConfig,
                      metaDescription: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media (Open Graph)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ogImage">Default OG Image URL</Label>
                <Input
                  id="ogImage"
                  value={seoConfig.ogImage}
                  onChange={(e) =>
                    setSeoConfig({ ...seoConfig, ogImage: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitterHandle">Twitter Handle</Label>
                <Input
                  id="twitterHandle"
                  value={seoConfig.twitterHandle}
                  onChange={(e) =>
                    setSeoConfig({
                      ...seoConfig,
                      twitterHandle: e.target.value,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label>Search Engine Indexing</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow search engines to index this site
                  </p>
                </div>
                <Switch
                  checked={seoConfig.enableIndex}
                  onCheckedChange={(c) =>
                    setSeoConfig({ ...seoConfig, enableIndex: c })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jsonLd">Organization JSON-LD</Label>
                <Textarea
                  id="jsonLd"
                  value={seoConfig.jsonLd}
                  onChange={(e) =>
                    setSeoConfig({ ...seoConfig, jsonLd: e.target.value })
                  }
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
