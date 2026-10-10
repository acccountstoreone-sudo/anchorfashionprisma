import { PaymentsOverview } from "@/components/admin/payments/PaymentsOverview";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  CreditCard,
  Server,
  ArrowRightLeft,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export default function PaymentsDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Payments Dashboard
        </h1>
      </div>

      <PaymentsOverview />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/payments/providers">
          <Button
            variant="outline"
            className="flex h-24 w-full flex-col items-center justify-center gap-2"
          >
            <Server className="h-6 w-6" />
            Providers
          </Button>
        </Link>
        <Link href="/admin/payments/transactions">
          <Button
            variant="outline"
            className="flex h-24 w-full flex-col items-center justify-center gap-2"
          >
            <ArrowRightLeft className="h-6 w-6" />
            Transactions
          </Button>
        </Link>
        <Link href="/admin/payments/refunds">
          <Button
            variant="outline"
            className="flex h-24 w-full flex-col items-center justify-center gap-2"
          >
            <RefreshCw className="h-6 w-6" />
            Refunds
          </Button>
        </Link>
        <Link href="/admin/payments/webhooks">
          <Button
            variant="outline"
            className="flex h-24 w-full flex-col items-center justify-center gap-2"
          >
            <AlertCircle className="h-6 w-6" />
            Webhooks
          </Button>
        </Link>
      </div>
    </div>
  );
}
