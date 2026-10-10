export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  created_at: Date;
}

export type BlogPostStatus = "draft" | "scheduled" | "published" | "archived";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  category_id: string | null;
  author_id: string;
  featured_image: string | null;
  status: BlogPostStatus;
  reading_time_minutes: number | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  blog_categories?: BlogCategory | null;
  blog_tags?: BlogTag[];
}

export interface BlogPostTag {
  post_id: string;
  tag_id: string;
}
