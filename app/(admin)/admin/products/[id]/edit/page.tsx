import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/features/admin/components/products/ProductForm";
import { getAdminProductByIdAction } from "@/lib/actions/admin/products.actions";

export const metadata: Metadata = {
  title: "Edit Product | Admin Dashboard",
  description: "Edit an existing product in your catalog.",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const res = await getAdminProductByIdAction({ id: resolvedParams.id });

  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl py-6">
      <ProductForm initialData={res.data} />
    </div>
  );
}
