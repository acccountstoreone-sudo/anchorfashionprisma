import { Metadata } from "next";
import { ProductForm } from "@/features/admin/components/products/ProductForm";

export const metadata: Metadata = {
  title: "Create Product | Admin Dashboard",
  description: "Add a new product to your catalog.",
};

export default function CreateProductPage() {
  return (
    <div className="mx-auto max-w-5xl py-6">
      <ProductForm />
    </div>
  );
}
