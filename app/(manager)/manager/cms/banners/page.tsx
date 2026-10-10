import { getAdminHeroSlides } from "@/actions/cms.actions";
import { BannersManager } from "@/app/(admin)/admin/cms/banners/BannersManager";

export const metadata = {
  title: "Hero Banners | CMS | Manager Dashboard",
};

export const dynamic = "force-dynamic";

export default async function ManagerBannersPage() {
  const slides = await getAdminHeroSlides();

  return (
    <div className="w-full">
      <BannersManager initialSlides={slides} />
    </div>
  );
}
