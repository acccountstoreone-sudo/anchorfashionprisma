"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  category: string;
  image_url: string;
  is_featured?: boolean;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onQuickView: (product: Product) => void;
  isFavorite: boolean;
  onToggleFavorite: (product: Product) => void;
}

export default function ProductCard({ 
  product, 
  onAddToCart, 
  onQuickView,
  isFavorite,
  onToggleFavorite
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="group relative bg-[#0a0a0a] rounded-2xl overflow-hidden border border-[#2a2a2a] transition-all duration-500 hover:border-[#b8955e] hover:shadow-[0_0_30px_rgba(184,149,94,0.15)] flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Badges */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {product.is_featured && (
          <span className="bg-[#b8955e] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
            Featured
          </span>
        )}
        {product.sale_price && (
          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
            Sale
          </span>
        )}
      </div>

      {/* Favorite Button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(product);
        }}
        className={cn(
          "absolute top-4 right-4 z-10 p-2.5 rounded-full backdrop-blur-md transition-all duration-300",
          isFavorite 
            ? "bg-[#b8955e]/20 text-[#b8955e]" 
            : "bg-black/40 text-white/70 hover:bg-[#b8955e]/20 hover:text-[#b8955e]"
        )}
      >
        <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
      </button>

      {/* Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#111]">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className={cn(
              "object-cover w-full h-full transition-transform duration-700 ease-out",
              isHovered && "scale-110"
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#444]">
            No Image
          </div>
        )}
        
        {/* Quick Actions Overlay */}
        <div className={cn(
          "absolute inset-x-0 bottom-0 p-4 flex gap-2 translate-y-full opacity-0 transition-all duration-300 ease-out",
          isHovered && "translate-y-0 opacity-100 bg-gradient-to-t from-black/80 to-transparent"
        )}>
          <button 
            onClick={() => onQuickView(product)}
            className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" /> Quick View
          </button>
          <button 
            onClick={() => onAddToCart(product)}
            className="flex-1 bg-[#b8955e] hover:bg-[#d4b075] text-black py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-5 flex flex-col flex-grow">
        <span className="text-[#888] text-xs font-semibold uppercase tracking-widest mb-2">
          {product.category}
        </span>
        <h3 className="text-white font-medium text-lg leading-tight mb-3 line-clamp-2 hover:text-[#b8955e] transition-colors cursor-pointer">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center gap-3">
          {product.sale_price ? (
            <>
              <span className="text-[#b8955e] font-bold text-xl">৳{product.sale_price.toLocaleString()}</span>
              <span className="text-[#666] line-through text-sm">৳{product.price.toLocaleString()}</span>
            </>
          ) : (
            <span className="text-white font-bold text-xl">৳{product.price.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
