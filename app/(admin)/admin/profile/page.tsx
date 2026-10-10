import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import {
  UserCheck,
  Mail,
  Shield,
  Calendar,
  CheckSquare,
  Megaphone,
  Tag,
  Headphones,
  FileText,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { ChangePassword } from "@/components/customer/ChangePassword";

export const metadata: Metadata = {
  title: "Employee Profile | Anchor Fashion Enterprise",
  description: "View your employee profile, permissions, and assigned modules.",
};

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/admin/profile");
  }

  // Fetch full profile from database
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, roles(name, description)")
    .eq("id", user.id)
    .single();

  const roleName =
    (profile?.roles as any)?.name ||
    user.user_metadata?.role ||
    user.app_metadata?.role ||
    "STAFF";

  const firstName =
    profile?.first_name || user.user_metadata?.first_name || "";
  const lastName =
    profile?.last_name || user.user_metadata?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || user.email?.split("@")[0] || "Employee";

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "EF";

  // Fetch count of active campaigns and leads if marketing
  const isMarketing = roleName === "MARKETING" || roleName === "MARKETING_MANAGER";
  
  let campaignsCount = 0;
  let leadsCount = 0;
  let couponsCount = 0;

  if (isMarketing) {
    const [campRes, leadsRes, couponsRes] = await Promise.all([
      supabase.from("campaigns").select("id", { count: "exact", head: true }),
      supabase.from("crm_leads").select("id", { count: "exact", head: true }),
      supabase.from("coupons").select("id", { count: "exact", head: true }),
    ]);
    campaignsCount = campRes.count || 0;
    leadsCount = leadsRes.count || 0;
    couponsCount = couponsRes.count || 0;
  }

  // Fetch assigned tasks if available
  const { data: assignedTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", user.id)
    .limit(5);

  const tasks = assignedTasks || [];

  return (
    <div className="space-y-6">
      {/* Profile Header Banner */}
      <Card className="border-border/60 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-white/20 bg-slate-700 text-white text-xl font-bold">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{fullName}</h1>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    Active Employee
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" />
                    Role: <strong className="text-white ml-1">{roleName}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined: {new Date(profile?.created_at || user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
              <Button variant="outline" asChild className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <Link href={isMarketing ? "/admin/marketing" : "/admin"}>
                  Go to Dashboard <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role-Specific Metric Overview */}
      {isMarketing && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Marketing Campaigns</CardTitle>
              <Megaphone className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaignsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {campaignsCount === 0 ? "No active campaigns created yet" : "Managed across platforms"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">CRM Leads</CardTitle>
              <Headphones className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {leadsCount === 0 ? "No incoming leads found" : "Total prospective customer leads"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Coupons</CardTitle>
              <Tag className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{couponsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {couponsCount === 0 ? "No promotional coupons running" : "Discount & promotion codes"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Marketing & Staff Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Assigned Modules & Tools
            </CardTitle>
            <CardDescription>
              Quick shortcuts to your primary workplace tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button variant="outline" asChild className="justify-start h-auto py-3 px-4">
                <Link href="/admin/marketing/campaigns">
                  <Megaphone className="h-4 w-4 mr-3 text-indigo-500" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">Campaigns</div>
                    <div className="text-xs text-muted-foreground">Manage promotions</div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" asChild className="justify-start h-auto py-3 px-4">
                <Link href="/admin/crm/leads">
                  <Headphones className="h-4 w-4 mr-3 text-emerald-500" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">Leads</div>
                    <div className="text-xs text-muted-foreground">Prospect pipelines</div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" asChild className="justify-start h-auto py-3 px-4">
                <Link href="/admin/marketing/coupons">
                  <Tag className="h-4 w-4 mr-3 text-orange-500" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">Coupons</div>
                    <div className="text-xs text-muted-foreground">Discounts & codes</div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" asChild className="justify-start h-auto py-3 px-4">
                <Link href="/admin/cms/banners">
                  <FileText className="h-4 w-4 mr-3 text-blue-500" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">Hero Banners</div>
                    <div className="text-xs text-muted-foreground">Storefront visuals</div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" asChild className="justify-start h-auto py-3 px-4">
                <Link href="/admin/crm/messages">
                  <Mail className="h-4 w-4 mr-3 text-rose-500" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">Messages</div>
                    <div className="text-xs text-muted-foreground">Customer communication</div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" asChild className="justify-start h-auto py-3 px-4">
                <Link href="/admin/tasks">
                  <CheckSquare className="h-4 w-4 mr-3 text-purple-500" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">My Tasks</div>
                    <div className="text-xs text-muted-foreground">Assigned duties</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Tasks Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  Assigned Tasks
                </CardTitle>
                <CardDescription>
                  Tasks specifically assigned to you.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/tasks">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <CheckSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="font-medium text-foreground">No tasks assigned yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You are all caught up on your assigned duties.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tasks.map((task: any) => (
                  <div key={task.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No deadline"}</p>
                    </div>
                    <Badge variant={task.status === "COMPLETED" ? "default" : "secondary"}>
                      {task.status || "PENDING"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Security / Change Password */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          Account Security & Credentials
        </h2>
        <ChangePassword />
      </div>
    </div>
  );
}
