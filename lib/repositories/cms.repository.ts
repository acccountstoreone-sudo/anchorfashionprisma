import { prisma } from "@/lib/prisma";
import { CMSPage, CMSSection, CMSNavigation } from "@/types/cms.types";
import { BlogPost, BlogCategory, BlogTag } from "@/types/blog.types";

export class CMSRepository {
  // CMS Pages
  async getPages(): Promise<CMSPage[]> {
    const pages = await prisma.cMSPage.findMany();
    return pages.map(mapPrismaPage) as CMSPage[];
  }

  async getPageById(id: string): Promise<CMSPage> {
    const page = await prisma.cMSPage.findUnique({
      where: { id },
      include: { blocks: true },
    });
    if (!page) throw new Error("Page not found");
    return mapPrismaPage(page) as CMSPage;
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
    return mapPrismaPage(created) as CMSPage;
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
    return mapPrismaPage(updated) as CMSPage;
  }

  // Navigation
  async getNavigation(): Promise<CMSNavigation[]> {
    // Navigation is not modeled in Prisma schema yet
    return [];
  }

  // Blog Posts
  async getBlogPosts(): Promise<BlogPost[]> {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
    });
    return posts.map(mapPrismaBlogPost) as BlogPost[];
  }

  async getBlogPostById(id: string): Promise<BlogPost> {
    const post = await prisma.blogPost.findUnique({
      where: { id },
    });
    if (!post) throw new Error("Blog post not found");
    return mapPrismaBlogPost(post) as BlogPost;
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
    return mapPrismaBlogPost(created) as BlogPost;
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
    return mapPrismaBlogPost(updated) as BlogPost;
  }

  async deleteBlogPost(id: string): Promise<void> {
    await prisma.blogPost.delete({ where: { id } });
  }
}

function mapPrismaPage(data: any) {
  return {
    ...data,
    meta_title: data.metaTitle,
    meta_description: data.metaDescription,
    is_published: data.isPublished,
    published_at: data.publishedAt?.toISOString(),
    created_at: data.createdAt.toISOString(),
    updated_at: data.updatedAt.toISOString(),
  };
}

function mapPrismaBlogPost(data: any) {
  return {
    ...data,
    featured_image: data.coverImage,
    category_id: data.categoryId,
    author_id: data.authorId,
    published_at: data.publishedAt?.toISOString(),
    created_at: data.createdAt.toISOString(),
    updated_at: data.updatedAt.toISOString(),
  };
}
