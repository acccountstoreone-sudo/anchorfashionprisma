import { Metadata } from "next";
import { Suspense } from "react";
import { ProductForm } from "@/features/admin/components/products/ProductForm";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Add Product | Manager Dashboard",
  description: "Add a new product to the catalog.",
};

export default function AddProductPage() {
  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading product studio...</span>
          </div>
        }
      >
        <ProductForm returnPath="/manager/products" />
      </Suspense>
    </div>
  );
}

