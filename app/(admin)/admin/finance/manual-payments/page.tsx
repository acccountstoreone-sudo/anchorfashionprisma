import { Metadata } from "next";
import { getPendingManualPaymentsAction } from "@/lib/actions/payment.actions";
import { ManualPaymentsClient } from "./manual-payments-client";

export const metadata: Metadata = {
  title: "Manual Payments Verification | Admin Finance",
  description: "Verify and approve customer manual payments for bKash, Nagad, Rocket, and Bank Transfer",
};

export const dynamic = "force-dynamic";

export default async function ManualPaymentsPage() {
  const transactions = await getPendingManualPaymentsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manual Payments Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Audit customer payment submissions (bKash, Nagad, Rocket, Bank Transfer) with sender phone numbers and Transaction IDs (TrxID) for instant approval or rejection.
        </p>
      </div>

      <ManualPaymentsClient initialTransactions={transactions} />
    </div>
  );
}
