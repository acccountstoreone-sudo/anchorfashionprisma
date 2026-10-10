import { redirect } from "next/navigation";

export const metadata = {
  title: "Create Product | Anchor Fashion Enterprise",
};

/**
 * Canonical Consolidation:
 * Redirects legacy /admin/catalog/products/new to the canonical
 * full-featured /admin/products/new creation flow with variants, media uploads, and taxonomy.
 */
export default function LegacyNewProductPage() {
  redirect("/admin/products/new");
}
