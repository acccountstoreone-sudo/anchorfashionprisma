import React from "react";
import { Metadata } from "next";
import { FlashSaleService } from "@/lib/services/marketing/flash-sale.service";
import { ProductRepository } from "@/lib/repositories/catalog/product.repository";
import { CountdownTimer } from "@/components/marketing/CountdownTimer";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export const metadata: Metadata = {
  title: "Flash Deals | Anchor Fashion",
  description: "Exclusive limited-time flash deals on premium fashion.",
};

// Force dynamic since deals change frequently
export const dynamic = "force-dynamic";

export default async function FlashDealsPage() {
  const flashSales = await FlashSaleService.getActiveFlashSales();

  // Fetch product details for these flash sales
  const productIds = flashSales.map((fs) => fs.product_id);
  
  // We need to fetch the actual products. 
  // For simplicity, we'll fetch them individually or use a custom query.
  // Using ProductRepository if available
  const products = [];
  for (const fs of flashSales) {
    const p = await ProductRepository.getProductById(fs.product_id);
    if (p) {
      products.push({ flashSale: fs, product: p });
    }
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#b8955e] selection:text-black">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center text-center space-y-6 mb-16">
          <span className="text-red-500 font-bold tracking-[0.3em] uppercase text-sm animate-pulse">
            Live Now
          </span>
          <h1 className="text-5xl font-serif">Exclusive Flash Deals</h1>
          <p className="text-zinc-400 max-w-2xl">
            Limited time offers on our most sought-after pieces. Once the timer runs out or stock is depleted, these prices are gone forever.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800 rounded-3xl">
            <h3 className="text-2xl font-serif text-zinc-500 mb-4">No active flash deals</h3>
            <p className="text-zinc-600 text-center max-w-md">
              Check back soon for our next exclusive drop. Follow our newsletter to get early access to upcoming sales.
            </p>
            <Link href="/store" className="mt-8 px-6 py-3 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors rounded-xl uppercase tracking-wider font-bold text-sm">
              Return to Store
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map(({ flashSale, product }) => {
              const stockRemaining = flashSale.stock_allocated - flashSale.stock_sold;
              const progress = (flashSale.stock_sold / flashSale.stock_allocated) * 100;
              const isSoldOut = stockRemaining <= 0;

              return (
                <div key={flashSale.id} className="group relative bg-[#111] rounded-3xl overflow-hidden border border-zinc-800 hover:border-[#b8955e] transition-colors">
                  <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
                    {product.media && product.media.length > 0 ? (
                      <Image
                        src={product.media[0].url}
                        alt={product.name}
                        fill
                        className={`object-cover transition-transform duration-700 group-hover:scale-105 ${isSoldOut ? 'opacity-50 grayscale' : ''}`}
                      />
                    ) : product.product_media && product.product_media.length > 0 ? (
                      <Image
                        src={product.product_media[0].url}
                        alt={product.name}
                        fill
                        className={`object-cover transition-transform duration-700 group-hover:scale-105 ${isSoldOut ? 'opacity-50 grayscale' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700">No Image</div>
                    )}
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <div className="bg-red-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded shadow-lg">
                        Flash Sale
                      </div>
                      {isSoldOut && (
                        <div className="bg-black/80 backdrop-blur text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded shadow-lg">
                          Sold Out
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">{product.categoryId || 'Luxury'}</p>
                        <h3 className="text-xl font-serif group-hover:text-[#b8955e] transition-colors">{product.name}</h3>
                      </div>
                    </div>

                    <div className="flex items-end gap-3 mb-6">
                      <span className="text-3xl font-bold text-white">৳{flashSale.flash_price.toLocaleString()}</span>
                      <span className="text-lg text-zinc-500 line-through mb-1">৳{(product.salePrice || product.basePrice).toLocaleString()}</span>
                    </div>

                    {/* Timer */}
                    {!isSoldOut && (
                      <div className="mb-6 bg-black/50 rounded-xl p-4 border border-zinc-800">
                        <p className="text-xs text-zinc-400 mb-3 uppercase tracking-wider font-bold">Ends in:</p>
                        <CountdownTimer endTime={flashSale.end_time} />
                      </div>
                    )}

                    {/* Stock Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">
                        <span>Sold: {flashSale.stock_sold}</span>
                        <span>Available: {stockRemaining}</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${progress > 80 ? 'bg-red-500' : 'bg-[#b8955e]'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <Link
                      href={isSoldOut ? '#' : `/store`}
                      className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold uppercase tracking-wider transition-colors ${
                        isSoldOut 
                          ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' 
                          : 'bg-[#b8955e] hover:bg-[#d4b075] text-black shadow-[0_0_20px_rgba(184,149,94,0.2)] hover:shadow-[0_0_30px_rgba(184,149,94,0.4)]'
                      }`}
                    >
                      <ShoppingBag className="w-5 h-5" />
                      {isSoldOut ? 'Out of Stock' : 'Shop Now'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
