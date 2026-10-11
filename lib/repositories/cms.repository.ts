import { prisma } from "@/lib/prisma";
import { CMSPage, CMSSection, CMSNavigation, CMSPageBlock } from "@/types/cms.types";
import { BlogPost, BlogCategory, BlogTag } from "@/types/blog.types";

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
    excerpt: data.excerpt,
    content: data.content,
    featured_image: data.coverImage,
    category_id: data.categoryId,
    author_id: data.authorId,
    status: data.status,
    published_at: data.publishedAt ? new Date(data.publishedAt).toISOString() : undefined,
    created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
    updated_at: data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
  } as BlogPost;
}

export class CMSRepository {
  // CMS Pages
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
        metaTitle: page.meta_title,
        metaDescription: page.meta_description,
        isPublished: page.is_published || false,
        publishedAt: page.published_at ? new Date(page.published_at) : null,
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
        metaTitle: page.meta_title,
        metaDescription: page.meta_description,
        isPublished: page.is_published,
        publishedAt: page.published_at ? new Date(page.published_at) : undefined,
      },
    });
    return mapPrismaPage(updated);
  }

  async deletePage(id: string): Promise<void> {
    await prisma.cMSPage.delete({ where: { id } }).catch(() => {});
  }

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
        content: b.contentJson as any,
        sort_order: b.displayOrder,
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
            sectionType: b.section_type || (b as any).type || "custom",
            contentJson: (b.content || {}) as any,
            displayOrder: b.sort_order ?? idx,
          })),
        });
      }
    } catch (err) {
      console.error("[savePageBlocks] Error:", err);
    }
  }

  async getGlobalSections(): Promise<CMSSection[]> {
    try {
      const res = (await prisma.$queryRawUnsafe(
        `SELECT * FROM "cms_sections" WHERE "is_active" = true`
      )) as any[];
      return res.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        content: r.content,
        is_active: r.is_active,
      }));
    } catch {
      return [];
    }
  }

  async getNavigation(location: string): Promise<CMSNavigation | null> {
    try {
      const res = (await prisma.$queryRawUnsafe(
        `SELECT * FROM "cms_menus" WHERE "location" = $1 AND "is_active" = true LIMIT 1`,
        location
      )) as any[];
      if (!res || res.length === 0) return null;
      const menu = res[0];
      const items = (await prisma.$queryRawUnsafe(
        `SELECT * FROM "cms_menu_items" WHERE "menu_id" = $1 ORDER BY "sort_order" ASC`,
        menu.id
      )) as any[];
      return {
        id: menu.id,
        location: menu.location,
        title: menu.title,
        is_active: menu.is_active,
        items: items.map((it) => ({
          id: it.id,
          label: it.label,
          url: it.url,
          sort_order: it.sort_order,
        })),
      };
    } catch {
      return null;
    }
  }

  async getAllNavigations(): Promise<CMSNavigation[]> {
    try {
      const res = (await prisma.$queryRawUnsafe(
        `SELECT * FROM "cms_menus" ORDER BY "created_at" ASC`
      )) as any[];
      const result: CMSNavigation[] = [];
      for (const menu of res) {
        const items = (await prisma.$queryRawUnsafe(
          `SELECT * FROM "cms_menu_items" WHERE "menu_id" = $1 ORDER BY "sort_order" ASC`,
          menu.id
        )) as any[];
        result.push({
          id: menu.id,
          location: menu.location,
          title: menu.title,
          is_active: menu.is_active,
          items: items.map((it) => ({
            id: it.id,
            label: it.label,
            url: it.url,
            sort_order: it.sort_order,
          })),
        });
      }
      return result;
    } catch {
      return [];
    }
  }

  async saveNavigation(data: Partial<CMSNavigation>): Promise<CMSNavigation> {
    try {
      let menuId = data.id;
      if (!menuId) {
        const inserted = (await prisma.$queryRawUnsafe(
          `INSERT INTO "cms_menus" ("location", "title", "is_active") VALUES ($1, $2, $3) RETURNING *`,
          data.location || "header",
          data.title || "Header Menu",
          data.is_active ?? true
        )) as any[];
        menuId = inserted[0]?.id;
      } else {
        await prisma.$queryRawUnsafe(
          `UPDATE "cms_menus" SET "location" = $1, "title" = $2, "is_active" = $3 WHERE "id" = $4`,
          data.location || "header",
          data.title || "Menu",
          data.is_active ?? true,
          menuId
        );
      }
      if (data.items && menuId) {
        await prisma.$queryRawUnsafe(
          `DELETE FROM "cms_menu_items" WHERE "menu_id" = $1`,
          menuId
        );
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          await prisma.$queryRawUnsafe(
            `INSERT INTO "cms_menu_items" ("menu_id", "label", "url", "sort_order") VALUES ($1, $2, $3, $4)`,
            menuId,
            item.label,
            item.url,
            item.sort_order ?? i
          );
        }
      }
      return (await this.getNavigation(data.location || "header"))!;
    } catch (err: any) {
      throw new Error(`Failed to save navigation: ${err.message}`);
    }
  }

  // Blog Posts
  async getBlogPosts(): Promise<BlogPost[]> {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
    });
    return posts.map(mapPrismaBlogPost);
  }

  async getBlogPostById(id: string): Promise<BlogPost> {
    const post = await prisma.blogPost.findUnique({
      where: { id },
    });
    if (!post) throw new Error("Blog post not found");
    return mapPrismaBlogPost(post);
  }

  async createBlogPost(post: Partial<BlogPost>): Promise<BlogPost> {
    const created = await prisma.blogPost.create({
      data: {
        id: post.id,
        title: post.title || "Untitled",
        slug: post.slug || `post-${Date.now()}`,
        excerpt: post.excerpt,
        content: post.content || "",
        coverImage: post.featured_image,
        categoryId: post.category_id,
        authorId: post.author_id,
        status: post.status || "DRAFT",
        publishedAt: post.published_at ? new Date(post.published_at) : null,
      },
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
    });
    return mapPrismaBlogPost(updated);
  }

  async deleteBlogPost(id: string): Promise<void> {
    await prisma.blogPost.delete({ where: { id } }).catch(() => {});
  }
}
