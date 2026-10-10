import React from "react";
import Link from "next/link";
import Image from "next/image";

interface CategoryCardsProps {
  // This would receive data from homepage_featured_categories
  categories?: any[];
}

export function CategoryCards({ categories = [] }: CategoryCardsProps) {
  const displayCategories =
    categories.length > 0
      ? categories
      : [
          {
            id: "1",
            name: "Women",
            url: "/women",
            image: "https://placehold.co/600x800/eaeaea/black?text=Women",
          },
          {
            id: "2",
            name: "Men",
            url: "/men",
            image: "https://placehold.co/600x800/eaeaea/black?text=Men",
          },
          {
            id: "3",
            name: "Kids",
            url: "/kids",
            image: "https://placehold.co/600x800/eaeaea/black?text=Kids",
          },
        ];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {displayCategories.map((category) => (
          <Link
            key={category.id}
            href={category.url}
            className="group relative block aspect-[3/4] w-full overflow-hidden bg-gray-100"
          >
            <Image
              src={category.image}
              alt={category.name}
              fill
              className="absolute inset-0 object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center p-8">
              <h3 className="mb-4 transform text-3xl font-bold uppercase tracking-widest text-white transition-transform duration-500 group-hover:-translate-y-2">
                {category.name}
              </h3>
              <span className="inline-block translate-y-4 transform border-b-2 border-white pb-1 text-sm font-medium uppercase tracking-widest text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                Discover
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
