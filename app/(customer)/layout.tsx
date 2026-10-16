import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";
import { CatalogRepository } from "@/repositories/catalog.repository";
import { getStoreInfo } from "@/lib/actions/settings.actions";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CartDrawer } from "@/components/cart/cart-drawer";

import { getServerSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getServerSession();

  const [categories, storeInfo] = await Promise.all([
    CatalogRepository.getCategories().catch(() => []),
    getStoreInfo().catch(() => ({
      store_name: "Anchor Fashion Enterprise",
      store_description: "",
      phone: "+880 1711-223344",
      email: "support@anchorfashion.com",
      address: "Dhaka, Bangladesh",
      announcement_bar: "🚚 Free Shipping On Orders Over ৳999 | Easy Returns & Exchanges",
      free_shipping_threshold: "999",
    })),
  ]);

  const safeStoreInfo = storeInfo || {
    store_name: "Anchor Fashion Enterprise",
    store_description: "",
    phone: "+880 1711-223344",
    email: "support@anchorfashion.com",
    address: "Dhaka, Bangladesh",
    announcement_bar: "🚚 Free Shipping On Orders Over ৳999 | Easy Returns & Exchanges",
    free_shipping_threshold: "999",
  };

  const safeUser = user ? JSON.parse(JSON.stringify(user)) : null;
  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-0">
      <StoreHeader
        dbCategories={safeCategories}
        contactPhone={safeStoreInfo.phone}
        contactEmail={safeStoreInfo.email}
        announcementBar={safeStoreInfo.announcement_bar}
        user={safeUser}
      />
      <main className="w-full flex-1 bg-background">{children}</main>
      <StoreFooter />
      <MobileBottomNav user={safeUser} />
      <CartDrawer />
    </div>
  );
}
