export interface SEOMetadata {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_card: string;
  noindex: boolean;
  json_ld: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}
