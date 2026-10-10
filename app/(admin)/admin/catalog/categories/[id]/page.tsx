import { CategoryRepository } from "@/lib/repositories/catalog/category.repository";
import { ProductRepository } from "@/lib/repositories/catalog/product.repository";
import { notFound } from "next/navigation";
import { CategoryDetailsClientPage } from "@/features/admin/components/catalog/CategoryDetailsClientPage";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const metadata = {
  title: "Category Details | Catalog | Anchor Fashion Enterprise",
};

export default async function CategoryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Fetch category
  const category = await CategoryRepository.getCategoryById(id);
  if (!category) return notFound();

  // Fetch all products that belong to this category (either via categoryId or productCategories)
  const categoryProducts = await prisma.product.findMany({
    where: {
      OR: [
        { categoryId: id },
        { productCategories: { some: { categoryId: id } } }
      ]
    },
    select: {
      id: true,
      name: true,
      sku: true,
      basePrice: true,
      salePrice: true,
      costPrice: true,
      imageUrl: true,
    }
  });

  // Fetch ALL products for the Add Product modal
  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      imageUrl: true,
    }
  });

  // Serialize Prisma Decimal objects to plain numbers
  const serializedCategoryProducts = categoryProducts.map(p => ({
    ...p,
    basePrice: p.basePrice ? Number(p.basePrice) : 0,
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    costPrice: p.costPrice ? Number(p.costPrice) : null,
  }));

  return (
    <CategoryDetailsClientPage 
      category={category} 
      categoryProducts={serializedCategoryProducts} 
      allProducts={allProducts} 
    />
  );
}
