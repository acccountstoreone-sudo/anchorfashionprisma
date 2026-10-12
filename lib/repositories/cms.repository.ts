import { prisma } from "@/lib/prisma";
import { CMSPage, CMSSection, CMSNavigation, CMSPageBlock, CMSMediaItem } from "@/types/cms.types";
import { BlogPost, BlogCategory } from "@/types/blog.types";

// ============================================================================
// MAPPERS
// ============================================================================

function mapPrismaPage(data: any): CMSPage {
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    content: data.content,
    meta_title: data.metaTitle,
    meta_description: data.metaDescription,
    is_published: data.isPublished,
    published_at: data.publishedAt ? new Date(data.publishedAt).toISOString() : undefined,
    created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
    updated_at: data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
  } as CMSPage;
}

function mapPrismaBlogPost(data: any): BlogPost {
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt ?? null,
    content: data.content ?? null,
    featured_image: data.coverImage ?? null,
    category_id: data.categoryId ?? null,
    author_id: data.authorId ?? null,
    tags: data.tags ?? [],
    status: data.status as any,
    reading_time_minutes: null,
    published_at: data.publishedAt ? new Date(data.publishedAt) : null,
    created_at: data.createdAt ? new Date(data.createdAt) : new Date(),
    updated_at: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    blog_categories: data.category
      ? {
          id: data.category.id,
          name: data.category.name,
          slug: data.category.slug,
          description: data.category.description ?? null,
          created_at: data.category.createdAt ? new Date(data.category.createdAt) : new Date(),
          updated_at: data.category.createdAt ? new Date(data.category.createdAt) : new Date(),
        }
      : null,
  } as BlogPost;
}

function mapPrismaSection(data: any): CMSSection {
  return {
    id: data.id,
    name: data.title,
    type: data.type,
    content: data.content || {},
    is_global: data.isActive,
    created_at: data.createdAt ? new Date(data.createdAt) : new Date(),
    updated_at: data.updatedAt ? new Date(data.updatedAt) : new Date(),
  } as CMSSection;
}

function mapPrismaMedia(data: any): CMSMediaItem {
  return {
    id: data.id,
    file_name: data.fileName,
    file_url: data.fileUrl,
    file_type: data.fileType ?? "application/octet-stream",
    file_size_bytes: data.fileSizeBytes ?? 0,
    alt_text: data.altText ?? null,
    folder_path: data.folderPath ?? null,
    uploaded_by: data.uploadedBy ?? null,
    created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
    updated_at: data.updatedAt ? new Date(data.updatedAt).toISOString() : undefined,
  };
}

function mapPrismaNavigation(menu: any): CMSNavigation {
  return {
    id: menu.id,
    name: menu.title,
    location: menu.location,
    items: (menu.items || [])
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((it: any) => ({
        label: it.label,
        url: it.url,
        target: it.target ?? "_self",
        icon: it.icon ?? null,
      })),
    created_at: menu.createdAt ? new Date(menu.createdAt) : new Date(),
    updated_at: menu.updatedAt ? new Date(menu.updatedAt) : new Date(),
  };
}

// ============================================================================
// CMS REPOSITORY
// ============================================================================

export class CMSRepository {

  // --------------------------------------------------------------------------
  // CMS Pages
  // --------------------------------------------------------------------------

  async getPages(): Promise<CMSPage[]> {
    const pages = await prisma.cMSPage.findMany({
      orderBy: { createdAt: "desc" },
    });
    return pages.map(mapPrismaPage);
  }

  async getPageById(id: string): Promise<CMSPage | null> {
    try {
      const page = await prisma.cMSPage.findUnique({
        where: { id },
        include: { blocks: true },
      });
      if (!page) return null;
      return mapPrismaPage(page);
    } catch {
      return null;
    }
  }

  async getPageBySlug(slug: string): Promise<CMSPage | null> {
    try {
      const page = await prisma.cMSPage.findUnique({
        where: { slug },
        include: { blocks: true },
      });
      if (!page) return null;
      return mapPrismaPage(page);
    } catch {
      return null;
    }
  }

