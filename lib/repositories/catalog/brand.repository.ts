import { prisma } from "@/lib/prisma";
import { Brand, CreateBrandInput, UpdateBrandInput } from "@/types/catalog.types";

function toBrand(b: any): Brand {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    logo_url: b.logoUrl ?? null,
    is_active: b.isActive ?? true,
    created_at: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
    updated_at: b.updatedAt ? new Date(b.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export class BrandRepository {
  /**
   * Retrieves all brands with optional active-only filter via Prisma.
   */
  static async getBrands(activeOnly: boolean = true): Promise<Brand[]> {
    try {
      const records = await prisma.brand.findMany({
        where: activeOnly ? { isActive: true } : undefined,
        orderBy: { name: "asc" },
      });
      return records.map(toBrand);
    } catch (err) {
      console.error("Error fetching brands via Prisma:", err);
      return [];
    }
  }

  /**
   * Creates a new brand via Prisma.
   */
  static async createBrand(input: CreateBrandInput): Promise<Brand> {
    const created = await prisma.brand.create({
      data: {
        name: input.name,
        slug: input.slug,
        logoUrl: input.logo_url,
        description: input.description,
        isActive: input.is_active ?? true,
      },
    });
    return toBrand(created);
  }

  /**
   * Updates an existing brand by ID via Prisma.
   */
  static async updateBrand(id: string, input: UpdateBrandInput): Promise<Brand> {
    const updated = await prisma.brand.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.logo_url !== undefined && { logoUrl: input.logo_url }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.is_active !== undefined && { isActive: input.is_active }),
      },
    });
    return toBrand(updated);
  }

  /**
   * Soft-deletes a brand by setting is_active=false via Prisma.
   */
  static async deleteBrand(id: string): Promise<void> {
    await prisma.brand.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
