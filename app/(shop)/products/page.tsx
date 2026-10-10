import { Suspense } from "react";
import { ProductListParams } from "@/repositories/catalog.repository";
import { CatalogService } from "@/lib/services/catalog.service";
import { ProductFilters } from "@/components/product/product-filters";
import { InfiniteScrollGrid } from "@/components/product/infinite-scroll-grid";
import { ProductSearchBar } from "@/components/product/product-search-bar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { jost } from "@/lib/fonts";
import {
  SlidersHorizontal,
  ChevronDown,
  Search,
  ChevronRight,
  X,
  RotateCcw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export const metadata = {
  title: "All Products",
  description: "Browse our entire collection of premium apparel.",
};

export const revalidate = 60;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const category =
    typeof params.category === "string" ? params.category : undefined;
  const brand =
    typeof params.brand === "string" ? params.brand : undefined;
  const search = typeof params.q === "string" ? params.q.trim() : undefined;
  const sort = typeof params.sort === "string" ? params.sort : undefined;
  const minPrice =
    typeof params.minPrice === "string" && !isNaN(Number(params.minPrice))
      ? Number(params.minPrice)
      : undefined;
  const maxPrice =
    typeof params.maxPrice === "string" && !isNaN(Number(params.maxPrice))
      ? Number(params.maxPrice)
      : undefined;

  let sortBy: ProductListParams["sortBy"] = "newest";
  if (sort === "price_asc" || sort === "price_desc" || sort === "rating") {
    sortBy = sort;
  }

  // Build type-safe parameters for URL preservation
  const safeParams: Record<string, string> = {};
  if (category) safeParams.category = category;
  if (brand) safeParams.brand = brand;
  if (search) safeParams.q = search;
  if (sort) safeParams.sort = sort;
  if (minPrice !== undefined) safeParams.minPrice = String(minPrice);
  if (maxPrice !== undefined) safeParams.maxPrice = String(maxPrice);

  // Fetch catalog data in parallel
  const [{ data: products, count }, rawCategories, rawBrands] =
    await Promise.all([
      CatalogService.getProducts({
        category,
        brand,
        minPrice,
        maxPrice,
        search,
        sortBy,
        limit: 50,
      }),
      CatalogService.getCategories(),
      CatalogService.getBrands(),
    ]);

  // Clean real categories and brands (remove placeholder/QA records)
  const filteredCategories: any[] = ((rawCategories as any[]) || []).filter(
    (c: any) =>
      c.slug !== "jhkjhkj" &&
      !c.slug?.startsWith("qa-") &&
      !c.slug?.startsWith("test-dummy")
  );
  const categories: any[] =
    filteredCategories.length > 0
      ? filteredCategories
      : (rawCategories as any[] ?? []);

  const filteredBrands: any[] = ((rawBrands as any[]) || []).filter(
    (b: any) => b.slug !== "jhkjhkj" && !b.slug?.startsWith("qa-")
  );
  const brands: any[] =
    filteredBrands.length > 0 ? filteredBrands : (rawBrands as any[] ?? []);

  const currentCategoryObj = categories.find((c: any) => c.slug === category);
  const currentBrandObj = brands.find((b: any) => b.slug === brand);

  const activeFilterCount = [
    category,
    brand,
    minPrice !== undefined || maxPrice !== undefined,
    search,
  ].filter(Boolean).length;

  const pageTitle = search
    ? `Search: "${search}"`
    : currentCategoryObj?.name || "All Products";

  const sortLabel =
    sort === "price_asc"
      ? "Price: Low to High"
      : sort === "price_desc"
        ? "Price: High to Low"
        : sort === "rating"
          ? "Top Rated"
          : "Newest Arrivals";

  return (
    <div className={`${jost.className} container mx-auto px-4 py-6 md:py-8`}>
      {/* 1. Sleek Real-World Breadcrumb Bar */}
      <nav
        aria-label="Breadcrumb"
        className="mb-3 flex items-center gap-1.5 text-xs text-gray-500"
      >
        <Link href="/" className="hover:text-black transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3 w-3 text-gray-400" />
        <Link
          href="/products"
          className={
            category || search
              ? "hover:text-black transition-colors"
              : "font-semibold text-black"
          }
        >
          Shop
        </Link>
        {category && (
          <>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <span className="font-semibold text-black capitalize">
              {currentCategoryObj?.name || category}
            </span>
          </>
        )}
        {search && (
          <>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <span className="font-semibold text-black">
              &ldquo;{search}&rdquo;
            </span>
          </>
        )}
      </nav>

      {/* 2. Top Catalog Action Bar: Title + Search + Sort + Mobile Filters */}
      <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center md:justify-between">
        {/* Title & Product Count */}
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 capitalize">
            {pageTitle}
          </h1>
          <span className="text-xs font-medium text-gray-400">
            ({count ?? products.length} {products.length === 1 ? "item" : "items"})
          </span>
        </div>

        {/* Action Controls: Search + Sort + Mobile Filter */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Integrated Search Box */}
          <div className="w-full sm:w-64 md:w-72">
            <ProductSearchBar
              defaultValue={search ?? ""}
              placeholder="Search products…"
            />
          </div>

          {/* Mobile Filter Sheet Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="relative inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 transition-colors hover:border-black hover:bg-gray-50 md:hidden shrink-0"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C9A86A] px-1 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-[85vh] overflow-y-auto rounded-t-2xl p-0"
            >
              <SheetHeader className="sticky top-0 z-10 border-b border-gray-100 bg-white px-5 py-4">
                <SheetTitle className="text-sm font-bold uppercase tracking-wider text-left">
                  Filter Products
                </SheetTitle>
              </SheetHeader>
              <div className="p-5">
                <ProductFilters
                  categories={categories}
                  brands={brands}
                  productCount={products.length}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-9 sm:h-10 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 transition-colors hover:border-black outline-none shrink-0">
              <span className="hidden sm:inline text-gray-400 font-normal">
                Sort:
              </span>
              <span className="truncate max-w-[110px] sm:max-w-none">
                {sortLabel}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              {(
                [
                  { label: "Newest Arrivals", value: "newest" },
                  { label: "Price: Low to High", value: "price_asc" },
                  { label: "Price: High to Low", value: "price_desc" },
                  { label: "Top Rated", value: "rating" },
                ] as const
              ).map(({ label, value }) => {
                const isActive =
                  sort === value || (!sort && value === "newest");
                return (
                  <DropdownMenuItem key={value} asChild>
                    <Link
                      href={`/products?${new URLSearchParams({
                        ...safeParams,
                        sort: value,
                      }).toString()}`}
                      className={`flex w-full items-center justify-between text-xs py-2 ${
                        isActive
                          ? "font-bold text-[#C9A86A]"
                          : "text-gray-700"
                      }`}
                    >
                      <span>{label}</span>
                      {isActive && <span className="text-[#C9A86A]">✓</span>}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 3. Category Horizontal Quick Pills */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Link
          href={`/products?${new URLSearchParams({
            ...safeParams,
            category: "",
          }).toString()}`}
          className={`shrink-0 rounded-full border px-3.5 py-1 text-xs font-medium transition-all ${
            !category
              ? "bg-black text-white border-black shadow-sm"
              : "border-gray-200 text-gray-600 hover:border-black hover:text-black bg-white"
          }`}
        >
          All
        </Link>
        {categories.slice(0, 10).map((cat: any) => {
          const isSelected = category === cat.slug;
          return (
            <Link
              key={cat.slug}
              href={`/products?${new URLSearchParams({
                ...safeParams,
                category: cat.slug,
              }).toString()}`}
              className={`shrink-0 rounded-full border px-3.5 py-1 text-xs font-medium capitalize transition-all ${
                isSelected
                  ? "bg-black text-white border-black shadow-sm"
                  : "border-gray-200 text-gray-600 hover:border-black hover:text-black bg-white"
              }`}
            >
              {cat.name}
            </Link>
          );
        })}
      </div>

      {/* 4. Active Filter Tags Bar (Real-world dismissible tags) */}
      {activeFilterCount > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl bg-gray-50/80 p-3 border border-gray-100">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">
            Active:
          </span>

          {search && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 shadow-sm">
              <span>Search: &ldquo;{search}&rdquo;</span>
              <Link
                href={`/products?${new URLSearchParams({
                  ...safeParams,
                  q: "",
                }).toString()}`}
                className="hover:text-red-600"
                aria-label="Remove search"
              >
                <X className="h-3 w-3" />
              </Link>
            </span>
          )}

          {category && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 shadow-sm">
              <span className="capitalize">
                Category: {currentCategoryObj?.name || category}
              </span>
              <Link
                href={`/products?${new URLSearchParams({
                  ...safeParams,
                  category: "",
                }).toString()}`}
                className="hover:text-red-600"
                aria-label="Remove category"
              >
                <X className="h-3 w-3" />
              </Link>
            </span>
          )}

          {brand && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 shadow-sm">
              <span>Brand: {currentBrandObj?.name || brand}</span>
              <Link
                href={`/products?${new URLSearchParams({
                  ...safeParams,
                  brand: "",
                }).toString()}`}
                className="hover:text-red-600"
                aria-label="Remove brand"
              >
                <X className="h-3 w-3" />
              </Link>
            </span>
          )}

          {(minPrice !== undefined || maxPrice !== undefined) && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 shadow-sm">
              <span>
                Price: ৳{minPrice ?? 0} – {maxPrice ? `৳${maxPrice}` : "above"}
              </span>
              <Link
                href={`/products?${new URLSearchParams({
                  ...safeParams,
                  minPrice: "",
                  maxPrice: "",
                }).toString()}`}
                className="hover:text-red-600"
                aria-label="Remove price filter"
              >
                <X className="h-3 w-3" />
              </Link>
            </span>
          )}

          <Link
            href="/products"
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#C9A86A] hover:text-black transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Clear all
          </Link>
        </div>
      )}

      {/* 5. Main Catalog Layout: Sticky Sidebar + Product Grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
        {/* Desktop Sidebar — sticky */}
        <aside className="hidden md:col-span-1 md:block">
          <div className="sticky top-24 pr-4">
            <Suspense
              fallback={
                <div className="space-y-4">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="h-32 animate-pulse rounded bg-gray-100" />
                  <div className="h-24 animate-pulse rounded bg-gray-100" />
                </div>
              }
            >
              <ProductFilters
                categories={categories}
                brands={brands}
                productCount={products.length}
              />
            </Suspense>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="md:col-span-3 lg:col-span-4">
          {products.length > 0 ? (
            <InfiniteScrollGrid products={products} initialCount={12} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center px-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mb-1 text-base font-semibold text-gray-900">
                No products found
              </h3>
              <p className="mb-6 max-w-sm text-xs text-gray-500 leading-relaxed">
                We couldn&apos;t find any items matching your active search or
                filters. Try adjusting your filters or search terms.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#C9A86A]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset All Filters
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
