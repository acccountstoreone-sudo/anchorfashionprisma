"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash,
  Eye,
  Image as ImageIcon,
  ExternalLink,
  BookOpen,
  Globe,
  FileText,
  Calendar,
  Tag,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/features/admin/components/shared/ConfirmDialog";
import { deletePost, updatePost } from "@/actions/blog.actions";
import { toast } from "sonner";
import { BlogPost } from "@/types/blog.types";

interface CmsBlogsClientProps {
  posts: BlogPost[];
}

export function CmsBlogsClient({ posts: initialPosts }: CmsBlogsClientProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts || []);
  const [search, setSearch] = useState("");
  const [deletingPost, setDeletingPost] = useState<BlogPost | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    setPosts(initialPosts || []);
  }, [initialPosts]);

  const filtered = useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(q))
    );
  }, [search, posts]);

  const handleDelete = async () => {
    if (!deletingPost) return;
    setDeleteLoading(true);
    const target = deletingPost;
    try {
      // Optimistic update
      setPosts((prev) => prev.filter((p) => p.id !== target.id));
      await deletePost(target.id);
      toast.success(`Post "${target.title}" deleted successfully`);
      setDeletingPost(null);
      router.refresh();
    } catch (err: any) {
      toast.error("Failed to delete blog post", { description: err.message });
      // Revert if failed
      setPosts(initialPosts);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = async (post: BlogPost) => {
    const nextStatus = post.status === "published" ? "draft" : "published";
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, status: nextStatus } : p))
    );
    try {
      await updatePost(post.id, {
        status: nextStatus,
        published_at: nextStatus === "published" ? new Date().toISOString() : null,
      });
      toast.success(
        `Post "${post.title}" ${nextStatus === "published" ? "published" : "moved to draft"}`
      );
      router.refresh();
    } catch (err: any) {
      toast.error("Failed to update post status", { description: err.message });
      setPosts(initialPosts);
    }
  };

  const getPublicUrl = (post: BlogPost) => {
    return post.status === "published"
      ? `/blog/${post.slug}`
      : `/blog/${post.slug}?preview=true`;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
          <p className="mt-1 text-muted-foreground">
            Manage articles, fashion guides, editorial content, and categories.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/cms/blogs/new">
            <Button className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" /> Create Post
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">All Posts ({posts.length})</CardTitle>
            <div className="flex w-full max-w-sm items-center gap-2">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search articles..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Cover</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((post) => {
                  const img = post.featured_image || (post as any).cover_image;
                  const publicUrl = getPublicUrl(post);

                  return (
                    <TableRow key={post.id}>
                      {/* Cover Thumbnail */}
                      <TableCell>
                        <Link
                          href={`/admin/cms/blogs/${post.id}`}
                          className="block cursor-pointer transition-opacity hover:opacity-80"
                          title="Click to edit post"
                        >
                          {img ? (
                            <div className="relative h-10 w-14 overflow-hidden rounded border bg-muted">
                              <Image
                                src={img}
                                alt={post.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-14 items-center justify-center rounded border bg-muted text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </Link>
                      </TableCell>

                      {/* Title */}
                      <TableCell className="font-medium max-w-xs">
                        <Link
                          href={`/admin/cms/blogs/${post.id}`}
                          className="hover:underline hover:text-primary transition-colors cursor-pointer line-clamp-2"
                          title="Click to edit post"
                        >
                          {post.title}
                        </Link>
                      </TableCell>

                      {/* Slug */}
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:underline hover:text-primary transition-colors"
                          title="Open public page"
                        >
                          /blog/{post.slug}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={
                            post.status === "published" ? "default" : "outline"
                          }
                          className="cursor-pointer select-none"
                          onClick={() => handleToggleStatus(post)}
                          title="Click to toggle draft / published"
                        >
                          {post.status}
                        </Badge>
                      </TableCell>

                      {/* Published Date */}
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString()
                          : "-"}
                      </TableCell>

                      {/* Actions Dropdown */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 cursor-pointer"
                                aria-label="Open actions menu"
                              />
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            </DropdownMenuGroup>

                            {/* View Public Page */}
                            <DropdownMenuItem
                              onClick={() => window.open(publicUrl, "_blank")}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" /> View Post
                            </DropdownMenuItem>

                            {/* Quick Preview in Modal */}
                            <DropdownMenuItem
                              onClick={() => setPreviewPost(post)}
                              className="cursor-pointer"
                            >
                              <BookOpen className="mr-2 h-4 w-4" /> Quick Preview
                            </DropdownMenuItem>

                            {/* Edit Post */}
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/cms/blogs/${post.id}`)}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit Post
                            </DropdownMenuItem>

                            {/* Create New Post */}
                            <DropdownMenuItem
                              onClick={() => router.push("/admin/cms/blogs/new")}
                              className="cursor-pointer"
                            >
                              <Plus className="mr-2 h-4 w-4" /> Create New Post
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Toggle Publish / Draft */}
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(post)}
                              className="cursor-pointer"
                            >
                              {post.status === "published" ? (
                                <>
                                  <FileText className="mr-2 h-4 w-4" /> Move to Draft
                                </>
                              ) : (
                                <>
                                  <Globe className="mr-2 h-4 w-4" /> Publish Post
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Delete Post */}
                            <DropdownMenuItem
                              onClick={() => setDeletingPost(post)}
                              className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/30"
                            >
                              <Trash className="mr-2 h-4 w-4" /> Delete Post
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {search
                        ? "No blog posts match your search."
                        : "No blog posts found. Create your first post."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Preview Modal */}
      <Dialog open={!!previewPost} onOpenChange={(open) => !open && setPreviewPost(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {previewPost && (
            <div className="space-y-6 py-2">
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant={previewPost.status === "published" ? "default" : "outline"}>
                    {previewPost.status}
                  </Badge>
                  {previewPost.blog_categories?.name && (
                    <Badge variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {previewPost.blog_categories.name}
                    </Badge>
                  )}
                  {previewPost.published_at && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(previewPost.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-2xl font-bold leading-tight">
                  {previewPost.title}
                </DialogTitle>
                <p className="text-xs font-mono text-muted-foreground mt-1">
                  Slug: /blog/{previewPost.slug}
                </p>
              </DialogHeader>

              {/* Cover Image */}
              {(previewPost.featured_image || (previewPost as any).cover_image) && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                  <Image
                    src={previewPost.featured_image || (previewPost as any).cover_image}
                    alt={previewPost.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              {/* Excerpt */}
              {previewPost.excerpt && (
                <div className="rounded-md border-l-4 border-primary/50 bg-muted/40 p-4 text-sm italic text-muted-foreground">
                  {previewPost.excerpt}
                </div>
              )}

              {/* Content Preview */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Content Preview
                </h4>
                <div className="rounded-md border bg-muted/20 p-4 text-sm leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                  {previewPost.content || "No content provided."}
                </div>
              </div>

              {/* Footer Actions */}
              <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPreviewPost(null)}
                  className="cursor-pointer"
                >
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = getPublicUrl(previewPost);
                      window.open(url, "_blank");
                    }}
                    className="cursor-pointer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> View Public Page
                  </Button>
                  <Button
                    onClick={() => {
                      const id = previewPost.id;
                      setPreviewPost(null);
                      router.push(`/admin/cms/blogs/${id}`);
                    }}
                    className="cursor-pointer"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Post
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deletingPost}
        title={`Delete "${deletingPost?.title}"?`}
        description="This will permanently delete the blog post and cannot be undone."
        confirmLabel="Delete Post"
        variant="destructive"
        isLoading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeletingPost(null)}
      />
    </div>
  );
}
