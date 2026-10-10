import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { jost } from "@/lib/fonts";
import "./globals.css";
import { GlobalProviders } from "@/providers/GlobalProviders";
import { AnalyticsProviders } from "@/components/analytics/AnalyticsProviders";

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import { getSeoSettings } from "@/lib/actions/settings.actions";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();

  const titleDefault = seo.meta_title || "Anchor Fashion | Premium E-Commerce";
  const desc = seo.meta_description || "Enterprise e-commerce platform for Anchor Fashion.";
  const image = seo.social_image || "/og-image.jpg";
  const keywordsList = seo.keywords
    ? seo.keywords.split(",").map((k) => k.trim())
    : [
        "fashion",
        "clothing",
        "ecommerce",
        "premium apparel",
        "anchor fashion",
        "bangladesh",
      ];

  return {
    title: {
      default: titleDefault,
      template: `%s | ${titleDefault.split("|")[0].trim() || "Anchor Fashion"}`,
    },
    description: desc,
    metadataBase: new URL("https://anchorfashion.com"),
    keywords: keywordsList,
    authors: [{ name: "Anchor Fashion" }],
    creator: "Anchor Fashion",
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "https://anchorfashion.com",
      title: titleDefault,
      description: desc,
      siteName: "Anchor Fashion",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: titleDefault,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description: desc,
      images: [image],
      creator: "@anchorfashion",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: "https://anchorfashion.com",
    },
    manifest: "/manifest.json",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jost.className} min-h-screen overflow-x-hidden bg-background text-foreground antialiased`}
        suppressHydrationWarning
      >
        <GlobalProviders>{children}</GlobalProviders>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Anchor Fashion",
              url: "https://anchorfashion.com",
              potentialAction: {
                "@type": "SearchAction",
                target:
                  "https://anchorfashion.com/products?search={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <Suspense fallback={null}>
          <AnalyticsProviders />
        </Suspense>
      </body>
    </html>
  );
}
