"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import type { HeroSlide } from "@/actions/cms.actions";

export type { HeroSlide };

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: 1,
    ctaHref: "/products?sort=newest",
    image: "https://videos.pexels.com/video-files/5192138/5192138-uhd_2160_4096_25fps.mp4",
    isVideo: true,
  },
  {
    id: 2,
    ctaHref: "/categories/ethnic",
    image: "/images/home/hero-slide-2.png",
  },
  {
    id: 3,
    ctaHref: "/categories/summer",
    image: "/images/home/hero-slide-3.png",
  },
];

export function HomeHero({ slides: propSlides }: { slides?: HeroSlide[] }) {
  const slides =
    propSlides && propSlides.length > 0 ? propSlides : DEFAULT_SLIDES;
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (animating) return;
      setAnimating(true);
      setTimeout(() => {
        setCurrent(index);
        setAnimating(false);
      }, 700); // Slower, more elegant crossfade
    },
    [animating]
  );

  const next = useCallback(
    () => goTo((current + 1) % slides.length),
    [current, goTo, slides.length]
  );

  // Auto-play (only when more than 1 slide)
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(next, 6500); // slightly longer reading time
    return () => clearInterval(timer);
  }, [next, slides.length]);

  return (
    <section className="relative w-full overflow-hidden bg-[#1A1A1A]">
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
          const isVideo = slide.isVideo || imageUrl.endsWith(".mp4") || imageUrl.includes("/video-files/");

          return (
            <div
              key={slide.id}
              className="absolute inset-0 h-full w-full transition-transform duration-1000 ease-in-out"
              style={{ transform: `translateX(${(index - current) * 100}%)` }}
            >
              <Link
                href={ctaHref}
                className="absolute inset-0 z-10 block"
                aria-label={headline || "View Promotion"}
              >
                <span className="sr-only">{headline || "View Promotion"}</span>
              </Link>

              <div className="absolute inset-0 h-full w-full overflow-hidden bg-[#111]">
                {isVideo ? (
                  <video
                    src={imageUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload={index === 0 ? "auto" : "none"}
                    className={`h-full w-full object-cover object-center md:transition-transform md:ease-out md:[transition-duration:20s] ${
                      isActive ? "scale-100 md:scale-105" : "scale-100"
                    }`}
                    poster="/images/home/hero-banner.png"
                  />
                ) : (
                  <Image
                    src={imageUrl}
                    alt={headline ?? `Banner ${index + 1}`}
                    fill
                    sizes="100vw"
                    className={`h-full w-full object-cover object-center md:transition-transform md:ease-out md:[transition-duration:20s] ${
                      isActive ? "scale-100 md:scale-105" : "scale-100"
                    }`}
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                )}
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

