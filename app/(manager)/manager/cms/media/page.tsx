import React from "react";
import { Metadata } from "next";
import { getMedia } from "@/actions/cms.actions";
import { MediaLibraryView } from "@/components/cms/MediaLibraryView";

export const metadata: Metadata = {
  title: "Media Library | CMS | Manager Dashboard",
  description: "Manage digital assets, product images, and documents.",
};

export const dynamic = "force-dynamic";

export default async function ManagerMediaPage() {
  const media = await getMedia();

  return (
    <div className="w-full">
      <MediaLibraryView initialMedia={media} />
    </div>
  );
}
