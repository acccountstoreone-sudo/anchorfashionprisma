import { ReactNode } from "react";
import {
  BarChart3,
  Briefcase,
  LineChart,
  Package,
  PieChart,
  Settings2,
  Users,
  Bot,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    href: "/admin/analytics/executive",
    label: "Executive Overview",
    icon: <Briefcase className="mr-2 h-4 w-4" />,
  },
  {
    href: "/admin/analytics/sales",
    label: "Sales & Revenue",
    icon: <LineChart className="mr-2 h-4 w-4" />,
  },
  {
    href: "/admin/analytics/customers",
    label: "Customers",
    icon: <Users className="mr-2 h-4 w-4" />,
  },
  {
    href: "/admin/analytics/inventory",
    label: "Inventory & Products",
    icon: <Package className="mr-2 h-4 w-4" />,
  },
  {
    href: "/admin/analytics/marketing",
    label: "Marketing",
    icon: <BarChart3 className="mr-2 h-4 w-4" />,
  },
  {
    href: "/admin/analytics/finance",
    label: "Finance",
    icon: <PieChart className="mr-2 h-4 w-4" />,
  },
  {
    href: "/admin/analytics/ai",
    label: "AI Insights",
    icon: <Bot className="mr-2 h-4 w-4" />,
  },
  {
    href: "/admin/reports/builder",
    label: "Custom Reports",
    icon: <Settings2 className="mr-2 h-4 w-4" />,
  },
];

export default function AnalyticsDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Business Intelligence
        </h1>
        <p className="text-muted-foreground">
          Enterprise reporting, analytics, and AI-driven insights.
        </p>
      </div>

      {/* Local Navigation for BI */}
      <div className="scrollbar-hide flex items-center space-x-2 overflow-x-auto border-b pb-2">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"

            className="flex-shrink-0"
          >
            <Link href={item.href}>
              {item.icon}
              {item.label}
            </Link>
          </Button>
        ))}
      </div>

      {/* Main Dashboard Content */}
      <div className="flex-1 space-y-4">{children}</div>
    </div>
  );
}
