import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LayoutTemplate,
  FileText,
  Image as ImageIcon,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CMS | Manager Dashboard",
};

export default function CMSPage() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Content Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your storefront content, blogs, and media.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="transition-colors hover:border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <LayoutTemplate className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Storefront Pages</CardTitle>
                <CardDescription>
                  Manage homepage banners, sections, and static pages.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/manager/cms/banners">
                  Banners & Hero
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/manager/cms/why-choose-us">
                  Brand Ethos
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/manager/cms/blogs">
                  Static Pages
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 dark:bg-indigo-950/60 p-2 text-indigo-600 dark:text-indigo-400">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Blog & Articles</CardTitle>
                <CardDescription>
                  Publish SEO-optimized articles and fashion guides.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/manager/cms/blogs">
                  Manage Posts
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/manager/cms/blogs">
                  Categories
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-pink-100 dark:bg-pink-950/60 p-2 text-pink-600 dark:text-pink-400">
                <ImageIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Media Library</CardTitle>
                <CardDescription>
                  Manage product images, banners, and digital assets.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/manager/cms/media">
                Open Media Manager
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 dark:bg-green-950/60 p-2 text-green-600 dark:text-green-400">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>FAQs & Policies</CardTitle>
                <CardDescription>
                  Update shipping policies, return rules, and FAQs.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/manager/cms/faqs">
                  Edit FAQs
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/manager/cms/policies">
                  Store Policies
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
