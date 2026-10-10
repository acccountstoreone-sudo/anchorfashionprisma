import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Instagram } from "lucide-react";
import { jost } from "@/lib/fonts";

export function SocialFeed() {
  const images = [
    {
      src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
      tag: "#AnchorStyle",
    },
    {
      src: "https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=600&q=80",
      tag: "#ModernMinimalist",
    },
    {
      src: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80",
      tag: "#EverydayLuxe",
    },
    {
      src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80",
      tag: "#AnchorFashion",
    },
  ];

  return (
    <section className="bg-white py-16 md:py-24 border-t border-zinc-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C9A86A] mb-2 block">
              Join The Community
            </span>
            <h2 className={`${jost.className} text-3xl font-light tracking-tight text-zinc-900 md:text-4xl`}>
              Follow @AnchorFashion
            </h2>
          </div>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-900 transition-colors hover:text-[#C9A86A] border-b border-black pb-1 hover:border-[#C9A86A]"
          >
            Explore Instagram Lookbook
            <ArrowRight
              className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
              strokeWidth={1.5}
            />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {images.map((item, index) => (
            <a
              key={index}
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 shadow-xs"
            >
              <Image
                src={item.src}
                alt={`Anchor Fashion Look ${index + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/50 p-4">
                <Instagram
                  className="h-7 w-7 scale-75 text-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 mb-2"
                  strokeWidth={1.5}
                />
                <span className="text-white text-xs font-semibold tracking-wider opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {item.tag}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
