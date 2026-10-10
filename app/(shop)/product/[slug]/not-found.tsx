import Link from "next/link";
import { ArrowLeft, Sparkles, Compass, ShoppingBag } from "lucide-react";
import { jost } from "@/lib/fonts";

export default function ProductNotFound() {
  return (
    <div className={`${jost.className} min-h-[75vh] flex items-center justify-center bg-[#FAFAFA] px-4 py-16 sm:py-24`}>
      <div className="w-full max-w-xl text-center">
        {/* Subtle Luxury Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A86A]/40 bg-[#C9A86A]/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A68238] mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Lookbook Archive</span>
        </div>

        {/* 404 Heading */}
        <h1 className="text-6xl sm:text-7xl font-extralight tracking-tight text-[#1A1A1A] mb-3">
          404
        </h1>
        <h2 className="text-2xl sm:text-3xl font-light text-zinc-900 tracking-tight mb-4">
          Piece Not Found
        </h2>
        <p className="text-sm font-light leading-relaxed text-zinc-500 max-w-md mx-auto mb-8">
          The requested garment is either no longer available in our active collection, or the link may have changed. Explore our curated new arrivals or shop by collection.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/products"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-8 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white shadow-sm transition-all hover:bg-[#C9A86A] active:scale-[0.99]"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Browse All Apparel</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-8 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-zinc-800 transition-colors hover:border-black active:scale-[0.99]"
          >
            <Compass className="h-4 w-4" />
            <span>Storefront Home</span>
          </Link>
        </div>

        {/* Quick Category Suggestions */}
        <div className="mt-12 pt-8 border-t border-zinc-200/80">
          <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400 mb-4">
            Popular Categories
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { label: "Jumpsuits", href: "/categories/jumpsuits" },
              { label: "Dresses", href: "/categories/dresses" },
              { label: "Men's Collection", href: "/categories/mens" },
              { label: "Women's Collection", href: "/categories/womens" },
              { label: "Accessories", href: "/categories/accessories" },
            ].map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs text-zinc-600 transition-colors hover:border-black hover:text-black"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
