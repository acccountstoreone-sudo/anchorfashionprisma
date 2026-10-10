import { redirect } from "next/navigation";

export const metadata = {
  title: "Edit Product | Anchor Fashion Enterprise",
};

/**
 * Canonical Consolidation:
 * Redirects legacy /admin/catalog/products/[id] to canonical /admin/products/[id]/edit
 */
export default async function LegacyEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/admin/products/${resolvedParams.id}/edit`);
}
