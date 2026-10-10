import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Map, Check, X, Plus } from "lucide-react";
import { getZonesAction } from "@/app/actions/manager/shipping.actions";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Delivery Zones | Admin Dashboard",
};

export const dynamic = "force-dynamic";

export default async function ZonesPage() {
  const { data: zones } = await getZonesAction();

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Zones</h1>
          <p className="mt-1 text-muted-foreground">
            Configure geographic zones, shipping rates, and delivery times.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/shipping/zones/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Delivery Zone
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Zones</CardTitle>
          <CardDescription>
            Zones group districts together to apply standardized shipping rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Districts</TableHead>
                <TableHead>COD Available</TableHead>
                <TableHead>Est. Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!zones || zones.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Map className="h-8 w-8 text-muted-foreground/50" />
                      <p>No delivery zones defined.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell className="font-mono text-xs">{zone.code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {zone.districts && zone.districts.length > 0 ? (
                        zone.districts.join(", ")
                      ) : (
                        "All other districts"
                      )}
                    </TableCell>
                    <TableCell>
                      {zone.is_cod_available ? (
                        <Badge variant="outline" className="text-green-600 bg-green-50"><Check className="h-3 w-3 mr-1"/> Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 bg-red-50"><X className="h-3 w-3 mr-1"/> No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {zone.estimated_days_min} - {zone.estimated_days_max} days
                    </TableCell>
                    <TableCell>
                      <Badge variant={zone.is_active ? "default" : "secondary"}>
                        {zone.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/shipping/zones/${zone.id}`}>
                          Edit Zone
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
