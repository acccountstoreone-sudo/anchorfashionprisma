import { ProductCard } from "@/components/product/product-card";
import { jost } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface PersonalizedSectionProps {
  title: string;
  subtitle?: string;
  products: any[];
  className?: string;
  viewAllLink?: string;
}

export function PersonalizedSection({ title, subtitle, products, className, viewAllLink }: PersonalizedSectionProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className={cn("py-20", className)}>
      <div className="container px-4 md:px-6">
        <div className="mb-12 flex flex-col items-center justify-between gap-4 md:flex-row md:items-end">
          <div className="text-center md:text-left">
            <h2 className={`${jost.className} text-3xl font-light tracking-tight text-[#1A1A1A]`}>
              {title}
            </h2>
            {subtitle && <p className="mt-2 text-sm text-gray-500 uppercase tracking-widest">{subtitle}</p>}
          </div>
          {viewAllLink && (
            <Link
              href={viewAllLink}
              className="group flex items-center text-sm font-medium text-gray-900 transition-colors hover:text-primary"
            >
              View All Products
              <ArrowRight
                className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-4 md:gap-x-8">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
