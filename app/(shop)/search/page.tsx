import { Suspense } from "react";
import { CatalogRepository } from "@/repositories/catalog.repository";
import { ProductCard } from "@/components/product/product-card";
import { ProductSearchBar } from "@/components/product/product-search-bar";
import { Search, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { jost } from "@/lib/fonts";

export const metadata = {
  title: "Search Products",
  description: "Search luxury apparel, fashion edits and accessories at Anchor Fashion.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim() : "";

  // Only fetch if there is a query
  let products: any[] = [];
  let count = 0;
  if (query) {
    const res = await CatalogRepository.getProducts({
      search: query,
      limit: 40,
    });
    products = res.data || [];
    count = res.count || products.length;
  }

  return (
    <div className={`${jost.className} container mx-auto px-4 py-8 md:py-14 min-h-[75vh]`}>
      {/* Search Header */}
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C9A86A]">
          Search Catalog
        </span>
        <h1 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-light tracking-tight text-gray-900">
          {query ? (
            <>
              Results for &ldquo;<span className="font-medium text-black">{query}</span>&rdquo;
            </>
          ) : (
            "Explore Our Collection"
          )}
        </h1>
        {query && (
          <p className="mt-2 text-xs text-gray-500">
            Found {count} {count === 1 ? "matching piece" : "matching pieces"}
          </p>
        )}

        {/* Live Search Input */}
        <div className="mt-6 mx-auto max-w-lg">
          <ProductSearchBar
            defaultValue={query}
            placeholder="Search dresses, shirts, accessories…"
          />
        </div>
      </div>

      {!query ? (
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 px-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <Search className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h2 className="mb-1 text-lg font-medium text-gray-900">
            What are you looking for?
          </h2>
          <p className="mb-6 text-xs text-gray-500 leading-relaxed">
            Enter a search term above to find signature apparel, seasonal edits, or specific styles.
          </p>
          <Button asChild className="rounded-full bg-black px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#C9A86A]">
            <Link href="/products" className="inline-flex items-center gap-2">
              Browse All Products
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 px-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <Search className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h2 className="mb-1 text-lg font-medium text-gray-900">No results found</h2>
          <p className="mb-6 text-xs text-gray-500 leading-relaxed">
            We couldn&apos;t find anything matching &ldquo;{query}&rdquo;. Try checking for typos or searching with broader keywords.
          </p>
          <Button asChild variant="outline" className="rounded-full border-black px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-black transition-colors hover:bg-black hover:text-white">
            <Link href="/products" className="inline-flex items-center gap-2">
              <RotateCcw className="h-3.5 w-3.5" />
              Explore All Products
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
