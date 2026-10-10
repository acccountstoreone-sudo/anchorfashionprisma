import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { BlogPost, BlogCategory, BlogTag } from "@/types/blog.types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveFeaturedImageForWrite(
  featuredImage: string | null | undefined,
  title?: string
): Promise<string | null> {
  if (!featuredImage) return null;
  const trimmed = featuredImage.trim();
  if (!trimmed) return null;

  if (UUID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("cms_media")
      .select("id")
      .eq("file_url", trimmed)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return existing.id;
    }

    const fileName = title
      ? `${title.slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, "_")}.avif`
      : "cover.avif";

    const { data: created, error: insertError } = await admin
      .from("cms_media")
      .insert({
        file_name: fileName,
        file_url: trimmed,
        file_type: "image/avif",
        file_size_bytes: 0,
      })
      .select("id")
      .single();

    if (created?.id) {
      return created.id;
    }
    if (insertError) {
      console.error("[resolveFeaturedImageForWrite insert error]:", insertError);
    }
  } catch (err) {
    console.error("[resolveFeaturedImageForWrite error]:", err);
  }

  return trimmed;
}

async function populateMediaUrls(posts: any[]): Promise<void> {
  if (!posts || posts.length === 0) return;

  const uuidMap = new Map<string, string>();
  const uuidsToFetch: string[] = [];

  for (const p of posts) {
    if (p.featured_image && UUID_REGEX.test(p.featured_image)) {
      uuidsToFetch.push(p.featured_image);
    }
  }

  if (uuidsToFetch.length > 0) {
    const uniqueUuids = Array.from(new Set(uuidsToFetch));
    try {
      const admin = createAdminClient();
      const { data: mediaItems } = await admin
        .from("cms_media")
        .select("id, file_url")
        .in("id", uniqueUuids);

      if (mediaItems) {
        for (const m of mediaItems) {
          if (m.file_url) uuidMap.set(m.id, m.file_url);
        }
      }
    } catch (err) {
      console.error("[populateMediaUrls error]:", err);
    }

    for (const p of posts) {
      if (p.featured_image && uuidMap.has(p.featured_image)) {
        p.featured_image = uuidMap.get(p.featured_image);
      }
    }
  }
}

export class BlogRepository {
  async getPosts(status?: string): Promise<BlogPost[]> {
    const admin = createAdminClient();
    let query = admin
      .from("blog_posts")
      .select("*, blog_categories(*)")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[BlogRepository.getPosts Error]:", error);
      throw new Error(error.message);
    }
    if (data && data.length > 0) {
      await populateMediaUrls(data);
    }
    return data || [];
  }

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("blog_posts")
      .select("*, blog_categories(*), blog_post_tags(blog_tags(*))")
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      console.error("[BlogRepository.getPostBySlug Error]:", error);
      throw new Error(error.message);
    }
    if (data) {
      await populateMediaUrls([data]);
    }
    return data;
  }

  async getPostById(id: string): Promise<BlogPost | null> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("blog_posts")
      .select("*, blog_categories(*), blog_post_tags(blog_tags(*))")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      console.error("[BlogRepository.getPostById Error]:", error);
      throw new Error(error.message);
    }
    if (data) {
      await populateMediaUrls([data]);
    }
    return data;
  }

  async createPost(post: Partial<BlogPost>): Promise<BlogPost> {
    const admin = createAdminClient();

    const cleanedPost: any = { ...post };
    if (cleanedPost.category_id !== undefined) {
      if (!cleanedPost.category_id || !UUID_REGEX.test(cleanedPost.category_id)) {
        cleanedPost.category_id = null;
      }
    }

    if (cleanedPost.featured_image) {
      const resolvedMediaId = await resolveFeaturedImageForWrite(
        cleanedPost.featured_image,
        cleanedPost.title
      );
      if (resolvedMediaId) {
        cleanedPost.featured_image = resolvedMediaId;
      }
    } else {
      cleanedPost.featured_image = null;
    }

    const { data, error } = await admin
      .from("blog_posts")
      .insert(cleanedPost)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (data) await populateMediaUrls([data]);
    return data;
  }

  async updatePost(id: string, updates: Partial<BlogPost>): Promise<BlogPost> {
    const admin = createAdminClient();

    const cleanedUpdates: any = { ...updates };
    if (cleanedUpdates.category_id !== undefined) {
      if (!cleanedUpdates.category_id || !UUID_REGEX.test(cleanedUpdates.category_id)) {
        cleanedUpdates.category_id = null;
      }
    }

    if (cleanedUpdates.featured_image !== undefined) {
      if (cleanedUpdates.featured_image) {
        const resolvedMediaId = await resolveFeaturedImageForWrite(
          cleanedUpdates.featured_image,
          cleanedUpdates.title
        );
        if (resolvedMediaId) {
          cleanedUpdates.featured_image = resolvedMediaId;
        }
      } else {
        cleanedUpdates.featured_image = null;
      }
    }

    const { data, error } = await admin
      .from("blog_posts")
      .update(cleanedUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (data) await populateMediaUrls([data]);
    return data;
  }

  async deletePost(id: string): Promise<void> {
    const admin = createAdminClient();
    try {
      await admin.from("blog_post_tags").delete().eq("post_id", id);
    } catch {}
    const { error } = await admin.from("blog_posts").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async getCategories(): Promise<BlogCategory[]> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("blog_categories")
      .select("*")
      .order("name");
    if (error) {
      console.error("[BlogRepository.getCategories Error]:", error);
      throw new Error(error.message);
    }
    return data || [];
  }

  async getTags(): Promise<BlogTag[]> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("blog_tags")
      .select("*")
      .order("name");
    if (error) {
      console.error("[BlogRepository.getTags Error]:", error);
      throw new Error(error.message);
    }
    return data || [];
  }
}
