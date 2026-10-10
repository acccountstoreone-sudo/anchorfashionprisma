"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react";

interface ProductGalleryProps {
  images: string[];
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center bg-zinc-50 border border-zinc-100">
        <span className="text-xs uppercase tracking-widest text-zinc-400">No Image Available</span>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <>
      {/* Desktop View: Stacked Images */}
      <div className="hidden lg:flex flex-col gap-4">
        {images.map((img, idx) => (
          <div
            key={idx}
            className="group relative w-full aspect-[3/4] overflow-hidden bg-[#F9F9F9] cursor-zoom-in"
            onClick={() => openLightbox(idx)}
          >
            <Image
              src={img}
              alt={`Product image ${idx + 1}`}
              fill
              priority={idx < 2}
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <button
              type="button"
              className="absolute right-4 bottom-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-sm backdrop-blur-md opacity-0 transition-all duration-300 hover:bg-black hover:text-white group-hover:opacity-100"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Mobile/Tablet View: Horizontal Snap Carousel */}
      <div className="flex lg:hidden overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-1">
        {images.map((img, idx) => (
          <div
            key={idx}
            className="relative w-full shrink-0 snap-center aspect-[3/4] bg-[#F9F9F9]"
            onClick={() => openLightbox(idx)}
          >
            <Image
              src={img}
              alt={`Product image ${idx + 1}`}
              fill
              priority={idx === 0}
              sizes="100vw"
              className="object-cover object-center"
            />
            {/* Image Counter Badge for Mobile */}
            {images.length > 1 && (
              <div className="absolute bottom-4 right-4 rounded bg-white/90 px-2 py-1 text-[10px] font-medium tracking-widest text-black backdrop-blur-sm shadow-sm">
                {idx + 1} / {images.length}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-lg p-4 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close modal"
            className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-black transition-colors hover:bg-black hover:text-white z-50"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative h-[90vh] w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightboxIndex] || images[0]}
              alt={`Full size image ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 lg:-left-12 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-black shadow-md transition-all hover:bg-black hover:text-white"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 lg:-right-12 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-black shadow-md transition-all hover:bg-black hover:text-white"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
