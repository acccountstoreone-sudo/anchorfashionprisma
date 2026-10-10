import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  Tag,
  Layers,
  Plus,
  ArrowRight,
  Grid3X3,
} from "lucide-react";
import Link from "next/link";
import { ProductRepository } from "@/lib/repositories/catalog/product.repository";
import { CategoryRepository } from "@/lib/repositories/catalog/category.repository";
import { BrandRepository } from "@/lib/repositories/catalog/brand.repository";
import { CollectionRepository } from "@/lib/repositories/catalog/collection.repository";

export const metadata = {
  title: "Catalog | Admin Dashboard | Anchor Fashion Enterprise",
};

export default async function CatalogDashboardPage() {
  // Fetch real counts from the database in parallel
  const [productsResult, categories, brands, collections] = await Promise.all([
    ProductRepository.getProducts({ page: 1, limit: 1 }),
    CategoryRepository.getCategories(false),
    BrandRepository.getBrands(false),
    CollectionRepository.getCollections(false),
  ]);

  const totalProducts = productsResult.total;
  const activeCategories = categories.filter((c) => c.is_active).length;
  const activeBrands = brands.filter((b) => b.is_active).length;
  const activeCollections = collections.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Catalog Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your products, categories, brands, and collections.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/products/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Real stats from DB */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Products</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProducts.toLocaleString()}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Total in catalog
            </p>
            <Link
              href="/admin/products"
              className="mt-4 flex items-center text-sm text-blue-600 hover:underline"
            >
              Manage Products <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Categories</CardTitle>
            <Layers className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCategories}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Active of {categories.length} total
            </p>
            <Link
              href="/admin/catalog/categories"
              className="mt-4 flex items-center text-sm text-blue-600 hover:underline"
            >
              Manage Categories <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Brands */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Brands</CardTitle>
            <Tag className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeBrands}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Active of {brands.length} total
            </p>
            <Link
              href="/admin/catalog/brands"
              className="mt-4 flex items-center text-sm text-blue-600 hover:underline"
            >
              Manage Brands <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Collections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Collections</CardTitle>
            <Grid3X3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCollections}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Active of {collections.length} total
            </p>
            <Link
              href="/admin/products/collections"
              className="mt-4 flex items-center text-sm text-blue-600 hover:underline"
            >
              Manage Collections <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common catalog management tasks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/admin/products/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" /> Add New Product
                </Button>
              </Link>
              <Link href="/admin/catalog/categories" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Layers className="mr-2 h-4 w-4" /> Manage Categories
                </Button>
              </Link>
              <Link href="/admin/catalog/brands" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Tag className="mr-2 h-4 w-4" /> Manage Brands
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalog Overview</CardTitle>
            <CardDescription>Status of your catalog entities.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Products
                </span>
                <span className="font-semibold">
                  {totalProducts.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Active Categories
                </span>
                <span className="font-semibold">{activeCategories}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Inactive Categories
                </span>
                <span className="font-semibold text-amber-600">
                  {categories.length - activeCategories}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Active Brands
                </span>
                <span className="font-semibold">{activeBrands}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Active Collections
                </span>
                <span className="font-semibold">{activeCollections}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
