"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import type { HeroSlide } from "@/actions/cms.actions";

export type { HeroSlide };

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: 1,
    title: "Signature Festive Elegance",
    subtitle: "New Season Hand-Crafted Collection",
    ctaHref: "/products?sort=newest",
    image: "/images/home/hero-banner.png",
  },
  {
    id: 2,
    title: "Royal Heritage Panjabi",
    subtitle: "Pure Silk & Handcrafted Embroidery",
    ctaHref: "/categories/panjabi",
    image: "/images/home/hero-slide-2.png",
  },
  {
    id: 3,
    title: "Executive Luxury Polos & Knits",
    subtitle: "Modern Tailoring & Premium Fabrics",
    ctaHref: "/categories/polo",
    image: "/images/home/hero-slide-3.png",
  },
];

function HeroSlideMedia({
  slide,
  index,
  isActive,
}: {
  slide: HeroSlide;
  index: number;
  isActive: boolean;
}) {
  const initialUrl =
    slide.image_url ?? slide.media_url ?? slide.image ?? "/images/home/hero-banner.png";
  const [src, setSrc] = useState(initialUrl);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    setSrc(initialUrl);
    setVideoFailed(false);
  }, [initialUrl]);

  const headline = slide.title ?? slide.headline;
  const isVideo =
    !videoFailed &&
    (slide.isVideo || src.endsWith(".mp4") || src.includes("/video-files/"));

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden bg-[#111]">
      {isVideo ? (
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className={`h-full w-full object-cover object-center md:transition-transform md:ease-out md:[transition-duration:20s] ${
            isActive ? "scale-100 md:scale-105" : "scale-100"
          }`}
          poster="/images/home/hero-banner.png"
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <Image
          src={videoFailed ? "/images/home/hero-banner.png" : src}
          alt={headline ?? `Banner ${index + 1}`}
          fill
          sizes="100vw"
          className={`h-full w-full object-cover object-center md:transition-transform md:ease-out md:[transition-duration:20s] ${
            isActive ? "scale-100 md:scale-105" : "scale-100"
          }`}
          priority={index === 0}
          loading={index === 0 ? "eager" : "lazy"}
          onError={() => {
            if (src !== "/images/home/hero-banner.png") {
              setSrc("/images/home/hero-banner.png");
            }
          }}
          unoptimized={src.startsWith("data:")}
        />
      )}
    </div>
  );
}

export function HomeHero({ slides: propSlides }: { slides?: HeroSlide[] }) {
  const slides =
    propSlides && propSlides.length > 0 ? propSlides : DEFAULT_SLIDES;
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (animating || index === current) return;
      setCurrent(index);
      setAnimating(true);
      setTimeout(() => {
        setAnimating(false);
      }, 1000); // Matches transition-transform duration-1000
    },
    [animating, current]
  );

  const next = useCallback(
    () => goTo((current + 1) % slides.length),
    [current, goTo, slides.length]
  );

  // Auto-play (only when more than 1 slide)
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(next, 9000); // 9 seconds reading time
    return () => clearInterval(timer);
  }, [next, slides.length]);

  return (
    <section className="relative w-full overflow-hidden bg-[#1A1A1A]">
      <h1 className="sr-only">Anchor Fashion | Premium Apparel &amp; Luxury Fashion</h1>
      {/* Full-width responsive banner: exact uncropped aspect-[1896/830] on mobile/tablet, immersive full-bleed on desktop */}
      <div className="relative aspect-[1896/830] sm:aspect-[1896/830] w-full md:aspect-auto md:h-[80vh] md:min-h-[560px]">
        {slides.map((slide, index) => {
          const isActive = index === current;
          const imageUrl =
            slide.image_url ?? slide.media_url ?? slide.image ?? "/images/home/hero-banner.png";
          const ctaHref = slide.link_url ?? slide.cta_url ?? slide.ctaHref ?? "/products";
          const headline = slide.title ?? slide.headline;
          const subheadline = slide.subtitle ?? slide.subheadline;
          const ctaText = slide.cta_text || "Discover More";

          return (
            <div
              key={slide.id}
              className="absolute inset-0 h-full w-full transition-transform duration-1000 ease-in-out"
              style={{ transform: `translateX(${(index - current) * 100}%)` }}
            >
              <HeroSlideMedia slide={slide} index={index} isActive={isActive} />

              {/* Luxury Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent md:bg-gradient-to-r md:from-black/85 md:via-black/40 md:to-transparent z-10 pointer-events-none" />

              {/* Editorial Fashion Content */}
              <div className="absolute inset-0 z-20 flex items-end md:items-center px-6 pb-12 sm:pb-16 md:pb-0 md:px-16 lg:px-24">
                <div className="max-w-xl text-left">
                  {subheadline && (
                    <span className="inline-block text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-[0.25em] text-[#C9A86A] mb-2 sm:mb-3">
                      {subheadline}
                    </span>
                  )}
                  {headline && (
                    <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-normal text-white leading-tight mb-4 sm:mb-6 drop-shadow-sm">
                      {headline}
                    </h2>
                  )}
                  <div>
                    <Link
                      href={ctaHref}
                      className="group inline-flex items-center gap-2.5 bg-white text-zinc-950 hover:bg-[#C9A86A] hover:text-white px-6 py-3 sm:px-8 sm:py-3.5 text-xs sm:text-sm font-medium tracking-[0.15em] uppercase transition-all duration-300 shadow-xl rounded-sm"
                    >
                      <span>{ctaText}</span>
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Elegant Line Indicators (only when multiple slides) */}
      {slides.length > 1 && (
        <div className="absolute bottom-1.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 sm:bottom-3 md:bottom-10 md:gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="group relative flex items-center justify-center px-1 py-1 sm:py-2 md:py-3"
              aria-label={`Go to slide ${i + 1}`}
            >
              <span
                className={`block h-[2px] transition-all duration-700 ease-out ${
                  i === current
                    ? "w-6 sm:w-8 md:w-12 bg-[#C9A86A]"
                    : "w-3 sm:w-4 md:w-5 bg-white/40 group-hover:w-5 group-hover:bg-white/60"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

