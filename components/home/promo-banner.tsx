import Link from "next/link";
import Image from "next/image";
import { jost } from "@/lib/fonts";

interface PromoBannerProps {
  title: string;
  subtitle: string;
  description?: string | null;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
}

export function PromoBanner({
  title,
  subtitle,
  description,
  ctaText,
  ctaLink,
  imageUrl,
}: PromoBannerProps) {
  return (
    <section className="w-full py-4 md:py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="group relative flex min-h-[360px] flex-col items-stretch overflow-hidden rounded-2xl border border-neutral-800 bg-[#141414] shadow-xl md:h-[440px] lg:h-[460px] md:flex-row">
          {/* Left Side: High-Resolution Image */}
          <div className="relative min-h-[220px] sm:min-h-[260px] w-full overflow-hidden bg-neutral-900 md:min-h-full md:w-1/2">
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-105"
              unoptimized={imageUrl.startsWith("http")}
            />
            {/* Subtle Gradient Transition */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#141414]/60" />
          </div>

          {/* Right Side: Editorial Content */}
          <div className="relative flex w-full items-center justify-center bg-[#141414] p-6 sm:p-10 md:w-1/2 md:p-12 lg:p-14">
            {/* Decorative Gold Frame */}
            <div className="pointer-events-none absolute inset-3 sm:inset-4 rounded-xl border border-[#C9A86A]/20 md:inset-6" />

            <div className="relative z-10 flex max-w-md flex-col items-center text-center">
              {subtitle && (
                <span className="mb-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C9A86A] md:text-xs">
                  {subtitle}
                </span>
              )}

              <h2
                className={`${jost.className} mb-3 text-xl sm:text-3xl md:text-4xl font-light leading-[1.15] tracking-tight text-white line-clamp-2`}
              >
                {title}
              </h2>

              <p className="mb-5 sm:mb-6 max-w-sm text-xs leading-relaxed text-neutral-300 md:text-sm line-clamp-3">
                {description ||
                  "Elevate your wardrobe with our latest curated collection. Exclusive pieces designed for the modern individual who values both aesthetics and comfort."}
              </p>

              <Link
                href={ctaLink}
                className="group/btn relative inline-flex items-center justify-center overflow-hidden rounded-sm bg-white px-6 py-2.5 sm:px-8 sm:py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#141414] transition-all hover:bg-[#C9A86A] hover:text-white md:px-10 md:py-3.5"
              >
                <span className="relative z-10 transition-transform group-hover/btn:-translate-y-12">
                  {ctaText}
                </span>
                <span className="absolute inset-0 z-10 flex translate-y-12 items-center justify-center text-white transition-transform group-hover/btn:translate-y-0">
                  {ctaText}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
