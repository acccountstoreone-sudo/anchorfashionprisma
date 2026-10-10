"use client";

import React, { useState } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const checkoutModalSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid 11-digit phone number (e.g. 01XXXXXXXXX)"),
  address: z.string().trim().min(5, "Please provide your detailed delivery address"),
  city: z.enum(["Dhaka", "Outside Dhaka"]),
  paymentMethod: z.enum(["COD", "bKash"]),
  createAccount: z.boolean().default(false),
  password: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.createAccount && (!data.password || data.password.length < 6)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Password must be at least 6 characters to create an account",
      path: ["password"],
    });
  }
});

type CheckoutModalValues = z.infer<typeof checkoutModalSchema>;

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderComplete: (orderData: any) => void;
}

export default function CheckoutModal({ isOpen, onClose, items, onOrderComplete }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<CheckoutModalValues>({
    resolver: zodResolver(checkoutModalSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      address: '',
      city: 'Dhaka',
      paymentMethod: 'COD',
      createAccount: false,
      password: '',
    },
    mode: "onTouched",
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;

  const selectedCity = watch('city');
  const selectedPaymentMethod = watch('paymentMethod');
  const createAccountChecked = watch('createAccount');

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = selectedCity === 'Dhaka' ? 80 : 150;
  const total = subtotal + deliveryFee;

  const onSubmit = async (values: CheckoutModalValues) => {
    setLoading(true);

    try {
      const orderPayload = {
        customer_name: values.fullName,
        customer_phone: values.phone,
        delivery_address: values.address,
        city: values.city,
        payment_method: values.paymentMethod,
        total_amount: total,
        delivery_fee: deliveryFee,
        items: items,
      };

      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onOrderComplete(data.order);
          setSuccess(false);
          form.reset();
        }, 2000);
      } else {
        toast.error(data.error || 'Failed to place order');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while placing your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl relative my-auto">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-[#888] hover:text-white rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle className="w-20 h-20 text-green-500 mb-6 animate-bounce" />
            <h2 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h2>
            <p className="text-[#888]">Thank you for shopping with Anchor Fashion.</p>
          </div>
        ) : (
          <>
            {/* Left: Form */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              <h2 className="text-2xl font-bold text-white mb-6 font-serif">Checkout</h2>
              
              <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Contact & Shipping */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[#b8955e] border-b border-[#222] pb-2">Shipping Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#888] mb-1">Full Name *</label>
                      <input
                        type="text"
                        {...register('fullName')}
                        className={cn(
                          "w-full bg-[#1a1a1a] border rounded-lg p-3 text-white focus:outline-none transition-colors",
                          errors.fullName ? "border-rose-500 focus:border-rose-500" : "border-[#333] focus:border-[#b8955e]"
                        )}
                        placeholder="John Doe"
                      />
                      {errors.fullName && (
                        <p className="text-xs text-rose-400 mt-1">{errors.fullName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-[#888] mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        {...register('phone')}
                        className={cn(
                          "w-full bg-[#1a1a1a] border rounded-lg p-3 text-white focus:outline-none transition-colors",
                          errors.phone ? "border-rose-500 focus:border-rose-500" : "border-[#333] focus:border-[#b8955e]"
                        )}
                        placeholder="01XXXXXXXXX"
                      />
                      {errors.phone && (
                        <p className="text-xs text-rose-400 mt-1">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-[#888] mb-1">District / City *</label>
                    <select
                      {...register('city')}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white focus:border-[#b8955e] focus:outline-none transition-colors appearance-none"
                    >
                      <option value="Dhaka">Inside Dhaka (৳80)</option>
                      <option value="Outside Dhaka">Outside Dhaka (৳150)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-[#888] mb-1">Full Delivery Address *</label>
                    <textarea
                      {...register('address')}
                      rows={3}
                      className={cn(
                        "w-full bg-[#1a1a1a] border rounded-lg p-3 text-white focus:outline-none transition-colors resize-none",
                        errors.address ? "border-rose-500 focus:border-rose-500" : "border-[#333] focus:border-[#b8955e]"
                      )}
                      placeholder="House No, Road No, Area"
                    />
                    {errors.address && (
                      <p className="text-xs text-rose-400 mt-1">{errors.address.message}</p>
                    )}
                  </div>
                </div>

                {/* Account Creation (Optional) */}
                <div className="bg-[#1a1a1a]/50 p-4 rounded-xl border border-[#333]">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('createAccount')}
                      className="w-5 h-5 rounded border-[#444] bg-[#222] checked:bg-[#b8955e] text-[#b8955e] focus:ring-0 focus:ring-offset-0 transition-colors"
                    />
                    <span className="text-white font-medium">Save details & create an account</span>
                  </label>
                  
                  {createAccountChecked && (
                    <div className="mt-4 animate-in slide-in-from-top-2">
                      <label className="block text-sm text-[#888] mb-1">Set a Password</label>
                      <input
                        type="password"
                        {...register('password')}
                        className={cn(
                          "w-full bg-[#222] border rounded-lg p-3 text-white focus:outline-none transition-colors",
                          errors.password ? "border-rose-500 focus:border-rose-500" : "border-[#444] focus:border-[#b8955e]"
                        )}
                        placeholder="••••••••"
                      />
                      {errors.password && (
                        <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>
                      )}
                      <p className="text-xs text-[#666] mt-2">You can use your phone number and this password to track your order later.</p>
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[#b8955e] border-b border-[#222] pb-2">Payment Method</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {(['COD', 'bKash'] as const).map(method => (
                      <label
                        key={method}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all",
                          selectedPaymentMethod === method ? "border-[#b8955e] bg-[#b8955e]/10" : "border-[#333] bg-[#1a1a1a] hover:border-[#555]"
                        )}
                        onClick={() => setValue('paymentMethod', method, { shouldValidate: true })}
                      >
                        <input
                          type="radio"
                          value={method}
                          {...register('paymentMethod')}
                          className="sr-only"
                        />
                        <span className="text-white font-bold">{method === 'COD' ? 'Cash on Delivery' : method}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* Right: Order Summary */}
            <div className="w-full md:w-1/3 bg-[#111] p-8 border-t md:border-t-0 md:border-l border-[#222] flex flex-col">
              <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>
              
              <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-4 custom-scrollbar max-h-60 md:max-h-full">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-start text-sm">
                    <div className="flex-1 pr-4">
                      <p className="text-white line-clamp-2">{item.name}</p>
                      <p className="text-[#666]">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-white font-medium whitespace-nowrap">৳{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#333] pt-4 space-y-3 mt-auto">
                <div className="flex justify-between text-[#888]">
                  <span>Subtotal</span>
                  <span>৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#888]">
                  <span>Delivery Fee</span>
                  <span>৳{deliveryFee.toLocaleString()}</span>
                </div>
                <div className="pt-4 border-t border-[#333] flex justify-between text-xl font-bold text-white">
                  <span>Total</span>
                  <span className="text-[#b8955e]">৳{total.toLocaleString()}</span>
                </div>

                <button 
                  type="submit" form="checkout-form" disabled={loading || items.length === 0}
                  className="w-full mt-6 bg-[#b8955e] hover:bg-[#d4b075] text-black font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(184,149,94,0.2)]"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : `Place Order - ৳${total.toLocaleString()}`}
                </button>
                <p className="text-center text-xs text-[#666] mt-4 flex items-center justify-center gap-1">
                  🔒 Secure Encrypted Checkout
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
