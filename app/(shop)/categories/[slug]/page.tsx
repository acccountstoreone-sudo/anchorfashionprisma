import { Suspense } from "react";
import Link from "next/link";
import {
  getCategoryBySlug,
  getCategories,
  getBrands,
  getProducts,
} from "@/features/commerce/actions/categories";
import { ProductCard } from "@/components/product/product-card";
import { ProductFilters } from "@/components/product/product-filters";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateMetadata as getSEOMetadata } from "@/features/commerce/utils/seo";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  const name = category?.name || slug.charAt(0).toUpperCase() + slug.slice(1);

  return getSEOMetadata({
    title: `${name} | Anchor Fashion`,
    description: `Shop the latest ${name} collection at Anchor Fashion. Curated premium fashion apparel.`,
    url: `/categories/${slug}`,
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const sParams = await searchParams;
  const sortBy = typeof sParams?.sort === "string" ? sParams.sort : "featured";

  const category = await getCategoryBySlug(slug);
  const displayName = category?.name || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  // Fetch data in parallel
  const [products, categories, brands] = await Promise.all([
    getProducts({
      categoryId: category?.id,
      categorySlug: slug,
      sortBy: sortBy,
      limit: 24,
    }),
    getCategories(),
    getBrands(),
  ]);

  const sortLabels: Record<string, string> = {
    featured: "Featured",
    newest: "Newest Arrivals",
    price_asc: "Price: Low to High",
    price_desc: "Price: High to Low",
    rating: "Top Rated",
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Breadcrumb Bar */}
      <div className="border-b border-gray-200/60 bg-white">
        <div className="container mx-auto px-4 py-3 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/" className="transition hover:text-black">
              Home
            </Link>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <Link href="/categories" className="transition hover:text-black">
              Categories
            </Link>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <span className="font-semibold text-gray-900">{displayName}</span>
          </nav>
        </div>
      </div>

      {/* Luxury Editorial Category Banner */}
      <div className="relative border-b border-gray-200/80 bg-[#0D1B2A] text-white py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(201,168,106,0.15),transparent_70%)] pointer-events-none" />
        <div className="container relative mx-auto px-4 text-center max-w-3xl md:px-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A86A]/30 bg-[#C9A86A]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#EAD098] mb-4">
            <Sparkles className="h-3 w-3" />
            <span>Anchor Collection</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight sm:text-4xl md:text-5xl lg:text-6xl text-white">
            {displayName}
          </h1>
          <p className="mt-4 text-sm md:text-base text-gray-300 font-light leading-relaxed max-w-xl mx-auto">
            Discover curated {displayName.toLowerCase()} designed with precision tailoring, superior comfort, and modern elegance.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 pt-8 md:px-6 md:pt-10">
        {/* Controls Bar: Count & Filter / Sort Buttons */}
        <div className="mb-8 flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">
              Showing <span className="text-black font-bold">{products.length}</span> luxury pieces
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Filter Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-gray-300 text-xs font-semibold uppercase tracking-wider md:hidden"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[300px] overflow-y-auto pt-10 sm:w-[380px]"
              >
                <ProductFilters categories={categories} brands={brands} />
              </SheetContent>
            </Sheet>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-gray-300 bg-white text-xs font-semibold uppercase tracking-wider text-gray-800 hover:border-black"
                >
                  <span>Sort: {sortLabels[sortBy] || "Featured"}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[210px] bg-white border border-gray-200 shadow-lg">
                <DropdownMenuItem asChild>
                  <Link href={`/categories/${slug}`} className="cursor-pointer text-xs font-medium">
                    Featured
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/categories/${slug}?sort=newest`} className="cursor-pointer text-xs font-medium">
                    Newest Arrivals
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/categories/${slug}?sort=price_asc`} className="cursor-pointer text-xs font-medium">
                    Price: Low to High
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/categories/${slug}?sort=price_desc`} className="cursor-pointer text-xs font-medium">
                    Price: High to Low
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/categories/${slug}?sort=rating`} className="cursor-pointer text-xs font-medium">
                    Top Rated
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 2-Column Catalog Grid (Sidebar + Products) */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden min-h-[500px] border-r border-gray-200/80 pr-6 md:col-span-1 md:block">
            <Suspense
              fallback={
                <div className="space-y-4">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-32 animate-pulse rounded bg-gray-200"></div>
                </div>
              }
            >
              <ProductFilters categories={categories} brands={brands} />
            </Suspense>
          </aside>

          {/* Product Cards Grid */}
          <div className="md:col-span-3 lg:col-span-4">
            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 px-4 text-center">
                <h3 className="mb-2 text-xl font-medium text-gray-900">No products found</h3>
                <p className="max-w-md text-sm text-gray-500 mb-6">
                  We currently do not have items in this exact collection. Explore our full apparel line instead.
                </p>
                <Button asChild className="bg-[#0D1B2A] hover:bg-black text-white text-xs font-semibold uppercase tracking-widest px-6">
                  <Link href="/products">Browse All Apparel</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
