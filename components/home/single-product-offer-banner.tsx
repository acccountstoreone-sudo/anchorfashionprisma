"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function SingleProductOfferBanner() {
  return (
    <section className="bg-white py-16">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center overflow-hidden rounded-md bg-[#f0f4f8] shadow-sm md:flex-row">
          <div className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-12 lg:p-16">
            <div className="mb-6 inline-flex w-max items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-primary shadow-sm">
              <Star className="h-3.5 w-3.5 fill-primary" />
              Deal of the Week
            </div>

            <h2 className="mb-4 font-serif text-3xl leading-tight text-gray-900 md:text-4xl lg:text-5xl">
              Premium Leather <br /> Weekend Bag
            </h2>

            <p className="mb-8 max-w-md text-gray-600">
              Handcrafted with full-grain leather, featuring a spacious interior
              and multiple compartments for your weekend getaways.
            </p>

            <div className="mb-8 flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 line-through">
                  {formatCurrency(12500)}
                </span>
                <span className="text-3xl font-bold text-primary">
                  {formatCurrency(8500)}
                </span>
              </div>
              <div className="rounded-sm bg-red-100 px-2 py-1 text-xs font-bold uppercase tracking-widest text-red-600">
                Save 32%
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/products/premium-leather-weekend-bag"
                className="inline-flex items-center justify-center rounded-sm bg-primary px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-colors hover:bg-black hover:shadow-lg"
              >
                Shop Now <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[400px] w-full md:min-h-[500px] md:w-1/2">
            <Image
              src="https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800&q=80"
              alt="Premium Leather Weekend Bag"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
