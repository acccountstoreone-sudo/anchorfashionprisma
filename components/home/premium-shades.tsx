import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { jost } from "@/lib/fonts";

const collections = [
  {
    id: "women",
    title: "Women's Edit",
    subtitle: "New Season",
    link: "/categories/women",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
    theme: "dark",
  },
  {
    id: "men",
    title: "Men's Style",
    subtitle: "Sharp & Modern",
    link: "/categories/men",
    image:
      "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80",
    theme: "light",
  },
  {
    id: "ethnic",
    title: "Ethnic Wear",
    subtitle: "Heritage Collection",
    link: "/categories/ethnic",
    image:
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80",
    theme: "dark",
  },
  {
    id: "accessories",
    title: "Accessories",
    subtitle: "Complete the Look",
    link: "/categories/accessories",
    image:
      "https://images.unsplash.com/photo-1588117305388-c2631a279f82?w=800&q=80",
    theme: "dark",
  },
];

export function PremiumShades() {
  return (
    <section className={`${jost.className} w-full bg-[#FAFAFA] py-16 md:py-24`}>
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.3em] text-[#C9A86A]">
              Shop By Category
            </span>
            <h2 className="text-3xl font-light tracking-tight text-[#1A1A1A] md:text-5xl">
              Your Style, Your Way.
            </h2>
          </div>
          <Link
            href="/categories"
            className="hidden items-center gap-2 border-b border-black pb-1 text-xs font-bold uppercase tracking-[0.2em] text-black transition-colors hover:border-[#C9A86A] hover:text-[#C9A86A] md:flex"
          >
            All Categories
          </Link>
        </div>

        {/* Premium 2x2 Category Grid */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={col.link}
              className="group relative block h-[250px] overflow-hidden bg-[#111] md:h-[380px]"
            >
              <Image
                src={col.image}
                alt={col.title}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 25vw"
                className="object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-110"
              />
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-500 group-hover:opacity-90" />

              {/* Text */}
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                <div>
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.25em] text-white/60">
                    {col.subtitle}
                  </span>
                  <h3 className="text-lg font-medium leading-tight text-white md:text-2xl">
                    {col.title}
                  </h3>
                </div>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all duration-300 group-hover:scale-110 group-hover:bg-[#C9A86A]">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>

              {/* Gold accent line on hover */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] origin-left scale-x-0 bg-[#C9A86A] transition-transform duration-500 group-hover:scale-x-100" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
