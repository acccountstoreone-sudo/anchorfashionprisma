import { MetadataRoute } from "next";
import { CatalogRepository } from "@/repositories/catalog.repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://anchorfashion.com";

  const [productsResponse, categories] = await Promise.all([
    CatalogRepository.getProducts({ limit: 100 }), // adjust as needed
    CatalogRepository.getCategories(),
  ]);
  const products = productsResponse.data || [];

  const productUrls = products.map((product: any) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: new Date(
      product.updated_at || product.created_at || new Date()
    ),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryUrls = categories.map((category: any) => ({
    url: `${baseUrl}/categories/${category.slug}`,
    lastModified: new Date(
      category.updated_at || category.created_at || new Date()
    ),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const staticUrls = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
  ];

  return [...staticUrls, ...categoryUrls, ...productUrls];
}
