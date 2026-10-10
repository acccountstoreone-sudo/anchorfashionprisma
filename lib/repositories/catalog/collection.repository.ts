import {
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
} from "@/types/catalog.types";

export class CollectionRepository {
  static async getCollections(
    activeOnly: boolean = true
  ): Promise<Collection[]> {
    return [];
  }

  static async getCollectionBySlug(
    slug: string,
    activeOnly: boolean = true
  ): Promise<{ collection: Collection | null; products: any[] }> {
    return { collection: null, products: [] };
  }

  static async createCollection(
    input: CreateCollectionInput
  ): Promise<Collection> {
    return {
      id: "dummy-id",
      name: input.name,
      slug: input.slug,
      description: input.description,
      image_url: input.image_url,
      is_active: input.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product_count: input.product_ids?.length ?? 0,
      product_ids: input.product_ids ?? [],
    } as Collection;
  }

  static async updateCollection(
    id: string,
    input: UpdateCollectionInput
  ): Promise<Collection> {
    return {
      id,
      name: input.name || "Updated Collection",
      slug: input.slug || "updated-collection",
      description: input.description,
      image_url: input.image_url,
      is_active: input.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product_count: input.product_ids?.length ?? 0,
      product_ids: input.product_ids ?? [],
    } as Collection;
  }

  static async deleteCollection(id: string): Promise<void> {
    // do nothing
  }
}
