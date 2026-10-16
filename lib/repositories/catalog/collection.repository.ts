import { prisma } from "@/lib/prisma";
import {
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
} from "@/types/catalog.types";
import { randomUUID } from "crypto";

const SETTINGS_KEY = "catalog_collections";

export class CollectionRepository {
  private static async getRawCollections(): Promise<Collection[]> {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: SETTINGS_KEY },
      });
      if (setting && Array.isArray(setting.value)) {
        return setting.value as Collection[];
      }
      return [];
    } catch {
      return [];
    }
  }

  private static async saveCollections(collections: Collection[]): Promise<void> {
    await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: {
        value: collections as any,
        updatedAt: new Date(),
      },
      create: {
        key: SETTINGS_KEY,
        value: collections as any,
        category: "catalog",
        description: "Curated product collections",
      },
    });
  }

  static async getCollections(
    activeOnly: boolean = true
  ): Promise<Collection[]> {
    const collections = await this.getRawCollections();
    if (activeOnly) {
      return collections.filter((c) => c.is_active !== false);
    }
    return collections;
  }

  static async getCollectionBySlug(
    slug: string,
    activeOnly: boolean = true
  ): Promise<{ collection: Collection | null; products: any[] }> {
    const collections = await this.getRawCollections();
    const collection =
      collections.find(
        (c) => c.slug === slug && (!activeOnly || c.is_active !== false)
      ) || null;

    if (!collection) {
      return { collection: null, products: [] };
    }

    let products: any[] = [];
    if (collection.product_ids && collection.product_ids.length > 0) {
      products = await prisma.product.findMany({
        where: {
          id: { in: collection.product_ids },
          deletedAt: null,
          ...(activeOnly ? { status: "ACTIVE" } : {}),
        },
        include: {
          variants: true,
          media: true,
          category: true,
        },
      });
    }

    return { collection, products };
  }

  static async createCollection(
    input: CreateCollectionInput
  ): Promise<Collection> {
    const collections = await this.getRawCollections();
    const newCollection: Collection = {
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      image_url: input.image_url || null,
      is_active: input.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product_count: input.product_ids?.length ?? 0,
      product_ids: input.product_ids ?? [],
    } as Collection;

    collections.unshift(newCollection);
    await this.saveCollections(collections);
    return newCollection;
  }

  static async updateCollection(
    id: string,
    input: UpdateCollectionInput
  ): Promise<Collection> {
    const collections = await this.getRawCollections();
    const index = collections.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Collection with ID "${id}" not found.`);
    }

    const current = collections[index];
    const updated: Collection = {
      ...current,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.image_url !== undefined && { image_url: input.image_url }),
      ...(input.is_active !== undefined && { is_active: input.is_active }),
      ...(input.product_ids !== undefined && {
        product_ids: input.product_ids,
        product_count: input.product_ids.length,
      }),
      updated_at: new Date().toISOString(),
    };

    collections[index] = updated;
    await this.saveCollections(collections);
    return updated;
  }

  static async deleteCollection(id: string): Promise<void> {
    const collections = await this.getRawCollections();
    const filtered = collections.filter((c) => c.id !== id);
    await this.saveCollections(filtered);
  }
}
