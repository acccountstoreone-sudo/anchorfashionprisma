export type SectionType =
  | "HERO"
  | "PROMO"
  | "CATEGORY_GRID"
  | "PRODUCT_GRID"
  | "TRUST_BAR"
  | "SOCIAL_PROOF";

export interface HomepageSection {
  id: string;
  title: string;
  section_type: SectionType;
  is_active: boolean;
  display_order: number;
}

export interface HomepageHero {
  id: string;
  section_id: string;
  media_type: "IMAGE" | "VIDEO";
  media_url: string;
  headline?: string;
  subheadline?: string;
  cta_text?: string;
  cta_url?: string;
  overlay_opacity: number;
}

export interface HomepagePromotion {
  id: string;
  section_id: string;
  image_desktop: string;
  image_mobile?: string;
  title?: string;
  description?: string;
  cta_text?: string;
  cta_url?: string;
  bg_color?: string;
  start_date?: string;
  end_date?: string;
}

export interface SectionWithContent extends HomepageSection {
  hero_content?: HomepageHero;
  promo_content?: HomepagePromotion;
  featured_categories?: string[];
  featured_products?: string[];
}

// Enterprise CMS & Page Builder Types
export type ContentStatus =
  "draft" | "review" | "scheduled" | "published" | "archived";

export interface SeoMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

export interface CmsBlock {
  id: string;
  type:
    | "hero"
    | "product-carousel"
    | "category-grid"
    | "text"
    | "image"
    | "video"
    | "custom-html"
    | "testimonials"
    | "newsletter";
  settings: Record<string, any>;
  content: Record<string, any>;
  styles?: {
    padding?: string;
    margin?: string;
    background?: string;
    textColor?: string;
    customCss?: string;
  };
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  type: "homepage" | "landing_page" | "static_page" | "blog_index";
  status: ContentStatus;
  content_blocks: CmsBlock[];
  seo_metadata: SeoMetadata;
  published_at?: string;
  scheduled_at?: string;
  author_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CmsBlog {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  content_blocks: CmsBlock[];
  featured_image_url?: string;
  status: ContentStatus;
  author_id?: string;
  category_id?: string;
  seo_metadata: SeoMetadata;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CmsMedia {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
  alt_text?: string;
  folder_path: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  target?: "_blank" | "_self";
  children?: MenuItem[];
}

export interface CmsMenu {
  id: string;
  name: string;
  location: string;
  menu_structure: MenuItem[];
  created_at: string;
  updated_at: string;
}

export interface CmsBanner {
  id: string;
  title: string;
  type: "hero" | "popup" | "sidebar" | "announcement_bar";
  content?: string;
  media_url?: string;
  link_url?: string;
  target_audience: string;
  status: "active" | "inactive" | "scheduled";
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}
