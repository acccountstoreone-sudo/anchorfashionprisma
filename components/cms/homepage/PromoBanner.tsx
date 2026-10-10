import React from "react";
import Link from "next/link";
import Image from "next/image";
import { HomepagePromotion } from "@/types/cms";

interface PromoBannerProps {
  data: HomepagePromotion;
}

export function PromoBanner({ data }: PromoBannerProps) {
  return (
    <section
      className="relative my-8 flex w-full items-center justify-center overflow-hidden px-4 py-12 md:my-12 md:py-20"
      style={{ backgroundColor: data.bg_color || "#f4f4f5" }}
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-10">
        {/* Content */}
        <div className="z-10 order-2 flex flex-col items-start justify-center bg-white/90 p-8 shadow-sm backdrop-blur-sm md:order-1 md:p-12">
          {data.title && (
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-black md:text-5xl">
              {data.title}
            </h2>
          )}
          {data.description && (
            <p className="mb-8 text-lg leading-relaxed text-gray-600">
              {data.description}
            </p>
          )}
          {data.cta_text && data.cta_url && (
            <Link
              href={data.cta_url}
              className="inline-flex h-12 items-center justify-center bg-black px-8 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-gray-800"
            >
              {data.cta_text}
            </Link>
          )}
        </div>

        {/* Media */}
        <div className="relative order-1 h-[300px] w-full md:order-2 md:h-[500px]">
          {data.image_mobile && (
            <Image
              src={data.image_mobile}
              alt={data.title || "Promotional Banner"}
              fill
              sizes="(max-width: 768px) 100vw"
              className="object-cover md:hidden"
            />
          )}
          <Image
            src={data.image_desktop}
            alt={data.title || "Promotional Banner"}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={`object-cover ${data.image_mobile ? "hidden md:block" : ""}`}
          />
        </div>
      </div>
    </section>
  );
}
