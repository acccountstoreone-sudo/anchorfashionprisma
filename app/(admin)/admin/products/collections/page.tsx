import { CollectionRepository } from "@/lib/repositories/catalog/collection.repository";
import { CollectionsClientPage } from "@/features/admin/components/catalog/CollectionsClientPage";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Collections | Catalog | Anchor Fashion Enterprise",
};

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const supabase = await createClient();

  // Fetch all collections and active available products in parallel
  const [collections, { data: products }] = await Promise.all([
    CollectionRepository.getCollections(false),
    supabase
      .from("products")
      .select("id, name, slug, base_price, product_media(url, is_primary)")
      .is("deleted_at", null)
      .neq("status", "ARCHIVED")
      .order("name", { ascending: true })
      .limit(500),
  ]);

  const formattedProducts = (products || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    base_price: p.base_price,
    image_url:
      p.product_media?.find((m: any) => m.is_primary)?.url ||
      p.product_media?.[0]?.url ||
      null,
  }));

  return (
    <CollectionsClientPage
      initialCollections={collections}
      availableProducts={formattedProducts}
    />
  );
}
