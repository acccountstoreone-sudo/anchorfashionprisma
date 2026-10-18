"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  LayoutGrid,
  Columns2,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface GalleryImageItem {
  id?: string;
  url: string;
  alt_text?: string;
  is_primary?: boolean;
  media_type?: "IMAGE" | "VIDEO" | "360_VIEW" | string;
}

export type GalleryImageInput = string | GalleryImageItem;

export interface ProductGalleryProps {
  images: GalleryImageInput[];
  productName?: string;
  discountPercent?: number | null;
  className?: string;
  initialViewMode?: "carousel" | "grid";
}

export function ProductGallery({
  images,
  productName = "Product Image",
  discountPercent,
  className,
  initialViewMode = "carousel",
}: ProductGalleryProps) {
  // Normalize images to uniform array
  const normalizedImages = React.useMemo(() => {
    if (!images || images.length === 0) return [];
    return images
      .map((item, index) => {
        if (typeof item === "string") {
          const isVideo = item.endsWith(".mp4") || item.endsWith(".webm");
          return {
            url: item,
            alt: `${productName} — View ${index + 1}`,
            isVideo,
          };
        }
        if (item && typeof item === "object" && item.url) {
          const isVideo =
            item.media_type === "VIDEO" ||
            item.url.endsWith(".mp4") ||
            item.url.endsWith(".webm");
          return {
            url: item.url,
            alt: item.alt_text || `${productName} — View ${index + 1}`,
            isVideo,
          };
        }
        return null;
      })
      .filter((img): img is { url: string; alt: string; isVideo: boolean } =>
        Boolean(img?.url)
      );
  }, [images, productName]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"carousel" | "grid">(initialViewMode);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Refs for auto-scrolling thumbnails & stage
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mainImageRef = useRef<HTMLDivElement>(null);

  // Reset current index when images list completely changes (e.g. variant switched)
  useEffect(() => {
    setCurrentIndex(0);
    setImageLoaded(false);
  }, [images]);

  // Keep active thumbnail visible in vertical / horizontal strip
  useEffect(() => {
    const activeThumb = thumbnailRefs.current[currentIndex];
    if (activeThumb && thumbnailContainerRef.current) {
      activeThumb.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [currentIndex]);

  const goToPrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (normalizedImages.length <= 1) return;
      setCurrentIndex((prev) =>
        prev > 0 ? prev - 1 : normalizedImages.length - 1
      );
      setImageLoaded(false);
    },
    [normalizedImages.length]
  );

  const goToNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (normalizedImages.length <= 1) return;
      setCurrentIndex((prev) =>
        prev < normalizedImages.length - 1 ? prev + 1 : 0
      );
      setImageLoaded(false);
    },
    [normalizedImages.length]
  );

  // Desktop Hover Zoom calculation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainImageRef.current) return;
    const rect = mainImageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setMousePos({ x, y });
  };

  // Lightbox handlers
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxZoom(1);
    setPanPosition({ x: 0, y: 0 });
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxZoom(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleLightboxPrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (normalizedImages.length <= 1) return;
      setLightboxIndex((prev) =>
        prev > 0 ? prev - 1 : normalizedImages.length - 1
      );
      setLightboxZoom(1);
      setPanPosition({ x: 0, y: 0 });
    },
    [normalizedImages.length]
  );

  const handleLightboxNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (normalizedImages.length <= 1) return;
      setLightboxIndex((prev) =>
        prev < normalizedImages.length - 1 ? prev + 1 : 0
      );
      setLightboxZoom(1);
      setPanPosition({ x: 0, y: 0 });
    },
    [normalizedImages.length]
  );

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxZoom((prev) => Math.min(3, Math.round((prev + 0.5) * 10) / 10));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxZoom((prev) => {
      const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxZoom(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleToggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxZoom > 1) {
      setLightboxZoom(1);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setLightboxZoom(2.2);
    }
  };

  // Lightbox Pan drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (lightboxZoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panPosition.x,
      panY: panPosition.y,
    };
  };

  const handleMouseDrag = (e: React.MouseEvent) => {
    if (!isDragging || lightboxZoom <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanPosition({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard controls for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") handleLightboxPrev();
      if (e.key === "ArrowRight") handleLightboxNext();
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
      if (e.key === "0") handleResetZoom();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, handleLightboxPrev, handleLightboxNext]);

  // Touch swipe support for mobile
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
    const diffY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Register horizontal swipe if diffX is significantly larger than diffY
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Thumbnail strip scroll controls
  const scrollThumbnails = (direction: "up" | "down") => {
    if (!thumbnailContainerRef.current) return;
    const scrollAmount = direction === "up" ? -150 : 150;
    thumbnailContainerRef.current.scrollBy({
      top: scrollAmount,
      behavior: "smooth",
    });
  };

  if (normalizedImages.length === 0) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl border border-zinc-200/80 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            No Images Available
          </p>
        </div>
      </div>
    );
  }

  const activeImage = normalizedImages[currentIndex] || normalizedImages[0];
  const hasMultiple = normalizedImages.length > 1;

  return (
    <div className={cn("w-full select-none", className)}>
      {/* ======================================================== */}
      {/* DESKTOP VIEW (>= lg: 1024px) */}
      {/* ======================================================== */}
      <div className="hidden lg:block">
        {/* Gallery Mode Toggle Toolbar */}
        {hasMultiple && (
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
              {viewMode === "grid" ? "Editorial Lookbook" : "Product Gallery"}
            </span>

            <div className="flex items-center gap-1 rounded-lg border border-zinc-200/70 bg-zinc-50/80 p-0.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
              <button
                type="button"
                onClick={() => setViewMode("carousel")}
                title="Single view with zoom"
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                  viewMode === "carousel"
                    ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <Columns2 className="h-3.5 w-3.5" />
                <span>Slider</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Editorial 2-column grid"
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                  viewMode === "grid"
                    ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE A: CAROUSEL WITH THUMBNAILS & SILKY HOVER ZOOM */}
        {viewMode === "carousel" && (
          <div className="flex flex-row items-start gap-4">
            {/* Left Side: Vertical Thumbnail Track */}
            {hasMultiple && (
              <div className="relative flex flex-col items-center shrink-0 w-[78px] xl:w-[86px]">
                {/* Scroll Up Button (shown if > 4 images) */}
                {normalizedImages.length > 4 && (
                  <button
                    type="button"
                    onClick={() => scrollThumbnails("up")}
                    aria-label="Scroll thumbnails up"
                    className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-zinc-600 shadow-sm transition-all hover:bg-black hover:text-white dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-white dark:hover:text-black border border-zinc-200/80 dark:border-zinc-700"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                )}

                {/* Scrollable Thumbnails List */}
                <div
                  ref={thumbnailContainerRef}
                  className="flex flex-col gap-2.5 max-h-[580px] xl:max-h-[640px] overflow-y-auto overflow-x-hidden py-1 px-0.5 scrollbar-none scroll-smooth"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {normalizedImages.map((img, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                      <button
                        key={idx}
                        ref={(el) => {
                          thumbnailRefs.current[idx] = el;
                        }}
                        type="button"
                        onClick={() => {
                          setCurrentIndex(idx);
                          setImageLoaded(false);
                        }}
                        onMouseEnter={() => {
                          setCurrentIndex(idx);
                        }}
                        aria-label={`View image ${idx + 1}`}
                        className={cn(
                          "group relative aspect-[3/4] w-[74px] xl:w-[82px] overflow-hidden rounded-xl border-2 transition-all duration-300",
                          isActive
                            ? "border-[#1A1A1A] ring-2 ring-[#C9A86A]/40 shadow-md scale-[1.03] dark:border-white"
                            : "border-transparent bg-zinc-100 opacity-60 hover:opacity-100 hover:border-zinc-300 dark:bg-zinc-800 dark:hover:border-zinc-700"
                        )}
                      >
                        <Image
                          src={img.url}
                          alt={img.alt}
                          fill
                          sizes="90px"
                          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Micro video badge if item is a video */}
                        {img.isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="h-4 w-4 fill-white text-white drop-shadow" />
                          </div>
                        )}
                        {/* Gold accent active indicator */}
                        {isActive && (
                          <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-[#C9A86A]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Scroll Down Button (shown if > 4 images) */}
                {normalizedImages.length > 4 && (
                  <button
                    type="button"
                    onClick={() => scrollThumbnails("down")}
                    aria-label="Scroll thumbnails down"
                    className="mt-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-zinc-600 shadow-sm transition-all hover:bg-black hover:text-white dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-white dark:hover:text-black border border-zinc-200/80 dark:border-zinc-700"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Right Side: Main Stage View with Interactive Hover Zoom */}
            <div
              ref={mainImageRef}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onMouseMove={handleMouseMove}
              className="group relative flex-1 aspect-[3/4] overflow-hidden rounded-2xl border border-zinc-200/80 bg-[#FAFAFA] dark:border-zinc-800 dark:bg-zinc-900 cursor-crosshair shadow-sm"
            >
              {/* Main Stage Image with Smooth Zoom on Hover */}
              <div
                className="relative h-full w-full overflow-hidden"
                onClick={() => openLightbox(currentIndex)}
              >
                {activeImage.isVideo ? (
                  <video
                    src={activeImage.url}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <Image
                    src={activeImage.url}
                    alt={activeImage.alt}
                    fill
                    priority
                    sizes="(max-width: 1280px) 50vw, 55vw"
                    onLoad={() => setImageLoaded(true)}
                    className={cn(
                      "object-cover object-center will-change-transform",
                      imageLoaded ? "opacity-100" : "opacity-0"
                    )}
                    style={{
                      transform: isHovering ? "scale(2.3)" : "scale(1)",
                      transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                      transition: isHovering
                        ? "transform 0.12s cubic-bezier(0.2, 0, 0.2, 1)"
                        : "transform 0.4s cubic-bezier(0.2, 0, 0.2, 1), opacity 0.3s ease",
                    }}
                  />
                )}

                {/* Loading Shimmer Placeholder */}
                {!imageLoaded && !activeImage.isVideo && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-zinc-100 via-zinc-200/70 to-zinc-100 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800" />
                )}
              </div>

              {/* Discount / Flash Badge (Top Left) */}
              {discountPercent && discountPercent > 0 && (
                <div className="absolute left-4 top-4 z-20 pointer-events-none flex items-center gap-1.5 rounded-full bg-[#111111]/90 px-3 py-1 shadow-lg backdrop-blur-md border border-white/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E50000] animate-ping" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                    {discountPercent}% OFF
                  </span>
                </div>
              )}

              {/* Top Right Actions: Fullscreen Lightbox Button & Zoom Hint */}
              <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
                {/* Zoom hint badge: subtle luxury indicator */}
                <div
                  className={cn(
                    "hidden xl:flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium tracking-wide text-zinc-800 shadow-sm backdrop-blur-md transition-opacity duration-300 dark:bg-zinc-900/90 dark:text-zinc-200 pointer-events-none",
                    isHovering ? "opacity-0" : "opacity-90"
                  )}
                >
                  <ZoomIn className="h-3 w-3 text-[#C9A86A]" />
                  <span>Hover to zoom</span>
                </div>

                {/* Lightbox / Fullscreen trigger button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(currentIndex);
                  }}
                  title="View full screen"
                  aria-label="Open full screen lightbox"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-[#1A1A1A] hover:text-white dark:bg-zinc-800/90 dark:text-white dark:hover:bg-white dark:hover:text-black border border-zinc-200/60 dark:border-zinc-700 hover:scale-105 active:scale-95"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>

              {/* Bottom Right: Clean Luxury Counter Badge */}
              {hasMultiple && (
                <div className="absolute bottom-4 right-4 z-20 pointer-events-none flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-[11px] font-mono tracking-widest text-white shadow-md backdrop-blur-md">
                  <span>{String(currentIndex + 1).padStart(2, "0")}</span>
                  <span className="opacity-40">/</span>
                  <span className="opacity-70">
                    {String(normalizedImages.length).padStart(2, "0")}
                  </span>
                </div>
              )}

              {/* Bottom Left: Micro hint during active hover zoom */}
              {isHovering && !activeImage.isVideo && (
                <div className="absolute bottom-4 left-4 z-20 pointer-events-none flex items-center gap-2 rounded-full bg-black/75 px-3.5 py-1 text-[10px] font-medium tracking-wider text-white backdrop-blur-md animate-in fade-in duration-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C9A86A]" />
                  <span>2.3x Fabric Detail • Click to expand</span>
                </div>
              )}

              {/* Prev / Next Chevrons on Main Stage */}
              {hasMultiple && (
                <>
                  <button
                    type="button"
                    onClick={goToPrev}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-black hover:text-white hover:scale-110 active:scale-95 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-white dark:hover:text-black opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-black hover:text-white hover:scale-110 active:scale-95 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-white dark:hover:text-black opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* MODE B: 2-COLUMN EDITORIAL GRID FOR HIGH FASHION SCROLL */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-2 gap-3.5">
            {normalizedImages.map((img, idx) => (
              <div
                key={idx}
                onClick={() => openLightbox(idx)}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-zinc-200/80 bg-[#FAFAFA] dark:border-zinc-800 dark:bg-zinc-900 cursor-zoom-in shadow-sm transition-all duration-300 hover:shadow-md"
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  sizes="40vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />

                {/* Pill counter */}
                <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-mono text-white backdrop-blur-md opacity-80 group-hover:opacity-100">
                  {String(idx + 1).padStart(2, "0")}
                </div>

                {/* Expand icon on hover */}
                <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-sm backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="h-3.5 w-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MOBILE / TABLET VIEW (< lg: 1024px): Touch Swipe Carousel */}
      {/* ======================================================== */}
      <div className="flex flex-col gap-3 lg:hidden">
        {/* Main Swipeable Stage */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => openLightbox(currentIndex)}
          className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-[#FAFAFA] dark:border-zinc-800 dark:bg-zinc-900 shadow-sm"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.6 }}
              transition={{ duration: 0.2 }}
              className="relative h-full w-full"
            >
              {activeImage.isVideo ? (
                <video
                  src={activeImage.url}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <Image
                  src={activeImage.url}
                  alt={activeImage.alt}
                  fill
                  priority={currentIndex === 0}
                  sizes="100vw"
                  className="object-cover object-center"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Discount Badge Mobile */}
          {discountPercent && discountPercent > 0 && (
            <div className="absolute left-3 top-3 z-20 pointer-events-none flex items-center gap-1 rounded-full bg-[#111111]/90 px-2.5 py-1 shadow-md backdrop-blur-md border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E50000] animate-ping" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                {discountPercent}% OFF
              </span>
            </div>
          )}

          {/* Fullscreen Expand Button Mobile */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openLightbox(currentIndex);
            }}
            aria-label="Open full screen"
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-sm backdrop-blur-md transition-all active:scale-95 dark:bg-zinc-800/90 dark:text-white"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {/* Chevrons on Mobile */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={goToPrev}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-zinc-900 shadow-sm backdrop-blur-md active:scale-90"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                aria-label="Next image"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-zinc-900 shadow-sm backdrop-blur-md active:scale-90"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Bottom Counter Pill for Mobile */}
          {hasMultiple && (
            <div className="absolute bottom-3 right-3 z-20 pointer-events-none rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-mono tracking-widest text-white backdrop-blur-md">
              {currentIndex + 1} / {normalizedImages.length}
            </div>
          )}

          {/* Interactive Pagination Indicator Dots */}
          {hasMultiple && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 pointer-events-none">
              {normalizedImages.map((_, dotIdx) => (
                <span
                  key={dotIdx}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    dotIdx === currentIndex
                      ? "w-5 bg-[#C9A86A] shadow-sm"
                      : "w-1.5 bg-white/60"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobile Horizontal Thumbnail Strip for Quick Jump */}
        {hasMultiple && (
          <div
            className="flex gap-2 overflow-x-auto py-1 px-1 scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {normalizedImages.map((img, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "relative aspect-[3/4] h-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200",
                    isActive
                      ? "border-[#1A1A1A] ring-2 ring-[#C9A86A]/40 scale-[1.03] dark:border-white"
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <Image
                    src={img.url}
                    alt={img.alt}
                    fill
                    sizes="64px"
                    className="object-cover object-center"
                  />
                  {isActive && (
                    <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-[#C9A86A]" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* CINEMATIC FULLSCREEN LIGHTBOX & PAN-ZOOM MODAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="High resolution image gallery modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[120] flex flex-col justify-between bg-black/95 text-white backdrop-blur-2xl p-4 sm:p-6 select-none"
            onClick={closeLightbox}
          >
            {/* Lightbox Top Header Toolbar */}
            <div
              className="relative z-30 flex items-center justify-between border-b border-white/10 pb-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Product Info & Image Counter */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A86A]">
                  Anchor Fashion
                </span>
                <span className="text-white/30">•</span>
                <span className="text-xs text-white/80 truncate max-w-[180px] sm:max-w-xs">
                  {productName}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-mono text-white/90">
                  {lightboxIndex + 1} of {normalizedImages.length}
                </span>
              </div>

              {/* Zoom & Action Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={lightboxZoom <= 1}
                  aria-label="Zoom out"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition-all hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset zoom"
                  className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-mono text-white/90 transition-all hover:bg-white/20"
                >
                  {Math.round(lightboxZoom * 100)}%
                </button>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={lightboxZoom >= 3}
                  aria-label="Zoom in"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition-all hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>

                {lightboxZoom > 1 && (
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Reset pan & zoom"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition-all hover:bg-white/20"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}

                <div className="h-5 w-[1px] bg-white/20 mx-1" />

                <button
                  type="button"
                  onClick={closeLightbox}
                  aria-label="Close full screen view"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-all hover:bg-white hover:text-black hover:rotate-90"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Center Stage (Draggable when zoomed) */}
            <div
              className="relative flex-1 flex items-center justify-center overflow-hidden my-4"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseDrag}
              onMouseUp={handleMouseUp}
              style={{
                cursor:
                  lightboxZoom > 1
                    ? isDragging
                      ? "grabbing"
                      : "grab"
                    : "zoom-in",
              }}
            >
              <div
                className="relative h-[80vh] w-full max-w-5xl transition-transform duration-150 ease-out"
                style={{
                  transform: `scale(${lightboxZoom}) translate(${panPosition.x / lightboxZoom}px, ${panPosition.y / lightboxZoom}px)`,
                }}
                onDoubleClick={handleToggleZoom}
              >
                {normalizedImages[lightboxIndex]?.isVideo ? (
                  <video
                    src={normalizedImages[lightboxIndex].url}
                    controls
                    autoPlay
                    loop
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Image
                    src={
                      normalizedImages[lightboxIndex]?.url ||
                      normalizedImages[0]?.url
                    }
                    alt={
                      normalizedImages[lightboxIndex]?.alt ||
                      "Full resolution product image"
                    }
                    fill
                    priority
                    sizes="100vw"
                    className="object-contain"
                    draggable={false}
                  />
                )}
              </div>

              {/* Left / Right Navigation chevrons in Lightbox */}
              {hasMultiple && (
                <>
                  <button
                    type="button"
                    onClick={handleLightboxPrev}
                    aria-label="Previous image"
                    className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white hover:text-black hover:scale-110 active:scale-95 border border-white/15"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={handleLightboxNext}
                    aria-label="Next image"
                    className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white hover:text-black hover:scale-110 active:scale-95 border border-white/15"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Bottom Filmstrip & Shortcuts Hint */}
            <div
              className="relative z-30 flex flex-col items-center gap-3 border-t border-white/10 pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Keyboard Shortcuts Hint */}
              <p className="text-[11px] text-white/50 tracking-wide hidden sm:block">
                Press <kbd className="rounded bg-white/15 px-1 py-0.5 font-mono text-[10px]">ESC</kbd> to close •{" "}
                <kbd className="rounded bg-white/15 px-1 py-0.5 font-mono text-[10px]">←</kbd>{" "}
                <kbd className="rounded bg-white/15 px-1 py-0.5 font-mono text-[10px]">→</kbd> to navigate • Double-click or <kbd className="rounded bg-white/15 px-1 py-0.5 font-mono text-[10px]">+</kbd> <kbd className="rounded bg-white/15 px-1 py-0.5 font-mono text-[10px]">-</kbd> to zoom
              </p>

              {/* Bottom Filmstrip Thumbnails */}
              {hasMultiple && (
                <div
                  className="flex items-center gap-2 max-w-full overflow-x-auto py-1 px-2 scrollbar-none"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {normalizedImages.map((img, idx) => {
                    const isActive = idx === lightboxIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setLightboxIndex(idx);
                          setLightboxZoom(1);
                          setPanPosition({ x: 0, y: 0 });
                        }}
                        className={cn(
                          "relative aspect-[3/4] h-14 sm:h-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200",
                          isActive
                            ? "border-[#C9A86A] ring-2 ring-[#C9A86A]/50 scale-105"
                            : "border-transparent opacity-40 hover:opacity-100"
                        )}
                      >
                        <Image
                          src={img.url}
                          alt={img.alt}
                          fill
                          sizes="64px"
                          className="object-cover object-center"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
