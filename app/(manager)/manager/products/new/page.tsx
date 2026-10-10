import { Metadata } from "next";
import { ProductForm } from "@/features/admin/components/products/ProductForm";

export const metadata: Metadata = {
  title: "Add Product | Manager Dashboard",
  description: "Add a new product to the catalog.",
};

export default function AddProductPage() {
  return (
    <div className="w-full">
      <ProductForm returnPath="/manager/products" />
    </div>
  );
}

