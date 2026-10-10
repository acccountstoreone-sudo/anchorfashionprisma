import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ArrowLeft, PackageOpen } from "lucide-react";
import { jost } from "@/lib/fonts";
import { getCachedCollectionBySlug } from "@/lib/cache/catalog-cache";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { collection } = await getCachedCollectionBySlug(slug);

  if (!collection) {
    return { title: "Collection Not Found | Anchor Fashion" };
  }

  return {
    title: `${collection.name} | Collections | Anchor Fashion`,
    description: `Explore the ${collection.name} curated collection at Anchor Fashion Enterprise.`,
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { collection, products } = await getCachedCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* Breadcrumb Navigation */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-3 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link
              href="/collections"
              className="hover:text-foreground transition-colors"
            >
              Collections
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">{collection.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="container mx-auto px-4 pt-6 md:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-neutral-900 text-white min-h-[260px] md:min-h-[340px] flex items-center shadow-lg">
          {collection.banner_url ? (
            <>
              <img
                src={collection.banner_url}
                alt={collection.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950" />
          )}

          <div className="relative z-10 max-w-2xl p-8 md:p-14">
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A86A] mb-3">
              Curated Collection
            </span>
            <h1
              className={`${jost.className} text-3xl font-light tracking-tight text-white sm:text-5xl md:text-6xl mb-4`}
            >
              {collection.name}
            </h1>
            <p className="text-sm font-light text-neutral-300 md:text-base max-w-lg">
              Explore hand-selected pieces crafted for modern sophistication and everyday elegance.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-xs font-medium text-white">
                {products.length} {products.length === 1 ? "Product" : "Products"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="container mx-auto px-4 pt-10 md:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className={`${jost.className} text-2xl font-medium text-neutral-900 md:text-3xl`}>
              Collection Items
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Showing {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          </div>
          <Link
            href="/collections"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Collections</span>
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-xs">
            <PackageOpen className="mx-auto h-12 w-12 text-neutral-400 mb-3" />
            <h3 className={`${jost.className} text-xl font-medium text-neutral-800`}>
              New arrivals coming soon
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              We are currently adding curated pieces to the {collection.name} collection. Check back shortly or explore our full store catalog.
            </p>
            <div className="mt-6">
              <Button asChild className="rounded-full px-6">
                <Link href="/products">Explore All Products</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
