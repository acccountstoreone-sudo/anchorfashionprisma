"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search, Tag, Trash2, Save, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { addProductsToCategoryAction, removeProductFromCategoryAction, updateProductPricesAction } from "@/app/actions/admin/category-products.actions";
import { useAdminBreadcrumbStore } from "@/stores/useAdminBreadcrumbStore";

export function CategoryDetailsClientPage({ category, categoryProducts, allProducts }: any) {
  const router = useRouter();
  const setDynamicSegmentName = useAdminBreadcrumbStore((state) => state.setDynamicSegmentName);
  
  useEffect(() => {
    if (category?.id && category?.name) {
      setDynamicSegmentName(category.id, category.name);
    }
  }, [category, setDynamicSegmentName]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const [editingPrices, setEditingPrices] = useState<Record<string, any>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  // Filter products for modal (exclude already added ones)
  const availableProducts = allProducts.filter(
    (p: any) => !categoryProducts.some((cp: any) => cp.id === p.id)
  );

  const filteredModalProducts = availableProducts.filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleToggleProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleAddProducts = async () => {
    if (selectedProductIds.length === 0) return;
    setIsAdding(true);
    
    try {
      const res = await addProductsToCategoryAction({
        categoryId: category.id,
        productIds: selectedProductIds
      });
      
      if (res?.success) {
        toast.success(`Successfully added ${res.data?.count} products to ${category.name}`);
        setIsAddModalOpen(false);
        setSelectedProductIds([]);
        router.refresh();
      } else {
        toast.error("Failed to add products");
      }
    } catch (e) {
      toast.error("Error adding products");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!confirm("Remove this product from the category?")) return;
    
    try {
      const res = await removeProductFromCategoryAction({ categoryId: category.id, productId });
      if (res?.success) {
        toast.success("Product removed from category");
        router.refresh();
      }
    } catch (e) {
      toast.error("Failed to remove product");
    }
  };

  const handlePriceChange = (productId: string, field: string, value: string) => {
    setEditingPrices(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const handleSavePrices = async (product: any) => {
    const edits = editingPrices[product.id];
    if (!edits) return; // No changes
    
    setSavingProductId(product.id);
    
    try {
      const basePrice = edits.basePrice !== undefined ? Number(edits.basePrice) : Number(product.basePrice);
      const salePrice = edits.salePrice !== undefined ? (edits.salePrice ? Number(edits.salePrice) : null) : (product.salePrice ? Number(product.salePrice) : null);
      const costPrice = edits.costPrice !== undefined ? (edits.costPrice ? Number(edits.costPrice) : null) : (product.costPrice ? Number(product.costPrice) : null);
      
      const res = await updateProductPricesAction({
        productId: product.id,
        basePrice,
        salePrice,
        costPrice
      });
      
      if (res?.success) {
        toast.success("Prices updated successfully");
        setEditingPrices(prev => {
          const newObj = { ...prev };
          delete newObj[product.id];
          return newObj;
        });
        router.refresh();
      }
    } catch (e) {
      toast.error("Failed to update prices");
    } finally {
      setSavingProductId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/catalog/categories" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{category.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Tag className="h-3 w-3" />
              Manage products and pricing for this category
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 shadow transition-colors hover:bg-zinc-900/90"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Products
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-muted/20">
          <h2 className="font-semibold text-lg">Category Products ({categoryProducts.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">SKU</th>
                <th className="px-6 py-3 font-medium">Base Price (৳)</th>
                <th className="px-6 py-3 font-medium">Sale Price (৳)</th>
                <th className="px-6 py-3 font-medium">Cost Price (৳)</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categoryProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    No products found in this category. Click "Add Products" to add some.
                  </td>
                </tr>
              ) : (
                categoryProducts.map((product: any) => {
                  const isEditing = !!editingPrices[product.id];
                  const edits = editingPrices[product.id] || {};
                  
                  return (
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-md border bg-muted shrink-0 relative">
                            {product.imageUrl ? (
                              <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No img</div>
                            )}
                          </div>
                          <span className="font-medium text-foreground line-clamp-1">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{product.sku || 'N/A'}</td>
                      
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          className="w-24 px-2 py-1 border rounded bg-background text-sm"
                          value={edits.basePrice !== undefined ? edits.basePrice : Number(product.basePrice)}
                          onChange={(e) => handlePriceChange(product.id, 'basePrice', e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          className="w-24 px-2 py-1 border rounded bg-background text-sm"
                          placeholder="No discount"
                          value={edits.salePrice !== undefined ? edits.salePrice : (product.salePrice ? Number(product.salePrice) : "")}
                          onChange={(e) => handlePriceChange(product.id, 'salePrice', e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          className="w-24 px-2 py-1 border rounded bg-background text-sm"
                          placeholder="Optional"
                          value={edits.costPrice !== undefined ? edits.costPrice : (product.costPrice ? Number(product.costPrice) : "")}
                          onChange={(e) => handlePriceChange(product.id, 'costPrice', e.target.value)}
                        />
                      </td>
                      
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <button
                              onClick={() => handleSavePrices(product)}
                              disabled={savingProductId === product.id}
                              className="inline-flex h-8 items-center justify-center rounded-md bg-green-600 px-3 text-xs font-medium text-white shadow hover:bg-green-700 disabled:opacity-50"
                            >
                              {savingProductId === product.id ? "Saving..." : <><Save className="mr-1.5 h-3.5 w-3.5" /> Save</>}
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleRemoveProduct(product.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                            title="Remove from category"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Products Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-background rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b flex justify-between items-center bg-card">
              <h3 className="text-lg font-bold">Add Products to {category.name}</h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); setSelectedProductIds([]); }}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 border-b bg-muted/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search products by name or SKU..." 
                  className="w-full pl-9 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filteredModalProducts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No products found matching "{searchTerm}"
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredModalProducts.map((p: any) => (
                    <div 
                      key={p.id} 
                      onClick={() => handleToggleProduct(p.id)}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        selectedProductIds.includes(p.id) ? "bg-zinc-100 border-zinc-200 border" : "hover:bg-muted border border-transparent"
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedProductIds.includes(p.id)}
                        readOnly
                        className="h-4 w-4 rounded border-gray-300 text-zinc-900 focus:ring-zinc-900"
                      />
                      <div className="h-10 w-10 overflow-hidden rounded-md border bg-white shrink-0 relative">
                        {p.imageUrl && <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-card flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {selectedProductIds.length} product(s) selected
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setIsAddModalOpen(false); setSelectedProductIds([]); }}
                  className="px-4 py-2 border rounded-md hover:bg-muted text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddProducts}
                  disabled={isAdding || selectedProductIds.length === 0}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50 flex items-center text-sm font-medium"
                >
                  {isAdding ? "Adding..." : "Add to Category"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
