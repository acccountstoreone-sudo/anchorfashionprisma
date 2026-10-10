export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  icon_url?: string;
  children?: Category[];
}
