import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Image as ImageIcon,
  Settings,
  PenTool,
  Globe,
  Layout,
  Activity,
  HelpCircle,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "CMS Dashboard | Enterprise Admin",
};

const cmsModules = [
  {
    id: "blogs",
    name: "Blog Posts",
    icon: FileText,
    description: "Manage editorial content and fashion guides",
    href: "/admin/cms/blogs",
  },
  {
    id: "faqs",
    name: "FAQs & Policies",
    icon: HelpCircle,
    description: "Manage store FAQ questions, shipping rates & return rules",
    href: "/admin/cms/faqs",
  },
  {
    id: "media",
    name: "Media Library",
    icon: ImageIcon,
    description: "Centralized asset and image management",
    href: "/admin/cms/media",
  },
  {
    id: "seo",
    name: "SEO & Routing",
    icon: Globe,
    description: "Meta tags, structured data, and redirects",
    href: "/admin/cms/seo",
  },
  {
    id: "banners",
    name: "Banners & Promos",
    icon: Layout,
    description: "Manage site-wide promotional banners",
    href: "/admin/cms/banners",
  },
  {
    id: "why-choose-us",
    name: "Brand Ethos & Features",
    icon: Sparkles,
    description: "Manage 'The Anchor Fashion Difference' section, badge, image & benefits",
    href: "/admin/cms/why-choose-us",
  },
];

export default async function CMSHubPage() {
  const stats = {
    published_blogs: 142,
    media_assets: 856,
    active_banners: 3,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Content Management System
          </h1>
          <p className="text-muted-foreground">
            Manage website blog articles, media assets, navigation, and SEO.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/cms/blogs/new">
            <Button>
              <PenTool className="mr-2 h-4 w-4" /> New Blog
            </Button>
          </Link>
          <Link href="/admin/cms/media">
            <Button variant="outline">
              <ImageIcon className="mr-2 h-4 w-4" /> Media Library
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Published Blogs
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published_blogs}</div>
            <p className="text-xs text-muted-foreground">+12 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media Assets</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.media_assets}</div>
            <p className="text-xs text-muted-foreground">3.2 GB total used</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Banners
            </CardTitle>
            <Layout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_banners}</div>
            <p className="text-xs text-muted-foreground">Across all regions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-1 grid gap-4 md:grid-cols-2 lg:col-span-2">
          {cmsModules.map((module) => (
            <Link key={module.id} href={module.href}>
              <Card className="group h-full cursor-pointer transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <module.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{module.name}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    <PenTool className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      New blog post published
                    </p>
                    <p className="text-xs text-muted-foreground">
                      "Summer 2026 Collection Trends"
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">2h ago</div>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <Layout className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Homepage updated</p>
                    <p className="text-xs text-muted-foreground">
                      Hero banner swapped
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">5h ago</div>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                    <Globe className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">SEO settings changed</p>
                    <p className="text-xs text-muted-foreground">
                      Updated meta description
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">1d ago</div>
              </div>
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                    <ImageIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Bulk media upload</p>
                    <p className="text-xs text-muted-foreground">
                      45 images uploaded
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">2d ago</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
