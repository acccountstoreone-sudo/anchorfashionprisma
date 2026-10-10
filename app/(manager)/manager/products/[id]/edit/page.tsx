import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/features/admin/components/products/ProductForm";
import { getAdminProductByIdAction } from "@/lib/actions/admin/products.actions";

export const metadata: Metadata = {
  title: "Edit Product | Manager Dashboard",
};

export default async function ManagerEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getAdminProductByIdAction({ id });

  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <div className="w-full">
      <ProductForm initialData={res.data} returnPath="/manager/products" />
    </div>
  );
}