import { ZoneForm } from "@/features/admin/components/shipping/ZoneForm";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Create Delivery Zone | Anchor Fashion Enterprise",
};

export default function NewZonePage() {
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
      <ZoneForm />
    </div>
  );
}
