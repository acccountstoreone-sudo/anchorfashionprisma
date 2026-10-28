import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ShoppingBag,
  MessageSquare,
  Trophy,
  Activity,
} from "lucide-react";
import { fetchCustomerDetailsAction } from "@/app/actions/crm/customer.actions";
import { getCustomerPasswordAction } from "@/app/actions/crm/customer-admin.actions";
import { CustomerActionButtons } from "./CustomerActionButtons";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const customerId = (await params).id;
  const [{ success, data, error }, passwordRes] = await Promise.all([
    fetchCustomerDetailsAction(customerId),
    getCustomerPasswordAction(customerId),
  ]);

  if (!success || !data) {
    return (
      <div className="p-8 text-red-500">
        Error loading customer details: {error}
      </div>
    );
  }

  const { profile, ticketsCount, tier, points, ltv, segments, totalOrders } = data;
  const customer = {
    name: profile.first_name
      ? `${profile.first_name} ${profile.last_name || ""}`
      : "Unknown Customer",
    email: profile.email,
    phone: profile.phone || "No phone",
    avatar:
      profile.avatar_url ||
      `https://ui-avatars.com/api/?name=${profile.first_name || "User"}`,
    tier,
    points,
    ltv,
    joinDate: new Date(profile.created_at).toLocaleDateString(),
    segments,
    totalOrders,
  };

  return (
    <div className="space-y-6">
      {/* Header Profile Section */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-lg border bg-card p-6 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-4 border-background shadow-sm">
            <AvatarImage src={customer.avatar} />
            <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{customer.email}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{customer.phone}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <Badge variant="secondary">{customer.tier} Tier</Badge>
              {customer.segments.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <CustomerActionButtons
          customerId={customerId}
          initialPoints={customer.points}
          initialData={{
            firstName: profile.first_name || "",
            lastName: profile.last_name || "",
            email: profile.email || "",
            phone: profile.phone || "",
            password: passwordRes?.success ? passwordRes.password : null,
          }}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Lifetime Value
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.ltv}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customer.points.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Support Tickets
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketsCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Check support history for details
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="border bg-background">
          <TabsTrigger value="activity">Timeline & Activity</TabsTrigger>
          <TabsTrigger value="orders">Purchase History</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist & Browsing</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="support">Support History</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Timeline</CardTitle>
              <CardDescription>
                Comprehensive view of all customer interactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center text-muted-foreground">
                <p>No recent activity found for this customer.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Order history table placeholder.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wishlist">
          <Card>
            <CardHeader>
              <CardTitle>Wishlist & Browsing History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Wishlist items and recent views placeholder.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications">
          <Card>
            <CardHeader>
              <CardTitle>Communication History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Email and SMS history placeholder.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle>Support History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Past tickets and chats placeholder.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
