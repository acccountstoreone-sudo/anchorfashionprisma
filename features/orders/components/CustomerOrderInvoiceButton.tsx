import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import Link from "next/link";

export function CustomerOrderInvoiceButton({ order }: { order: any }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      asChild
    >
      <Link href={`/account/orders/${order.id}/invoice`} target="_blank">
        <Printer className="h-4 w-4" />
        Print Invoice
      </Link>
    </Button>
  );
}
