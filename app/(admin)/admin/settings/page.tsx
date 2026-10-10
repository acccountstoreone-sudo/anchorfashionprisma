import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building,
  Globe,
  CreditCard,
  Truck,
  Mail,
  ShieldCheck,
  Layout,
  ChevronRight,
  Store,
  Activity,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Business Settings | Anchor Fashion",
  description: "Enterprise Configuration",
};

const settingsSections = [
  {
    title: "General Store Info",
    description:
      "Store name, phone, email, address, announcement bar, and social links.",
    href: "/admin/settings/general",
    icon: Building,
    badge: "Live",
  },
  {
    title: "Store Settings",
    description: "Configure your store's basic information and localization.",
    href: "/admin/settings/store",
    icon: Store,
  },
  {
    title: "Payment Gateways",
    description:
      "Configure bKash, SSLCommerz credentials and enable/disable payment methods.",
    href: "/admin/settings/payment",
    icon: CreditCard,
    badge: "Live",
  },
  {
    title: "Website & SEO",
    description: "Manage meta tags, structured data, sitemaps, and redirects.",
    href: "/admin/settings/seo",
    icon: Globe,
  },
  {
    title: "Courier Integration",
    description: "Configure Pathao, Steadfast, and other shipping providers.",
    href: "/admin/shipping",
    icon: Truck,
  },
  {
    title: "Email Configuration",
    description:
      "Resend API key, email templates, and notification preferences.",
    href: "/admin/settings/email",
    icon: Mail,
  },
  {
    title: "Security Policies",
    description: "Password policies, login audit logs, and session management.",
    href: "/admin/settings/security",
    icon: ShieldCheck,
  },
  {
    title: "Analytics & Tracking",
    description: "Integrate third-party tracking and analytics tools.",
    href: "/admin/settings/analytics",
    icon: Activity,
  },
  {
    title: "Hero Banners & CMS",
    description: "Manage homepage hero slides, promotions and content pages.",
    href: "/admin/cms/banners",
    icon: Layout,
    badge: "Live",
  },
];

export default function BusinessSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Business Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage global enterprise configuration and integrations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="group h-full cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="mb-3 rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <section.icon className="h-5 w-5" />
                  </div>
                  {section.badge && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                      {section.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <CardDescription className="text-sm">
                  {section.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