  async createPage(page: Partial<CMSPage>): Promise<CMSPage> {
    const created = await prisma.cMSPage.create({
      data: {
        id: page.id,
        title: page.title || "Untitled",
        slug: page.slug || `page-${Date.now()}`,
        metaTitle: (page as any).meta_title,
        metaDescription: (page as any).meta_description,
        isPublished: (page as any).is_published || false,
        publishedAt: (page as any).published_at ? new Date((page as any).published_at) : null,
      },
    });
    return mapPrismaPage(created);
  }

  async updatePage(id: string, page: Partial<CMSPage>): Promise<CMSPage> {
    const updated = await prisma.cMSPage.update({
      where: { id },
      data: {
        title: page.title,
        slug: page.slug,
        metaTitle: (page as any).meta_title,
        metaDescription: (page as any).meta_description,
        isPublished: (page as any).is_published,
        publishedAt: (page as any).published_at ? new Date((page as any).published_at) : undefined,
      },
    });
    return mapPrismaPage(updated);
  }

  async deletePage(id: string): Promise<void> {
    await prisma.cMSPage.delete({ where: { id } }).catch(() => {});
  }

  // --------------------------------------------------------------------------
  // CMS Page Blocks
  // --------------------------------------------------------------------------

  async getPageBlocks(pageId: string): Promise<CMSPageBlock[]> {
    try {
      const blocks = await prisma.cMSPageBlock.findMany({
        where: { pageId },
        orderBy: { displayOrder: "asc" },
      });
      return blocks.map((b) => ({
        id: b.id,
        page_id: b.pageId,
        section_type: b.sectionType,
        content_json: b.contentJson as any,
        display_order: b.displayOrder,
        is_active: true,
        created_at: b.createdAt,
        updated_at: b.updatedAt,
      })) as CMSPageBlock[];
    } catch {
      return [];
    }
  }

  async savePageBlocks(pageId: string, blocks: Partial<CMSPageBlock>[]): Promise<void> {
    try {
      await prisma.cMSPageBlock.deleteMany({ where: { pageId } });
      if (blocks.length > 0) {
        await prisma.cMSPageBlock.createMany({
          data: blocks.map((b, idx) => ({
            pageId,
            sectionType: (b as any).section_type || (b as any).type || "custom",
            contentJson: ((b as any).content_json || (b as any).content || {}) as any,
            displayOrder: (b as any).display_order ?? b.display_order ?? idx,
          })),
        });
      }
    } catch (err) {
      console.error("[savePageBlocks] Error:", err);
    }
  }

  // --------------------------------------------------------------------------
  // CMS Sections (Global Sections) — now via Prisma CmsSection model
  // --------------------------------------------------------------------------

