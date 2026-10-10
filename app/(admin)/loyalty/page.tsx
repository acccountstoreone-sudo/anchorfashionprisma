import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Loyalty Program Dashboard | Admin",
};

export default function AdminLoyaltyPage() {
  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Loyalty Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Overview of loyalty tiers, points in circulation, and coupon
            assignments.
          </p>
        </div>
        <Button>Create Coupon</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Points Issued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1.2M</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Points Redeemed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">450K</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">VIP Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">1,245</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gold Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">8,920</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Coupon Redemptions</CardTitle>
          <CardDescription>
            Track how customers are using loyalty rewards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Coupon Code</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">John Doe</TableCell>
                <TableCell>
                  <Badge variant="secondary">VIP20</Badge>
                </TableCell>
                <TableCell>ORD-8821</TableCell>
                <TableCell>BDT 450</TableCell>
                <TableCell>Oct 12, 2026</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Jane Smith</TableCell>
                <TableCell>
                  <Badge variant="secondary">WELCOME10</Badge>
                </TableCell>
                <TableCell>ORD-8822</TableCell>
                <TableCell>BDT 200</TableCell>
                <TableCell>Oct 11, 2026</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
