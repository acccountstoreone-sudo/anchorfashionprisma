import { CatalogRepository } from "@/repositories/catalog.repository";
import { BrandedCollection } from "@/components/home/branded-collection";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Premium Brands | Anchor Fashion",
  description: "Shop from our exclusive collection of premium brands.",
};

export default async function BrandsPage() {
  const products = await CatalogRepository.getProducts({ limit: 8 });
  
  return (
    <div className="flex flex-col min-h-screen pt-10">
      <div className="container mx-auto px-4 md:px-6 mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Our Brands</h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Discover exclusive collections from world-renowned fashion houses and our own signature labels.
        </p>
      </div>
      <BrandedCollection products={products.data || []} />
    </div>
  );
}
