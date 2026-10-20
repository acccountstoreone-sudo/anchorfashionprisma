import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import robots from "@/app/robots";
import manifest from "@/app/manifest";

vi.mock("@/lib/actions/settings.actions", () => ({
  getSeoSettings: vi.fn().mockResolvedValue({
    meta_title: "Anchor Fashion | Premium E-Commerce",
    meta_description: "Enterprise e-commerce platform for Anchor Fashion.",
    keywords: "fashion, clothing, premium apparel",
    social_image: "/og-image.jpg",
  }),
}));

import { generateMetadata } from "@/app/layout";

describe("Favicon & SEO Metadata System", () => {
  const rootDir = process.cwd();

  it("should have binary favicon.ico and PNG icons in public and app directories", () => {
    const publicFavicon = path.join(rootDir, "public", "favicon.ico");
    const appFavicon = path.join(rootDir, "app", "favicon.ico");
    const appleTouchIcon = path.join(rootDir, "public", "apple-touch-icon.png");
    const favicon32 = path.join(rootDir, "public", "favicon-32x32.png");
    const favicon16 = path.join(rootDir, "public", "favicon-16x16.png");

    expect(fs.existsSync(publicFavicon)).toBe(true);
    expect(fs.statSync(publicFavicon).size).toBeGreaterThan(100);

    expect(fs.existsSync(appFavicon)).toBe(true);
    expect(fs.statSync(appFavicon).size).toBeGreaterThan(100);

    expect(fs.existsSync(appleTouchIcon)).toBe(true);
    expect(fs.existsSync(favicon32)).toBe(true);
    expect(fs.existsSync(favicon16)).toBe(true);
  });

  it("should return valid robots.txt configuration with sitemap and host", () => {
    const robotsConfig = robots();
    expect(robotsConfig.rules).toBeDefined();
    expect(robotsConfig.sitemap).toContain("/sitemap.xml");
    expect(robotsConfig.host).toBeDefined();
  });

  it("should return complete PWA Web Manifest with icon sets", () => {
    const manifestData = manifest();
    expect(manifestData.name).toContain("Anchor Fashion");
    expect(manifestData.short_name).toBe("Anchor");
    expect(manifestData.icons).toBeDefined();
    expect(manifestData.icons?.length).toBeGreaterThanOrEqual(3);

    const has192or512 = manifestData.icons?.some(
      (icon) => icon.sizes === "192x192" || icon.sizes === "512x512"
    );
    expect(has192or512).toBe(true);
  });

  it("should generate root metadata with OpenGraph, Twitter, and multi-size icon definitions", async () => {
    const meta = await generateMetadata();

    // Verify icons metadata
    expect(meta.icons).toBeDefined();
    const iconsObj = meta.icons as any;
    expect(Array.isArray(iconsObj.icon)).toBe(true);
    expect(iconsObj.icon.some((i: any) => i.url === "/favicon.ico")).toBe(true);
    expect(iconsObj.apple).toBeDefined();

    // Verify SEO essentials
    expect(meta.description).toBeDefined();
    expect(meta.alternates?.canonical).toBe("https://anchorfashion.com");
    expect(meta.openGraph?.title).toBeDefined();
    expect(meta.twitter?.card).toBe("summary_large_image");
    expect(meta.robots).toBeDefined();
  });
});
