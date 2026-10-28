import { Metadata } from "next";
import Link from "next/link";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Sparkles, ShieldCheck, Award, Gem } from "lucide-react";
import { jost } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "About Us — The Atelier & Heritage | Anchor Fashion",
  description:
    "Learn about Anchor Fashion, our artisanal craftsmanship, modern aesthetics, and dedication to timeless luxury apparel.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StoreHeader />

      <main className="flex-1">
        {/* Editorial Hero Banner */}
        <section className="relative overflow-hidden bg-[#0D1B2A] py-20 text-white md:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(201,168,106,0.18),transparent_65%)] pointer-events-none" />
          <div className="container relative mx-auto max-w-4xl px-4 text-center md:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A86A]/40 bg-[#C9A86A]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#EAD098] mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Our Heritage & Vision</span>
            </div>
            <h1
              className={`${jost.className} text-4xl font-light tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl`}
            >
              Crafted for Confidence. <br className="hidden sm:inline" />
              <span className="italic font-serif font-normal text-[#C9A86A]">Defined by Elegance.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base font-light leading-relaxed text-gray-300 md:text-lg">
              Anchor Fashion redefines contemporary luxury apparel by blending time-honored artisanal tailoring with modern metropolitan silhouettes.
            </p>
          </div>
        </section>

        {/* Narrative / Story Section */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="space-y-6">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#C9A86A]">
                  Our Story
                </span>
                <h2 className={`${jost.className} text-3xl font-light tracking-tight text-gray-950 sm:text-4xl`}>
                  Where Architecture Meets Modern Apparel
                </h2>
                <p className="leading-relaxed text-gray-600 font-light text-base md:text-lg">
                  Founded with an uncompromising devotion to fabric integrity, Anchor Fashion began as an independent studio atelier. We set out to disrupt the cycle of disposable fast fashion by building pieces that endure season after season.
                </p>
                <p className="leading-relaxed text-gray-600 font-light text-sm md:text-base">
                  Every silhouette in our collection undergoes rigorous prototyping, precision stitching, and wear-testing. From ethically sourced natural textiles to structured modern cuts, we take pride in dressing discerning individuals who appreciate subtle luxury.
                </p>

                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <Button asChild className="rounded-full bg-[#1A1A1A] px-7 py-6 text-xs font-bold uppercase tracking-widest text-white hover:bg-black">
                    <Link href="/products" className="inline-flex items-center gap-2">
                      <span>Explore Catalog</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full px-7 py-6 text-xs font-bold uppercase tracking-widest border-gray-300 hover:border-black">
                    <Link href="/collections">
                      Curated Edits
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Atelier Visual Grid */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-neutral-100 shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&q=85"
                  alt="Anchor Fashion Design Atelier"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/95 backdrop-blur-md p-5 text-gray-900 shadow-lg border border-white/20">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#C9A86A]">Dhaka Flagship Atelier</p>
                  <p className="text-sm text-gray-600 mt-1 font-light">
                    Every garment is inspected by master tailors before earning the Anchor hallmark.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars / Values Section */}
        <section className="border-t border-gray-100 bg-[#FAFAFA] py-20 md:py-28">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#C9A86A]">
                The Anchor Standard
              </span>
              <h2 className={`${jost.className} mt-2 text-3xl font-light tracking-tight text-gray-950 sm:text-4xl`}>
                Crafted Without Compromise
              </h2>
              <p className="mt-3 text-sm md:text-base text-gray-500 font-light">
                Our philosophy centers around longevity, ethical production, and elevated tactile comfort.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <Card className="rounded-2xl border-none bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <CardContent className="p-0 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A86A]/15 text-[#C9A86A]">
                    <Gem className="h-6 w-6" />
                  </div>
                  <h3 className={`${jost.className} text-xl font-medium text-gray-900`}>
                    Premium Fabric Selection
                  </h3>
                  <p className="text-sm font-light leading-relaxed text-gray-600">
                    We handpick high-grade cottons, rich linens, structured denims, and flowing silks that feel sublime against the skin and maintain their shape over time.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-none bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <CardContent className="p-0 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A86A]/15 text-[#C9A86A]">
                    <Award className="h-6 w-6" />
                  </div>
                  <h3 className={`${jost.className} text-xl font-medium text-gray-900`}>
                    Precision Tailoring
                  </h3>
                  <p className="text-sm font-light leading-relaxed text-gray-600">
                    Reinforced seams, bespoke button finishes, and engineered ease of movement allow each garment to drape naturally and flatter diverse body shapes.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-none bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <CardContent className="p-0 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A86A]/15 text-[#C9A86A]">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className={`${jost.className} text-xl font-medium text-gray-900`}>
                    Conscious Responsibility
                  </h3>
                  <p className="text-sm font-light leading-relaxed text-gray-600">
                    We believe in fair artisan wages, safe studio environments, zero hazardous dyes, and sustainable packaging initiatives for every order shipped.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Commitment Numbers Banner */}
        <section className="border-t border-gray-100 bg-white py-16">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
              <div>
                <p className={`${jost.className} text-3xl md:text-4xl font-light text-gray-900`}>100%</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">Quality Verified</p>
              </div>
              <div>
                <p className={`${jost.className} text-3xl md:text-4xl font-light text-gray-900`}>64+</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">Districts Delivered</p>
              </div>
              <div>
                <p className={`${jost.className} text-3xl md:text-4xl font-light text-gray-900`}>7 Days</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">Hassle-Free Return</p>
              </div>
              <div>
                <p className={`${jost.className} text-3xl md:text-4xl font-light text-gray-900`}>24/7</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">Concierge Support</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  );
}
