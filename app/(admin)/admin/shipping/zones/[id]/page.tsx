import { ZoneForm } from "@/features/admin/components/shipping/ZoneForm";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getDeliveryZoneAction } from "@/actions/delivery-zones.actions";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Edit Delivery Zone | Anchor Fashion Enterprise",
};

export default async function EditZonePage({ params }: { params: Promise<{ id: string }> }) {
  const res = await getDeliveryZoneAction((await params).id);

  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/shipping/zones">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Zones
          </Link>
        </Button>
      </div>
      <ZoneForm initialData={res.data} />
    </div>
  );
}
