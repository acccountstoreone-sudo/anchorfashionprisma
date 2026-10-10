import Link from "next/link";
import { Sparkles, Compass, ShoppingBag } from "lucide-react";
import { jost } from "@/lib/fonts";

export default function NotFound() {
  return (
    <div className={`${jost.className} min-h-[75vh] flex items-center justify-center bg-[#FAFAFA] px-4 py-16 sm:py-24`}>
      <div className="w-full max-w-xl text-center">
        {/* Subtle Luxury Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A86A]/40 bg-[#C9A86A]/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A68238] mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Page Not Found</span>
        </div>

        {/* 404 Heading */}
        <h1 className="text-6xl sm:text-7xl font-extralight tracking-tight text-[#1A1A1A] mb-3">
          404
        </h1>
        <h2 className="text-2xl sm:text-3xl font-light text-zinc-900 tracking-tight mb-4">
          Lost in Style
        </h2>
        <p className="text-sm font-light leading-relaxed text-zinc-500 max-w-md mx-auto mb-8">
          The page you are looking for does not exist or may have been moved. Continue exploring our latest collections and designer apparel.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/products"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-8 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white shadow-sm transition-all hover:bg-[#C9A86A] active:scale-[0.99]"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Shop Collection</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-8 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-zinc-800 transition-colors hover:border-black active:scale-[0.99]"
          >
            <Compass className="h-4 w-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
