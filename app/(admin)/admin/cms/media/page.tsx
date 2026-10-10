import React from "react";
import { getMedia } from "@/actions/cms.actions";
import { MediaLibraryView } from "@/components/cms/MediaLibraryView";

export const metadata = {
  title: "Media Library | CMS",
  description: "Manage digital assets, product images, and documents.",
};

export const dynamic = "force-dynamic";

export default async function MediaLibraryPage() {
  const media = await getMedia();

  return <MediaLibraryView initialMedia={media} />;
}
