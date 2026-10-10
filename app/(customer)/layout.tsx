import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";
import { CatalogRepository } from "@/repositories/catalog.repository";
import { getStoreInfo } from "@/lib/actions/settings.actions";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CartDrawer } from "@/components/cart/cart-drawer";

import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.getSession({
    headers: await headers(),
  });
  const user = session?.user || null;

  const [categories, storeInfo] = await Promise.all([
    CatalogRepository.getCategories(),
    getStoreInfo(),
  ]);

  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-0">
      <StoreHeader
        dbCategories={categories}
        contactPhone={storeInfo.phone}
        contactEmail={storeInfo.email}
        announcementBar={storeInfo.announcement_bar}
        user={user}
      />
      <main className="w-full flex-1 bg-background">{children}</main>
      <StoreFooter />
      <MobileBottomNav user={user} />
      <CartDrawer />
    </div>
  );
}
