import { CMSRepository } from "@/lib/repositories/cms.repository";
import { CMSPage, CMSNavigation } from "@/types/cms.types";
import { BlogPost } from "@/types/blog.types";

export class CMSService {
  private repository: CMSRepository;

  constructor() {
    this.repository = new CMSRepository();
  }

  // CMS Pages
  async getPages(): Promise<CMSPage[]> {
    return this.repository.getPages();
  }

  async getPageById(id: string): Promise<CMSPage> {
    return this.repository.getPageById(id);
  }

  async createPage(page: Partial<CMSPage>): Promise<CMSPage> {
    return this.repository.createPage(page);
  }

  async updatePage(id: string, page: Partial<CMSPage>): Promise<CMSPage> {
    return this.repository.updatePage(id, page);
  }

  // Navigation
  async getNavigation(): Promise<CMSNavigation[]> {
    return this.repository.getNavigation();
  }

  // Blog Posts
  async getBlogPosts(): Promise<BlogPost[]> {
    return this.repository.getBlogPosts();
  }

  async getBlogPostById(id: string): Promise<BlogPost> {
    return this.repository.getBlogPostById(id);
  }

  async createBlogPost(post: Partial<BlogPost>): Promise<BlogPost> {
    return this.repository.createBlogPost(post);
  }

  async updateBlogPost(id: string, post: Partial<BlogPost>): Promise<BlogPost> {
    return this.repository.updateBlogPost(id, post);
  }

  async deleteBlogPost(id: string): Promise<void> {
    return this.repository.deleteBlogPost(id);
  }
}
