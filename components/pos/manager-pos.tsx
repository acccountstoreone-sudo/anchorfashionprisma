"use client";

import { useState, useCallback } from "react";
import { posSearchCustomersAction, posSearchProductsAction, placePosOrderAction } from "@/app/actions/oms/pos.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Minus, Trash2, Search, CheckCircle } from "lucide-react";

export function ManagerPOS({ branchId }: { branchId: string }) {
  // Customer State
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Product State
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  // Cart State
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentStatus, setPaymentStatus] = useState("PAID");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<any>(null);

  // --- Customer Handlers ---
  const handleCustomerSearch = async () => {
    setIsSearchingCustomer(true);
    const res = await posSearchCustomersAction(customerQuery);
    if (res.success && res.data) {
      setCustomers(res.data);
    }
    setIsSearchingCustomer(false);
  };

  // --- Product Handlers ---
  const handleProductSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setProductQuery(q);
    if (q.length > 2) {
      setIsSearchingProduct(true);
      const res = await posSearchProductsAction(q);
      if (res.success && res.data) {
        setProducts(res.data);
      }
      setIsSearchingProduct(false);
    } else {
      setProducts([]);
    }
  };

  const addToCart = (productOrVariant: any) => {
    setCartItems(prev => {
      const isVariant = !!productOrVariant.sku;
      const vId = isVariant ? productOrVariant.id : null;
      const pId = isVariant ? productOrVariant.product.id : productOrVariant.id;
      
      const existing = prev.find(item => item.variantId === vId && item.productId === pId);
      if (existing) {
        return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      
      const price = productOrVariant.sale_price || productOrVariant.price;
      const name = isVariant ? `${productOrVariant.product.title} - ${productOrVariant.sku}` : productOrVariant.title;

      return [...prev, {
        id: Math.random().toString(),
        productId: pId,
        variantId: vId,
        name,
        price,
        quantity: 1,
        stock: productOrVariant.stock_quantity || 0
      }];
    });
    setProductQuery("");
    setProducts([]);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  // --- Calculations ---
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.15;
  const grandTotal = Math.max(0, subtotal + tax + shippingFee - manualDiscount);

  // --- Submission ---
  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) return setError("Cart is empty.");
    if (!branchId) return setError("Branch ID is missing.");
    
    setIsSubmitting(true);
    setError(null);
    
    const payload = {
      customerId: selectedCustomer?.id || null,
      branchId,
      items: cartItems.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price
      })),
      manualDiscount,
      paymentMethod,
      paymentStatus,
      shippingFee,
    };

    const res = await placePosOrderAction(payload);
    if (res.success) {
      setSuccessOrder(res.data);
      setCartItems([]);
    } else {
      setError(res.error);
    }
    setIsSubmitting(false);
  };

  if (successOrder) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center border rounded-lg bg-green-50 shadow">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Order Created Successfully</h2>
        <p className="text-gray-600 mb-6">Order Number: <strong>{successOrder.order_number}</strong></p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => window.open(`/manager/orders/${successOrder.id}/invoice`, '_blank')}>Print Invoice</Button>
          <Button onClick={() => { setSuccessOrder(null); setSelectedCustomer(null); }}>New Order</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-100px)]">
      {/* Left Pane: Customer & Product Search */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
        <div className="bg-white p-4 border rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Customer Lookup</h2>
          {!selectedCustomer ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Search registered customer by phone, email, or name..." 
                  value={customerQuery}
                  onChange={e => setCustomerQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCustomerSearch()}
                />
                <Button onClick={handleCustomerSearch} disabled={isSearchingCustomer}>
                  {isSearchingCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              {customers.length > 0 && (
                <div className="border rounded divide-y mt-2">
                  {customers.map(c => (
                    <div key={c.id} className="p-2 flex justify-between items-center hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                      <div>
                        <p className="font-medium">{c.first_name} {c.last_name}</p>
                        <p className="text-sm text-gray-500">{c.phone}</p>
                      </div>
                      <Button size="sm" variant="ghost">Select</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center p-3 bg-blue-50 text-blue-800 rounded border border-blue-200">
              <div>
                <p className="font-bold">{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                <p className="text-sm">{selectedCustomer.phone}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelectedCustomer(null)}>Change</Button>
            </div>
          )}
        </div>

        <div className="bg-white p-4 border rounded-lg shadow-sm flex-1">
          <h2 className="text-lg font-semibold mb-4">Product Search</h2>
          <div className="relative">
            <Input 
              placeholder="Scan Barcode, enter SKU or Product Name..." 
              value={productQuery}
              onChange={handleProductSearch}
            />
            {isSearchingProduct && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-gray-400" />}
          </div>
          
          {products.length > 0 && (
            <div className="mt-4 border rounded divide-y max-h-[400px] overflow-y-auto">
              {products.map(p => (
                <div key={p.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex gap-3 items-center">
                    {p.product?.main_image_url && <img src={p.product.main_image_url} alt="" className="w-10 h-10 object-cover rounded" />}
                    <div>
                      <p className="font-medium">{p.product ? p.product.title : p.title}</p>
                      {p.sku && <p className="text-xs text-gray-500">SKU: {p.sku} | Stock: {p.stock_quantity}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold">৳{p.sale_price || p.price}</p>
                    <Button size="sm" onClick={() => addToCart(p)}>Add</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Cart & Payment */}
      <div className="w-[450px] bg-white border rounded-lg shadow-sm flex flex-col">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold">Current Order</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cartItems.length === 0 ? (
            <p className="text-gray-400 text-center py-10">Cart is empty</p>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="flex justify-between items-start border-b pb-3">
                <div className="flex-1 pr-2">
                  <p className="font-medium line-clamp-2 text-sm">{item.name}</p>
                  <p className="text-gray-500 text-xs">৳{item.price} x {item.quantity}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-bold">৳{item.price * item.quantity}</p>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}><Minus className="w-3 h-3" /></Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}><Plus className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 ml-1" onClick={() => removeItem(item.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t space-y-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>৳{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span>Shipping</span>
            <Input type="number" className="w-24 h-7 text-right" value={shippingFee} onChange={e => setShippingFee(Number(e.target.value) || 0)} />
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax (15%)</span>
            <span>৳{tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm items-center text-red-600">
            <span>Discount</span>
            <Input type="number" className="w-24 h-7 text-right" value={manualDiscount} onChange={e => setManualDiscount(Number(e.target.value) || 0)} />
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span>৳{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-4 border-t space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Method</Label>
              <select className="w-full border rounded p-2 text-sm" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="COD">COD</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="POS">Card / POS</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <select className="w-full border rounded p-2 text-sm" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-200">{error}</div>}

          <Button 
            className="w-full h-12 text-lg font-bold" 
            onClick={handleSubmitOrder}
            disabled={isSubmitting || cartItems.length === 0}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `CREATE ORDER - ৳${grandTotal.toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
