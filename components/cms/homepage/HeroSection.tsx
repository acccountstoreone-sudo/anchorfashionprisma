import React from "react";
import Link from "next/link";
import Image from "next/image";
import { HomepageHero } from "@/types/cms";

interface HeroSectionProps {
  data: HomepageHero;
}

export function HeroSection({ data }: HeroSectionProps) {
  return (
    <section className="relative flex h-[50vh] min-h-[350px] w-full items-center justify-center overflow-hidden md:h-[80vh] md:min-h-[600px]">
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        {data.media_type === "VIDEO" ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
            src={data.media_url || ""}
          />
        ) : (
          <Image
            src={data.media_url || "https://placehold.co/1920x1080/eaeaea/black?text=Hero"}
            alt={data.headline || "Hero image"}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
      </div>

      {/* Overlay */}
      <div
        className="absolute inset-0 z-10 bg-black"
        style={{ opacity: data.overlay_opacity }}
      />

      {/* Content */}
      <div className="relative z-20 mx-auto flex max-w-4xl flex-col items-center px-4 text-center text-white">
        {data.headline && (
          <h1 className="mb-6 text-4xl font-bold uppercase tracking-tight md:text-6xl lg:text-7xl">
            {data.headline}
          </h1>
        )}

        {data.subheadline && (
          <p className="mx-auto mb-10 max-w-2xl text-lg font-light md:text-2xl">
            {data.subheadline}
          </p>
        )}

        {data.cta_text && data.cta_url && (
          <Link
            href={data.cta_url}
            className="inline-flex h-14 items-center justify-center bg-white px-10 text-lg font-medium uppercase tracking-widest text-black transition-colors duration-300 hover:bg-gray-100"
          >
            {data.cta_text}
          </Link>
        )}
      </div>
    </section>
  );
}