  async getGlobalSections(): Promise<CMSSection[]> {
    try {
      const sections = await prisma.cmsSection.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      });
      return sections.map(mapPrismaSection);
    } catch {
      return [];
    }
  }

  async upsertSection(data: {
    id?: string;
    title: string;
    type: string;
    content?: Record<string, any>;
    isActive?: boolean;
    displayOrder?: number;
  }): Promise<CMSSection> {
    const section = data.id
      ? await prisma.cmsSection.update({
          where: { id: data.id },
          data: {
            title: data.title,
            type: data.type,
            content: (data.content || {}) as any,
            isActive: data.isActive ?? true,
            displayOrder: data.displayOrder ?? 0,
          },
        })
      : await prisma.cmsSection.create({
          data: {
            title: data.title,
            type: data.type,
            content: (data.content || {}) as any,
            isActive: data.isActive ?? true,
            displayOrder: data.displayOrder ?? 0,
          },
        });
    return mapPrismaSection(section);
  }

  async deleteSection(id: string): Promise<void> {
    await prisma.cmsSection.delete({ where: { id } }).catch(() => {});
  }

  // --------------------------------------------------------------------------
  // CMS Navigation — now via Prisma CmsMenu + CmsMenuItem models
  // --------------------------------------------------------------------------

  async getNavigation(location?: string): Promise<CMSNavigation | null> {
    try {
      const menu = location
        ? await prisma.cmsMenu.findUnique({
            where: { location },
            include: { items: { orderBy: { sortOrder: "asc" } } },
          })
        : await prisma.cmsMenu.findFirst({
            include: { items: { orderBy: { sortOrder: "asc" } } },
          });
      if (!menu) return null;
      return mapPrismaNavigation(menu);
    } catch {
      return null;
    }
  }

  async getAllNavigations(): Promise<CMSNavigation[]> {
    try {
      const menus = await prisma.cmsMenu.findMany({
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "asc" },
      });
      return menus.map(mapPrismaNavigation);
    } catch {
      return [];
    }
  }

  async saveNavigation(data: {
    id?: string;
    location: string;
    name: string;
    items: Array<{ label: string; url: string; target?: string; sort_order?: number }>;
    isActive?: boolean;
  }): Promise<CMSNavigation> {
    try {
      let menu: any;

      if (data.id) {
        // Update existing menu
        menu = await prisma.cmsMenu.update({
          where: { id: data.id },
          data: {
            location: data.location,
            title: data.name,
            isActive: data.isActive ?? true,
          },
          include: { items: true },
        });
      } else {
        // Upsert by location
        menu = await prisma.cmsMenu.upsert({
          where: { location: data.location },
          update: {
            title: data.name,
            isActive: data.isActive ?? true,
          },
          create: {
            location: data.location,
            title: data.name,
            isActive: data.isActive ?? true,
          },
          include: { items: true },
        });
      }

      // Replace all items
      await prisma.cmsMenuItem.deleteMany({ where: { menuId: menu.id } });

      if (data.items.length > 0) {
        await prisma.cmsMenuItem.createMany({
          data: data.items.map((item, idx) => ({
            menuId: menu.id,
            label: item.label,
            url: item.url,
            target: item.target ?? "_self",
            sortOrder: item.sort_order ?? idx,
          })),
        });
      }

      // Re-fetch with items
      const freshMenu = await prisma.cmsMenu.findUnique({
        where: { id: menu.id },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
      return mapPrismaNavigation(freshMenu!);
    } catch (err: any) {
      throw new Error(`Failed to save navigation: ${err.message}`);
    }
  }

  async deleteNavigation(id: string): Promise<void> {
    await prisma.cmsMenu.delete({ where: { id } }).catch(() => {});
  }

  // --------------------------------------------------------------------------
  // CMS Media Library — now via Prisma CmsMediaLibrary model
  // --------------------------------------------------------------------------

  async getMedia(): Promise<CMSMediaItem[]> {
    try {
      const items = await prisma.cmsMediaLibrary.findMany({
        orderBy: { createdAt: "desc" },
      });
      return items.map(mapPrismaMedia);
    } catch {
      return [];
    }
  }

  async createMedia(data: {
    fileName: string;
    fileUrl: string;
    fileType?: string;
    fileSizeBytes?: number;
    altText?: string;
    folderPath?: string;
    uploadedBy?: string | null;
  }): Promise<CMSMediaItem> {
    const item = await prisma.cmsMediaLibrary.create({
      data: {
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSizeBytes: data.fileSizeBytes,
        altText: data.altText,
        folderPath: data.folderPath,
        uploadedBy: data.uploadedBy,
      },
    });
    return mapPrismaMedia(item);
  }

  async deleteMedia(id: string): Promise<void> {
    await prisma.cmsMediaLibrary.delete({ where: { id } }).catch(() => {});
  }

  // --------------------------------------------------------------------------
  // Blog Posts
  // --------------------------------------------------------------------------

  async getBlogPosts(): Promise<BlogPost[]> {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });
    return posts.map(mapPrismaBlogPost);
  }

  async getBlogPostById(id: string): Promise<BlogPost> {
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!post) throw new Error("Blog post not found");
    return mapPrismaBlogPost(post);
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const post = await prisma.blogPost.findUnique({
        where: { slug },
        include: { category: true },
      });
      if (!post) return null;
      return mapPrismaBlogPost(post);
    } catch {
      return null;
    }
  }

  async createBlogPost(post: Partial<BlogPost>): Promise<BlogPost> {
    const created = await prisma.blogPost.create({
      data: {
        title: post.title || "Untitled",
        slug: post.slug || `post-${Date.now()}`,
        excerpt: post.excerpt,
        content: post.content || "",
        coverImage: post.featured_image,
        categoryId: post.category_id,
        authorId: post.author_id,
        status: post.status || "draft",
        publishedAt: post.published_at ? new Date(post.published_at) : null,
      },
      include: { category: true },
    });
    return mapPrismaBlogPost(created);
  }

  async updateBlogPost(id: string, post: Partial<BlogPost>): Promise<BlogPost> {
    const updated = await prisma.blogPost.update({
      where: { id },
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.featured_image,
        categoryId: post.category_id,
        authorId: post.author_id,
        status: post.status,
        publishedAt: post.published_at ? new Date(post.published_at) : undefined,
      },
      include: { category: true },
    });
    return mapPrismaBlogPost(updated);
  }

  async deleteBlogPost(id: string): Promise<void> {
    await prisma.blogPost.delete({ where: { id } }).catch(() => {});
  }

  // --------------------------------------------------------------------------
  // Blog Categories
  // --------------------------------------------------------------------------

  async getBlogCategories(): Promise<BlogCategory[]> {
    const cats = await prisma.blogCategory.findMany({ orderBy: { name: "asc" } });
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? null,
      created_at: c.createdAt,
      updated_at: c.createdAt,
    }));
  }

  async createBlogCategory(data: { name: string; slug: string; description?: string }): Promise<BlogCategory> {
    const cat = await prisma.blogCategory.create({
      data: {
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-"),
        description: data.description,
      },
    });
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? null,
      created_at: cat.createdAt,
      updated_at: cat.createdAt,
    };
  }

  // --------------------------------------------------------------------------
  // Banners — 100% Prisma (no Supabase cms_banners)
  // --------------------------------------------------------------------------

  async getBanners(placement?: string): Promise<any[]> {
    const banners = await prisma.banner.findMany({
      where: placement ? { placement } : undefined,
      orderBy: { displayOrder: "asc" },
    });
    return banners.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      description: b.description,
      cta_text: b.ctaText,
      link_url: b.linkUrl,
      image_url: b.imageUrl,
      media_url: b.mediaUrl ?? b.imageUrl,
      alt_text: b.altText,
      placement: b.placement,
      type: b.type,
      display_order: b.displayOrder,
      is_active: b.isActive,
      is_video: b.isVideo,
      start_date: b.startDate?.toISOString() ?? null,
      end_date: b.endDate?.toISOString() ?? null,
      created_at: b.createdAt.toISOString(),
      updated_at: b.updatedAt.toISOString(),
    }));
  }

  async upsertBanner(data: {
    id?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    ctaText?: string;
    linkUrl?: string;
    imageUrl: string;
    mediaUrl?: string;
    altText?: string;
    placement?: string;
    type?: string;
    displayOrder?: number;
    isActive?: boolean;
    isVideo?: boolean;
    targetAudience?: string;
    startDate?: string | null;
    endDate?: string | null;
  }): Promise<any> {
    const payload = {
      title: data.title?.trim() || "Banner",
      subtitle: data.subtitle || null,
      description: data.description || null,
      ctaText: data.ctaText || "Shop Now",
      linkUrl: data.linkUrl || "/products",
      imageUrl: data.imageUrl,
      mediaUrl: data.mediaUrl || data.imageUrl,
      altText: data.altText || null,
      placement: data.placement || "hero",
      type: data.type || (data.placement === "promo" ? "sidebar" : "hero"),
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive !== false,
      isVideo: data.isVideo ?? false,
      targetAudience: data.targetAudience || "all",
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    };

    const isUuid =
      data.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);

    const banner = isUuid
      ? await prisma.banner.update({ where: { id: data.id! }, data: payload })
      : await prisma.banner.create({ data: payload });

    return {
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      description: banner.description,
      cta_text: banner.ctaText,
      link_url: banner.linkUrl,
      image_url: banner.imageUrl,
      media_url: banner.mediaUrl,
      placement: banner.placement,
      is_active: banner.isActive,
      display_order: banner.displayOrder,
    };
  }

  async deleteBanner(id: string): Promise<void> {
    await prisma.banner.delete({ where: { id } }).catch(() => {});
  }

  async deleteAllBannersByPlacement(placement: string): Promise<void> {
    await prisma.banner.deleteMany({ where: { placement } }).catch(() => {});
  }

  async deleteAllBanners(): Promise<void> {
    await prisma.banner.deleteMany({ where: { placement: { in: ["hero", "promo"] } } }).catch(() => {});
  }
}
