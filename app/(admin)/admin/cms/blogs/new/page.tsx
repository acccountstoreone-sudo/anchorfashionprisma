"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPost, getCategories } from "@/actions/blog.actions";
import { uploadImageAction } from "@/lib/actions/upload.actions";
import { BlogCategory } from "@/types/blog.types";
import { ArrowLeft, Save, Upload, Image as ImageIcon, Loader2, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

export default function NewBlogPost() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image: "",
    category_id: "",
    tags: "",
    status: "draft",
    published_at: "",
  });

  useEffect(() => {
    getCategories().then((cats) => {
      if (cats && cats.length > 0) {
        setCategories(cats);
      }
    });
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setFormData((prev) => ({ ...prev, title, slug }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPEG, WEBP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("bucket", "blog_images");
      uploadData.append("folder", "covers");

      const res = await uploadImageAction(uploadData);
      if (res.success && res.url) {
        setImagePreview(res.url);
        setFormData((prev) => ({ ...prev, featured_image: res.url! }));
        toast.success("Cover image uploaded!");
      } else {
        toast.error(res.error || "Failed to upload image");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Post title is required");
      return;
    }

    if (!formData.slug.trim()) {
      toast.error("URL Slug is required");
      return;
    }

    if (!formData.content.trim()) {
      toast.error("Article content is required");
      return;
    }

    setLoading(true);
    try {
      const parsedTags = formData.tags
        ? formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const payload = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        excerpt: formData.excerpt.trim() || undefined,
        content: formData.content.trim(),
        featured_image: formData.featured_image || undefined,
        category_id:
          formData.category_id && formData.category_id !== "general"
            ? formData.category_id
            : undefined,
        tags: parsedTags,
        status: formData.status.toLowerCase(),
        published_at: formData.published_at
          ? new Date(formData.published_at).toISOString()
          : formData.status === "published"
          ? new Date().toISOString()
          : undefined,
      };

      await createPost(payload);
      toast.success("Blog post created successfully!");
      router.push("/admin/cms/blogs");
    } catch (error: any) {
      toast.error(error.message || "Failed to create blog post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/cms/blogs">
            <Button type="button" variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Blog Post</h1>
        </div>
        <Button type="submit" disabled={loading || uploadingImage}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Post
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Article Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Post Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Summer Fashion Trends & Styling Guide"
                  value={formData.title}
                  onChange={handleTitleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL Path) *</Label>
                <Input
                  id="slug"
                  placeholder="e.g. summer-fashion-trends"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt / Summary</Label>
                <Textarea
                  id="excerpt"
                  placeholder="Brief summary for card previews and SEO..."
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData({ ...formData, excerpt: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  className="min-h-[320px]"
                  placeholder="Write your article content here in Markdown or plain text..."
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  required
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          {/* Publishing Card */}
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData({ ...formData, status: val || "draft" })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="published_at">Publish Date</Label>
                <Input
                  id="published_at"
                  type="datetime-local"
                  value={formData.published_at}
                  onChange={(e) =>
                    setFormData({ ...formData, published_at: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Taxonomy & Meta */}
          <Card>
            <CardHeader>
              <CardTitle>Organization & Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(val) =>
                    setFormData({ ...formData, category_id: val || "" })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                    {categories.length === 0 && (
                      <SelectItem value="general">General</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="fashion, styling, summer (comma separated)"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                />
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <Label>Cover Image</Label>
                {imagePreview || formData.featured_image ? (
                  <div className="relative rounded-lg overflow-hidden border border-border aspect-video w-full">
                    <Image
                      src={imagePreview || formData.featured_image}
                      alt="Cover preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData({ ...formData, featured_image: "" });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <label className="cursor-pointer">
                      <span className="text-xs text-primary font-medium hover:underline">
                        Upload cover image
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                    <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                  </div>
                )}
                {uploadingImage && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading image...
                  </div>
                )}
                <div className="pt-1">
                  <Label htmlFor="featured_image_url_new" className="text-[11px] text-muted-foreground">Or Image URL</Label>
                  <Input
                    id="featured_image_url_new"
                    placeholder="https://..."
                    value={formData.featured_image}
                    onChange={(e) => {
                      const url = e.target.value;
                      setFormData((prev) => ({ ...prev, featured_image: url }));
                      setImagePreview(url || null);
                    }}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
