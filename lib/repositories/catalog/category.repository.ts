import { prisma } from "@/lib/prisma";
import {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/types/catalog.types";

function toCategory(c: any): Category {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    image_url: c.imageUrl ?? null,
    imageUrl: c.imageUrl ?? null,
    parent_id: c.parentId ?? null,
    parentId: c.parentId ?? null,
    icon_url: c.imageUrl ?? null,
    display_order: c.displayOrder ?? 0,
    is_active: c.isActive ?? true,
    created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    updated_at: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
    parent: c.parent ? { id: c.parent.id, name: c.parent.name } : null,
  };
}

export class CategoryRepository {
  /**
   * Retrieves all categories from Neon PostgreSQL via Prisma.
   */
  static async getCategories(activeOnly: boolean = true): Promise<Category[]> {
    try {
      const records = await prisma.category.findMany({
        where: activeOnly ? { isActive: true } : undefined,
        orderBy: { displayOrder: "asc" },
        include: {
          parent: {
            select: { id: true, name: true },
          },
        },
      });

      return records.map(toCategory);
    } catch (err) {
      console.error("Error fetching categories via Prisma:", err);
      return [];
    }
  }

  /**
   * Creates a new category in Neon PostgreSQL via Prisma.
   */
  static async createCategory(input: CreateCategoryInput): Promise<Category> {
    const imageUrl = input.image_url || (input as any).icon_url || null;
    const created = await prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        imageUrl,
        parentId: input.parent_id,
        displayOrder: input.display_order ?? 0,
        isActive: input.is_active ?? true,
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
      },
    });

    return toCategory(created);
  }

  /**
   * Updates an existing category by ID in Neon PostgreSQL via Prisma.
   */
  static async updateCategory(
    id: string,
    input: UpdateCategoryInput
  ): Promise<Category> {
    const rawImage = input.image_url !== undefined ? input.image_url : (input as any).icon_url;
    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.description !== undefined && { description: input.description }),
        ...(rawImage !== undefined && { imageUrl: rawImage }),
        ...(input.parent_id !== undefined && { parentId: input.parent_id }),
        ...(input.display_order !== undefined && { displayOrder: input.display_order }),
        ...(input.is_active !== undefined && { isActive: input.is_active }),
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
      },
    });

    return toCategory(updated);
  }

  /**
   * Soft-deletes a category by setting isActive=false in Neon PostgreSQL.
   */
  static async deleteCategory(id: string): Promise<void> {
    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Retrieves a category by ID from Neon PostgreSQL via Prisma.
   */
  static async getCategoryById(id: string): Promise<Category | null> {
    try {
      const record = await prisma.category.findUnique({
        where: { id },
        include: {
          parent: {
            select: { id: true, name: true },
          },
        },
      });

      if (!record) return null;
      return toCategory(record);
    } catch (err) {
      console.error("Error fetching category by ID:", err);
      return null;
    }
  }
}
