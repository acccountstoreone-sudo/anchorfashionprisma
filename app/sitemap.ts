import { MetadataRoute } from "next";
import { CatalogRepository } from "@/repositories/catalog.repository";
import { getPosts } from "@/actions/blog.actions";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
      : "https://www.anchorfashion.com.bd";

  let products: any[] = [];
  let categories: any[] = [];
  let blogPosts: any[] = [];

  try {
    const [productsResponse, fetchedCategories, fetchedBlogs] = await Promise.race([
      Promise.all([
        CatalogRepository.getProducts({ limit: 200 }).catch(() => ({ data: [] })),
        CatalogRepository.getCategories().catch(() => []),
        getPosts("published").catch(() => []),
      ]),
      new Promise<[any, any, any]>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3500)),
    ]);
    products = productsResponse?.data || [];
    categories = fetchedCategories || [];
    blogPosts = fetchedBlogs || [];
  } catch {
    // Fallback gracefully during build step
  }

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

  const blogUrls = blogPosts.map((post: any) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(
      post.updated_at || post.published_at || new Date()
    ),
    changeFrequency: "weekly" as const,
    priority: 0.85,
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
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/collections`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
  ];

  return [...staticUrls, ...categoryUrls, ...productUrls, ...blogUrls];
}
