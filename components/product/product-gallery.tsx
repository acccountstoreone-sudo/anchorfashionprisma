"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductGalleryProps {
  images: { url: string; alt_text?: string; is_primary?: boolean }[];
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-muted">
        <span className="text-muted-foreground">No image available</span>
      </div>
    );
  }

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prevImage = () =>
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Main Image */}
      <div className="group relative aspect-square overflow-hidden rounded-xl bg-muted md:aspect-[4/5]">
        <Image
          src={images[currentIndex].url}
          alt={images[currentIndex].alt_text || "Product Image"}
          fill
          className="cursor-zoom-in object-cover object-center transition-transform duration-500 hover:scale-110"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              onClick={prevImage}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              onClick={nextImage}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors md:h-24 md:w-24",
                currentIndex === index
                  ? "border-primary"
                  : "border-transparent hover:border-muted-foreground/50"
              )}
            >
              <Image
                src={image.url}
                alt={image.alt_text || `Thumbnail ${index + 1}`}
                fill
                className="object-cover object-center"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
