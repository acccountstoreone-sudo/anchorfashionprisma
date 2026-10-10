import { BlogRepository } from "@/repositories/blog.repository";
import { blogPostSchema } from "@/validators/blog.schema";
import { BlogPost, BlogCategory, BlogTag } from "@/types/blog.types";

const blogRepository = new BlogRepository();

export class BlogService {
  async getPosts(status?: string): Promise<BlogPost[]> {
    return await blogRepository.getPosts(status);
  }

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    return await blogRepository.getPostBySlug(slug);
  }

  async getPostById(id: string): Promise<BlogPost | null> {
    return await blogRepository.getPostById(id);
  }

  async createPost(data: unknown): Promise<BlogPost> {
    const validData = blogPostSchema.parse(data);
    const postData: any = { ...validData };

    if (!postData.featured_image && postData.cover_image) {
      postData.featured_image = postData.cover_image;
    }
    delete postData.cover_image;

    if (!postData.reading_time_minutes && postData.content) {
      const words = postData.content.trim().split(/\s+/).length;
      postData.reading_time_minutes = Math.max(1, Math.ceil(words / 200));
    }

    return await blogRepository.createPost(postData);
  }

  async updatePost(id: string, data: unknown): Promise<BlogPost> {
    const validData = blogPostSchema.partial().parse(data);
    const postData: any = { ...validData };

    if (postData.cover_image !== undefined) {
      if (!postData.featured_image && postData.cover_image) {
        postData.featured_image = postData.cover_image;
      }
      delete postData.cover_image;
    }

    if (postData.content && !postData.reading_time_minutes) {
      const words = postData.content.trim().split(/\s+/).length;
      postData.reading_time_minutes = Math.max(1, Math.ceil(words / 200));
    }

    return await blogRepository.updatePost(id, postData);
  }

  async deletePost(id: string): Promise<void> {
    await blogRepository.deletePost(id);
  }

  async getCategories(): Promise<BlogCategory[]> {
    return await blogRepository.getCategories();
  }

  async getTags(): Promise<BlogTag[]> {
    return await blogRepository.getTags();
  }
}

export const blogService = new BlogService();
