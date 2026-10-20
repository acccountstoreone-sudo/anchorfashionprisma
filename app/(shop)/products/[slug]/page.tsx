import { Metadata } from "next";
import { CatalogService } from "@/lib/services/catalog.service";
import { ReviewRepository } from "@/lib/repositories/catalog/review.repository";
import { FlashSaleService } from "@/lib/services/marketing/flash-sale.service";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { notFound } from "next/navigation";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const product = await CatalogService.getProductBySlug(resolvedParams.slug);

  if (!product) {
    return {
      title: "Product Not Found | Anchor Fashion",
    };
  }

  const title = product.seo_title || `${product.name} | Anchor Fashion`;
  const description =
    product.seo_description ||
    product.description?.substring(0, 160) ||
    `Shop ${product.name} at Anchor Fashion. Premium luxury fashion & modern apparel.`;
  const ogImage = product.product_media?.[0]?.url || "/og-image.jpg";

  return {
    title,
    description,
    alternates: {
      canonical: `https://anchorfashion.com/products/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://anchorfashion.com/products/${product.slug}`,
      siteName: "Anchor Fashion",
      images: [
        {
          url: ogImage,
          width: 800,
          height: 1000,
          alt: product.name,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const product = await CatalogService.getProductBySlug(resolvedParams.slug);

  if (!product) {
    notFound();
  }

  // 1. Fetch active flash sale for product
  const flashSale = await FlashSaleService.getFlashSaleForProduct(product.id);

  // 2. Fetch related products
  let relatedProducts: any[] = [];
  if (product.categories?.slug) {
    const { data } = await CatalogService.getProducts({
      category: product.categories.slug,
      limit: 5,
    });
    relatedProducts = (data || []).filter((p: any) => p.id !== product.id);
  }
  if (relatedProducts.length === 0) {
    const featured = await CatalogService.getFeaturedProducts(5);
    relatedProducts = (featured || []).filter((p: any) => p.id !== product.id);
  }

  // 3. Fetch real reviews
  const reviews = await ReviewRepository.getReviewsByProductId(product.id);

  // 4. Build JSON-LD structured schema
  const isInStock = (product as any).is_in_stock ?? false;
  const images =
    product.product_media?.map((m: any) => m.url) || ["/images/placeholder.webp"];

  const effectivePrice =
    flashSale?.flash_price ?? product.sale_price ?? product.base_price;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images,
    description:
      product.description || "Buy premium luxury wear from Anchor Fashion.",
    sku: product.sku || undefined,
    brand: {
      "@type": "Brand",
      name: (product as any).brands?.name || "Anchor Fashion",
    },
    offers: {
      "@type": "Offer",
      url: `https://anchorfashion.com/products/${product.slug}`,
      priceCurrency: "BDT",
      price: effectivePrice,
      itemCondition: "https://schema.org/NewCondition",
      availability: isInStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://anchorfashion.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: "https://anchorfashion.com/products",
      },
      ...(product.categories?.name
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: product.categories.name,
              item: `https://anchorfashion.com/categories/${product.categories.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: product.categories?.name ? 4 : 3,
        name: product.name,
        item: `https://anchorfashion.com/products/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <ProductDetailView
        product={product}
        flashSale={flashSale}
        reviews={reviews}
        relatedProducts={relatedProducts}
      />
    </>
  );
}
