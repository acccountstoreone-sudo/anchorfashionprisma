"use client";

import React from 'react';
import { X, Heart, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductCard from './ProductCard';

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  category: string;
  image_url: string;
}

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: Product[];
  onRemove: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onClearAll: () => void;
}

export default function WishlistModal({ 
  isOpen, 
  onClose, 
  favorites, 
  onRemove,
  onAddToCart,
  onClearAll
}: WishlistModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#222]">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Heart className="text-red-500 w-6 h-6 fill-red-500" />
            Your Wishlist
            <span className="bg-[#222] text-[#888] text-sm px-3 py-1 rounded-full">
              {favorites.length} items
            </span>
          </h2>
          <div className="flex items-center gap-4">
            {favorites.length > 0 && (
              <button 
                onClick={onClearAll}
                className="text-sm text-[#888] hover:text-white underline transition-colors"
              >
                Clear All
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-[#888] hover:text-white hover:bg-[#222] rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#666] space-y-4">
              <Heart className="w-16 h-16 opacity-20" />
              <p className="text-lg">Your wishlist is empty.</p>
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-[#1a1a1a] hover:bg-[#222] text-white rounded-xl transition-colors border border-[#333]"
              >
                Discover Products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {favorites.map(product => (
                <div key={product.id} className="relative group">
                  <ProductCard 
                    product={product}
                    isFavorite={true}
                    onToggleFavorite={() => onRemove(product)}
                    onAddToCart={onAddToCart}
                    onQuickView={() => {}} // Disabled in wishlist for simplicity
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
