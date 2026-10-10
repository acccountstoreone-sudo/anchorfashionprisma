import React from "react";
import Link from "next/link";
import Image from "next/image";

interface ProductGridProps {
  title: string;
  // This would typically receive an array of rich product objects from the CMS
  // For the blueprint foundation, we type it loosely or use placeholder data
  products?: any[];
}

export function ProductGrid({ title, products = [] }: ProductGridProps) {
  // Fallback placeholder data if none provided
  const displayProducts =
    products.length > 0
      ? products
      : [
          {
            id: "1",
            name: "Premium Oxford Shirt",
            price: "৳3,500",
            image: "https://placehold.co/400x500/eaeaea/black?text=Product+1",
          },
          {
            id: "2",
            name: "Slim Fit Chinos",
            price: "৳2,800",
            image: "https://placehold.co/400x500/eaeaea/black?text=Product+2",
          },
          {
            id: "3",
            name: "Classic Leather Belt",
            price: "৳1,500",
            image: "https://placehold.co/400x500/eaeaea/black?text=Product+3",
          },
          {
            id: "4",
            name: "Silk Blend Tie",
            price: "৳1,200",
            image: "https://placehold.co/400x500/eaeaea/black?text=Product+4",
          },
        ];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16">
      <div className="mb-10 flex items-end justify-between border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold uppercase tracking-tight text-black md:text-3xl">
          {title}
        </h2>
        <Link
          href="/products"
          className="hidden text-sm font-medium hover:underline sm:block"
        >
          View All Products
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
        {displayProducts.map((product) => (
          <div key={product.id} className="group relative flex flex-col">
            <div className="relative mb-4 aspect-[4/5] overflow-hidden bg-gray-100">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              {/* Quick Add overlay */}
              <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/50 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <button className="w-full bg-white py-3 text-sm font-medium uppercase tracking-wider text-black shadow-sm hover:bg-gray-100">
                  Quick Add
                </button>
              </div>
            </div>
            <div className="flex flex-1 flex-col">
              <h3 className="truncate text-sm font-medium uppercase tracking-wide text-gray-700">
                <Link href={`/product/${product.id}`}>
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                  />
                  {product.name}
                </Link>
              </h3>
              <p className="mt-1 text-sm font-semibold text-black">
                {product.price}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center sm:hidden">
        <Link
          href="/products"
          className="inline-block border border-black px-8 py-3 text-sm font-medium uppercase tracking-widest transition-colors hover:bg-black hover:text-white"
        >
          Explore Collection
        </Link>
      </div>
    </section>
  );
}
