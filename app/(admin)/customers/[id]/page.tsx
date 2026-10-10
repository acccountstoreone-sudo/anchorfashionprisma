import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, User, Package, Calendar, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, roles(name)")
    .eq("id", id)
    .maybeSingle();

  let email = "No email registered";
  let createdAt = "N/A";

  try {
    const { data: authData } = await adminClient.auth.admin.getUserById(id);
    if (authData?.user?.email) email = authData.user.email;
    if (authData?.user?.created_at) {
      createdAt = new Date(authData.user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  } catch {
    // Auth user might not be found or admin client permissions
  }

  // Fetch real orders for this customer
  const { data: orders } = await supabase
    .from("orders")
    .select("id, total, status, created_at")
    .or(`customer_id.eq.${id},user_id.eq.${id}`)
    .order("created_at", { ascending: false });

  const customerName = profile 
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Customer User"
    : "Customer User";

  if (!profile) {
    return (
      <div className="space-y-6 p-8">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" /> Back to Customers
          </Link>
        </Button>
        <Card className="max-w-md mx-auto text-center py-12">
          <CardContent className="space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/60" />
            <h2 className="text-xl font-semibold">Customer Not Found</h2>
            <p className="text-sm text-muted-foreground">
              The customer record with ID <code className="text-xs">{id}</code> could not be found.
            </p>
            <Button asChild>
              <Link href="/customers">Return to Customers</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleName = Array.isArray(profile.roles)
    ? profile.roles[0]?.name
    : (profile.roles as any)?.name || "CUSTOMER";

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/customers">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {customerName}
            </h1>
          </div>
          <p className="text-muted-foreground pl-11">{email}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{profile.phone || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Account Status</p>
              <Badge variant={profile.is_active ? "default" : "secondary"}>
                {profile.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant="outline">{roleName}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer Since</p>
              <p className="font-medium">{createdAt}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders Placed</p>
              <p className="text-3xl font-bold">{orders?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lifetime Total</p>
              <p className="text-xl font-semibold">
                BDT {(orders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-xs text-muted-foreground break-all">{profile.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">
                {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Order Timeline</CardTitle>
          <CardDescription>Order history and fulfillment activity</CardDescription>
        </CardHeader>
        <CardContent>
          {!orders || orders.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium text-foreground">No orders placed yet</p>
              <p className="text-xs text-muted-foreground mt-1">Orders from this customer will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{order.status}</Badge>
                    <p className="text-sm font-semibold mt-1">BDT {Number(order.total || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
