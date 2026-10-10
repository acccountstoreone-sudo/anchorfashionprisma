"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Heart, Search, Loader2 } from 'lucide-react';
import ProductCard from '@/components/store/ProductCard';
import CartDrawer from '@/components/store/CartDrawer';
import CheckoutModal from '@/components/store/CheckoutModal';
import WishlistModal from '@/components/store/WishlistModal';

// Define the interface for a Product to be used in this file
interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  category: string;
  image_url: string;
  is_featured?: boolean;
}

const CATEGORIES = ['All', "Men's Wear", "Women's Wear", 'Casual', 'Formal', 'Accessories', 'New Arrivals'];

export interface StoreCartItem extends Product {
  quantity: number;
}

export default function StorefrontPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Wishlist State
  const [cartItems, setCartItems] = useState<StoreCartItem[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  
  // Modals State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    // Load favorites from local storage if available
    const savedFavorites = localStorage.getItem('anchor_favorites');
    if (savedFavorites) {
      try { setFavorites(JSON.parse(savedFavorites)); } catch (e) {}
    }
  }, [activeCategory, searchQuery]);

  // Persist favorites
  useEffect(() => {
    localStorage.setItem('anchor_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/store/products', window.location.origin);
      if (activeCategory !== 'All') url.searchParams.append('category', activeCategory);
      if (searchQuery) url.searchParams.append('search', searchQuery);
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setProducts(data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, price: product.sale_price || product.price }];
    });
    setIsCartOpen(true);
  };

  const handleToggleFavorite = (product: Product) => {
    setFavorites(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#b8955e] selection:text-black">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-serif font-bold tracking-widest text-[#b8955e]">ANCHOR</h1>
            
            <div className="hidden md:flex items-center bg-[#111] rounded-full px-4 py-2 border border-[#333] focus-within:border-[#b8955e] transition-colors w-64 lg:w-96">
              <Search className="w-4 h-4 text-[#888]" />
              <input 
                type="text" 
                placeholder="Search premium fashion..." 
                className="bg-transparent border-none outline-none text-sm w-full ml-3 text-white placeholder:text-[#555]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsWishlistOpen(true)}
              className="relative p-2 text-[#888] hover:text-[#b8955e] transition-colors"
            >
              <Heart className="w-6 h-6" />
              {favorites.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-[#b8955e] text-black text-[10px] font-bold flex items-center justify-center rounded-full">
                  {favorites.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-[#888] hover:text-[#b8955e] transition-colors"
            >
              <ShoppingBag className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-[#b8955e] text-black text-[10px] font-bold flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="border-t border-[#111] overflow-x-auto hide-scrollbar">
          <div className="max-w-7xl mx-auto px-4 py-3 flex gap-6">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap text-sm font-medium uppercase tracking-wider transition-colors ${
                  activeCategory === category 
                    ? 'text-[#b8955e] border-b-2 border-[#b8955e] pb-1' 
                    : 'text-[#666] hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section (Only show on 'All' category without search) */}
        {activeCategory === 'All' && !searchQuery && (
          <div className="mb-16 relative rounded-3xl overflow-hidden h-[400px] flex items-center justify-center bg-gradient-to-r from-[#111] to-[#222] border border-[#333]">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-luminosity"></div>
            <div className="relative z-10 text-center space-y-6 max-w-2xl px-4">
              <span className="text-[#b8955e] uppercase tracking-[0.3em] text-sm font-bold">New Collection 2026</span>
              <h2 className="text-5xl font-serif text-white">Elevate Your Style</h2>
              <p className="text-[#888] text-lg">Discover the perfect blend of traditional elegance and modern luxury with our latest arrivals.</p>
              <button className="bg-[#b8955e] hover:bg-[#d4b075] text-black font-bold uppercase tracking-wider px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(184,149,94,0.3)] hover:shadow-[0_0_30px_rgba(184,149,94,0.5)]">
                Shop Now
              </button>
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-serif text-white">
            {searchQuery ? `Search Results for "${searchQuery}"` : activeCategory === 'All' ? 'Trending Now' : activeCategory}
          </h2>
          <span className="text-[#666] text-sm">{products.length} Products</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#b8955e]">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Loading luxury...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={favorites.some(f => f.id === product.id)}
                onToggleFavorite={handleToggleFavorite}
                onAddToCart={handleAddToCart}
                onQuickView={() => {}}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-[#666] border border-dashed border-[#333] rounded-2xl">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg">No products found matching your criteria.</p>
            <button 
              onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
              className="mt-4 text-[#b8955e] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={(id, qty) => setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item))}
        onRemove={(id) => setCartItems(prev => prev.filter(item => item.id !== id))}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <WishlistModal 
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        favorites={favorites}
        onRemove={handleToggleFavorite}
        onAddToCart={handleAddToCart}
        onClearAll={() => setFavorites([])}
      />

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        onOrderComplete={() => {
          setCartItems([]);
          setIsCheckoutOpen(false);
        }}
      />
    </div>
  );
}
