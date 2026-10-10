export type CMSPageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface CMSPage {
  id: string;
  title: string;
  slug: string;
  status: CMSPageStatus;
  template?: string;
  seo_metadata?: Record<string, any>;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CMSPageBlock {
  id: string;
  page_id: string;
  section_type: string;
  content_json: Record<string, any>;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CMSSection {
  id: string;
  name: string;
  type: string;
  content: Record<string, any>;
  is_global: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CMSNavigation {
  id: string;
  name: string;
  location: string;
  items: Array<{
    label: string;
    url: string;
    target?: string;
    children?: any[];
  }>;
  created_at: Date;
  updated_at: Date;
}

export interface CMSMediaItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
  alt_text?: string | null;
  folder_path?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at?: string;
}

