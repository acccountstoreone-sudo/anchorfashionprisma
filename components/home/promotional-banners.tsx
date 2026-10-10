import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PromotionalBanners() {
  return (
    <section className="bg-white py-8">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Left Large Banner */}
          <div className="group relative flex h-[400px] flex-col justify-between overflow-hidden rounded-md bg-[#f5efe8] p-8 shadow-sm md:col-span-1">
            <div className="relative z-10">
              <p className="mb-2 font-serif text-xs italic text-gray-600">
                Special Deal
              </p>
              <h3 className="mb-2 font-serif text-2xl leading-tight text-gray-900 transition-colors group-hover:text-primary">
                Summer Offer
              </h3>
              <p className="mb-6 origin-left font-serif text-4xl font-light transition-transform duration-500 group-hover:scale-110">
                20% <span className="text-xl">OFF</span>
              </p>
              <Link
                href="/products?sale=summer"
                className="inline-flex items-center border-b border-gray-900 pb-1 text-xs font-bold uppercase tracking-wider text-gray-900 transition-all hover:border-primary hover:text-primary group-hover:tracking-widest"
              >
                Shop Now{" "}
                <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-2" />
              </Link>
            </div>
            <div className="absolute bottom-0 right-0 h-3/4 w-3/4">
              <Image
                src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=500&q=80"
                alt="Summer Offer"
                fill
                sizes="(max-width: 768px) 75vw, 25vw"
                className="rounded-tl-[100px] object-cover object-left-top transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 rounded-tl-[100px] bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </div>
          </div>

          {/* Middle Column (Two stacked banners) */}
          <div className="flex flex-col gap-6 md:col-span-2">
            {/* Top Middle */}
            <div className="group relative flex flex-1 items-center overflow-hidden rounded-md bg-[#f9ebeb] p-8 shadow-sm">
              <div className="relative z-10 w-1/2">
                <p className="mb-2 font-serif text-xs italic text-gray-600">
                  Exclusive Offer
                </p>
                <h3 className="mb-1 font-serif text-2xl text-gray-900 transition-colors group-hover:text-primary">
                  SALE UP TO
                </h3>
                <p className="mb-4 origin-left font-serif text-4xl font-light transition-transform duration-500 group-hover:scale-105">
                  50% OFF
                </p>
                <Link
                  href="/products?sale=50off"
                  className="inline-flex items-center bg-gray-900 px-4 py-2 text-xs font-medium text-white transition-all group-hover:scale-105 group-hover:bg-primary group-hover:shadow-lg"
                >
                  Shop Now{" "}
                  <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="absolute bottom-0 right-0 top-0 w-1/2">
                <Image
                  src="https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&q=80"
                  alt="50% Off"
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover object-top transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#f9ebeb] via-transparent to-black/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </div>
            </div>

            {/* Bottom Middle */}
            <div className="group relative flex flex-1 items-center overflow-hidden rounded-md bg-primary p-8 shadow-sm">
              <div className="relative z-10 w-3/5">
                <p className="mb-2 font-serif text-xs italic text-white/70">
                  The Luxury Beauty Brand
                </p>
                <h3 className="mb-4 origin-left font-serif text-xl leading-tight text-white transition-transform duration-500 group-hover:scale-105 md:text-2xl">
                  Long Wearing Cosmetics
                </h3>
                <Link
                  href="/categories/beauty"
                  className="inline-flex items-center border-b border-white pb-1 text-xs font-bold uppercase tracking-wider text-white transition-all hover:border-white/80 hover:text-white/80 group-hover:tracking-widest"
                >
                  Shop Now{" "}
                  <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-2" />
                </Link>
              </div>
              <div className="absolute bottom-0 right-0 top-0 w-2/5 overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=600&q=80"
                  alt="Luxury Beauty"
                  fill
                  sizes="(max-width: 768px) 40vw, 20vw"
                  className="object-cover object-center transition-transform duration-1000 group-hover:scale-110"
                />
                {/* Fixed gradient to transition smoothly from the primary color */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-transparent"></div>
              </div>
            </div>
          </div>

          {/* Right Large Banner */}
          <div className="group relative flex h-[400px] flex-col overflow-hidden rounded-md bg-[#f8f9fa] p-8 shadow-sm md:col-span-1">
            <div className="relative z-10 mt-4 text-center">
              <p className="mb-2 font-serif text-xs italic text-gray-600">
                New Arrival
              </p>
              <h3 className="mb-4 font-serif text-xl leading-tight text-gray-900 transition-colors group-hover:text-primary">
                Summer
                <br />
                Trouser Suit
              </h3>
              <Link
                href="/products/trouser-suit"
                className="inline-flex items-center border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-900 transition-all hover:border-primary hover:bg-primary hover:text-white group-hover:shadow-lg"
              >
                Shop Now{" "}
                <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="absolute inset-0 mt-32">
              <Image
                src="https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=600&q=80"
                alt="Trouser Suit"
                fill
                sizes="(max-width: 768px) 100vw, 25vw"
                className="object-cover object-top transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
