"use client";

import React from 'react';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  size?: string;
  color?: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({ 
  isOpen, 
  onClose, 
  items, 
  onUpdateQuantity, 
  onRemove,
  onCheckout
}: CartDrawerProps) {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-[450px] bg-[#0f0f0f] border-l border-[#222] z-50 transform transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] flex flex-col shadow-2xl",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#222]">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <ShoppingBag className="text-[#b8955e] w-6 h-6" />
            Your Cart
            <span className="bg-[#222] text-[#888] text-sm px-2.5 py-0.5 rounded-full">
              {items.length}
            </span>
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-[#888] hover:text-white hover:bg-[#222] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#666] space-y-4">
              <ShoppingBag className="w-16 h-16 opacity-20" />
              <p>Your cart is empty.</p>
              <button 
                onClick={onClose}
                className="text-[#b8955e] hover:underline"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-4 group">
                {/* Item Image */}
                <div className="w-24 h-32 bg-[#1a1a1a] rounded-xl overflow-hidden border border-[#2a2a2a] relative">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>
                
                {/* Item Details */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-white font-medium line-clamp-2 pr-4">{item.name}</h3>
                      <button 
                        onClick={() => onRemove(item.id)}
                        className="text-[#666] hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm text-[#888] mt-1 space-x-2">
                      {item.size && <span>Size: {item.size}</span>}
                      {item.size && item.color && <span>|</span>}
                      {item.color && <span>Color: {item.color}</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    {/* Quantity Controls */}
                    <div className="flex items-center bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
                      <button 
                        onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="p-2 text-[#888] hover:text-white hover:bg-[#333] transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-white">
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="p-2 text-[#888] hover:text-white hover:bg-[#333] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {/* Price */}
                    <span className="text-white font-semibold">
                      ৳{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#222] p-6 bg-[#0a0a0a]">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-[#888]">
                <span>Subtotal</span>
                <span>৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#888] text-sm">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="pt-3 border-t border-[#222] flex justify-between text-white font-bold text-lg">
                <span>Total</span>
                <span className="text-[#b8955e]">৳{subtotal.toLocaleString()}</span>
              </div>
            </div>
            
            <button 
              onClick={() => {
                onClose();
                onCheckout();
              }}
              className="w-full bg-[#b8955e] hover:bg-[#d4b075] text-black font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(184,149,94,0.3)] hover:shadow-[0_0_30px_rgba(184,149,94,0.5)] transform hover:-translate-y-0.5"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
