import { createAdminClient } from "@/lib/supabase/server";

export interface CmsPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status:
    "DRAFT" | "IN_REVIEW" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  published_at: string;
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  template: string;
  status: string;
  blocks: CmsPageBlock[];
}

export interface CmsPageBlock {
  id: string;
  section_type: string;
  content_json: any;
  display_order: number;
}

export interface CmsMenu {
  id: string;
  name: string;
  location: string;
  items: CmsMenuItem[];
}

export interface CmsMenuItem {
  id: string;
  label: string;
  url: string;
  icon?: string;
  parent_id?: string;
  display_order: number;
  subItems?: CmsMenuItem[];
}

/**
 * Fetch a specific published blog post by its slug.
 */
export async function getBlogPostBySlug(slug: string): Promise<CmsPost | null> {
  const supabaseAdmin = await createAdminClient();
  const { data, error } = await supabaseAdmin
    .from("cms_blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .lte("published_at", new Date().toISOString())
    .single();

  if (error) {
    console.error(`Error fetching blog post ${slug}:`, error);
    return null;
  }
  return data;
}

/**
 * Fetch a dynamically built page and its active blocks.
 */
export async function getPageBySlug(slug: string): Promise<CmsPage | null> {
  const supabaseAdmin = await createAdminClient();
  const { data: page, error: pageError } = await supabaseAdmin
    .from("cms_pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .lte("published_at", new Date().toISOString())
    .single();

  if (pageError || !page) {
    return null;
  }

  const { data: blocks, error: blocksError } = await supabaseAdmin
    .from("cms_page_blocks")
    .select("*")
    .eq("page_id", page.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (blocksError) {
    console.error(`Error fetching page blocks for ${slug}:`, blocksError);
  }

  return {
    ...page,
    blocks: blocks || [],
  };
}

/**
 * Fetch a global menu (e.g. HEADER_MAIN) and build its hierarchy.
 */
export async function getMenuByLocation(
  location: string
): Promise<CmsMenu | null> {
  const supabaseAdmin = await createAdminClient();
  const { data: menu, error: menuError } = await supabaseAdmin
    .from("cms_menus")
    .select("*")
    .eq("location", location)
    .eq("is_active", true)
    .single();

  if (menuError || !menu) {
    return null;
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("cms_menu_items")
    .select("*")
    .eq("menu_id", menu.id)
    .order("display_order", { ascending: true });

  if (itemsError) {
    console.error(`Error fetching menu items for ${location}:`, itemsError);
    return null;
  }

  // Build a tree of menu items (assuming max 2 levels for simplicity here)
  const rootItems: CmsMenuItem[] = [];
  const itemMap = new Map<string, CmsMenuItem>();

  items?.forEach((item: any) => {
    item.subItems = [];
    itemMap.set(item.id, item);
  });

  items?.forEach((item: any) => {
    if (item.parent_id && itemMap.has(item.parent_id)) {
      itemMap.get(item.parent_id)!.subItems!.push(item);
    } else {
      rootItems.push(item);
    }
  });

  return {
    ...menu,
    items: rootItems,
  };
}
