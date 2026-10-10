"use client";

import { Star, Quote } from "lucide-react";
import { jost } from "@/lib/fonts";

const testimonials = [
  {
    id: 1,
    name: "Nusrat Jahan",
    role: "Verified Buyer",
    location: "Dhaka",
    content:
      "The quality of the kurtis I received is absolutely outstanding. They fit perfectly and the fabric feels so premium. I'm definitely shopping here again and again!",
    rating: 5,
    product: "Summer Kurti Collection",
  },
  {
    id: 2,
    name: "Rania Hossain",
    role: "Verified Buyer",
    location: "Chittagong",
    content:
      "Anchor Fashion's customer service is top-notch. I had an issue with sizing, and they exchanged it within two days. The new dress looks absolutely gorgeous on me.",
    rating: 5,
    product: "Evening Dress",
  },
  {
    id: 3,
    name: "Lamia Sultana",
    role: "Verified Buyer",
    location: "Sylhet",
    content:
      "I've been looking for authentic, elegant ethnic wear and I finally found it here. The embroidery and the craftsmanship are simply stunning. Worth every taka!",
    rating: 5,
    product: "Ethnic Saree",
  },
];

export function Testimonials() {
  return (
    <section className={`${jost.className} bg-gray-50 py-20 md:py-28`}>
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.35em] text-[#C9A86A]">
            Customer Reviews
          </span>
          <h2 className="text-3xl font-light tracking-tight text-gray-900 md:text-5xl">
            Loved by Thousands.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm font-light text-gray-500">
            Don&apos;t just take our word for it — here&apos;s what our
            community says.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={t.id}
              className="group relative flex flex-col border border-gray-100 bg-white p-8 shadow-sm transition-all duration-500 hover:border-[#C9A86A]/40 hover:shadow-md"
            >
              {/* Large quote mark */}
              <Quote className="mb-6 h-8 w-8 flex-shrink-0 text-[#C9A86A]/20" />

              {/* Stars */}
              <div className="mb-5 flex gap-1">
                {[...Array(t.rating)].map((_, j) => (
                  <Star
                    key={j}
                    className="h-3.5 w-3.5 fill-[#C9A86A] text-[#C9A86A]"
                  />
                ))}
              </div>

              {/* Review Text */}
              <p className="mb-8 flex-1 text-sm font-light leading-relaxed text-gray-600">
                &ldquo;{t.content}&rdquo;
              </p>

              {/* Reviewer Info */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{t.name}</h4>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {t.role} · {t.location}
                  </p>
                </div>
                <span className="max-w-[100px] text-right text-[9px] font-bold uppercase tracking-wider text-[#C9A86A]">
                  {t.product}
                </span>
              </div>

              {/* Gold accent line on hover */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] origin-left scale-x-0 bg-[#C9A86A] transition-transform duration-500 group-hover:scale-x-100" />
            </div>
          ))}
        </div>

        {/* Overall Rating Summary */}
        <div className="mt-12 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-[#C9A86A] text-[#C9A86A]" />
            ))}
          </div>
          <p className="text-sm font-light text-gray-500">
            <span className="font-semibold text-gray-900">4.9 / 5</span> based on
            2,400+ reviews
          </p>
        </div>
      </div>
    </section>
  );
}
