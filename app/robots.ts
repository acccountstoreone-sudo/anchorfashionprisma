import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://anchorfashion.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/auth/",
        "/account/",
        "/dashboard/",
        "/manager/",
        "/inventory/",
        "/cms/",
        "/crm/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
