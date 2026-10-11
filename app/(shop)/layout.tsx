import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";
import { CatalogRepository } from "@/repositories/catalog.repository";
import { getStoreInfo } from "@/lib/actions/settings.actions";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { FloatingPromotion } from "@/components/marketing/floating-promotion";
import { PromotionPopupBanner } from "@/components/marketing/PromotionPopupBanner";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { PromotionRepository } from "@/lib/repositories/marketing/promotion.repository";

import { getServerSession } from "@/lib/auth/server";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getServerSession();

  const [categories, storeInfo, activePromotion] = await Promise.all([
    CatalogRepository.getCategories(),
    getStoreInfo(),
    PromotionRepository.getBestActivePromotion().catch(() => null),
  ]);

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Anchor Fashion",
    "url": "https://anchorfashion.com",
    "logo": "https://anchorfashion.com/icon.svg",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": storeInfo.phone || "+8801XXXXXXXXX",
      "contactType": "customer service"
    }
  };

  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
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
      <FloatingPromotion />
      <PromotionPopupBanner initialPromotion={activePromotion} />
      <CartDrawer />
    </div>
  );
}
