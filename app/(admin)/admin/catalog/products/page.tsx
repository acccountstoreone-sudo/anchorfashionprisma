import { redirect } from "next/navigation";

export const metadata = {
  title: "Products | Catalog | Anchor Fashion Enterprise",
};

/**
 * Canonical Consolidation:
 * Redirects legacy /admin/catalog/products route to canonical /admin/products
 * while preserving search query, page, and status filter parameters.
 */
export default async function AdminCatalogProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; search?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const searchParam = params.search || params.q || "";
  const page = params.page || "1";
  const status = params.status || "";

  const query = new URLSearchParams();
  if (searchParam) query.set("search", searchParam);
  if (page && page !== "1") query.set("page", page);
  if (status) query.set("status", status);

  const queryString = query.toString();
  redirect(`/admin/products${queryString ? `?${queryString}` : ""}`);
}
