import { Metadata } from "next";
import { getFaqsAction, getStorePoliciesAction } from "@/app/actions/cms/faq-policy.actions";
import { FaqPolicyManagerClient } from "@/features/cms/components/FaqPolicyManagerClient";

export const metadata: Metadata = {
  title: "Store Policies | Manager Dashboard",
  description: "Manage shipping rates, delivery timelines, and return rules.",
};

export const dynamic = "force-dynamic";

export default async function ManagerPoliciesPage() {
  const [{ data: faqs }, policies] = await Promise.all([
    getFaqsAction(),
    getStorePoliciesAction(),
  ]);

  return (
    <div className="w-full">
      <FaqPolicyManagerClient
        initialFaqs={faqs || []}
        initialShipping={policies.shipping}
        initialReturns={policies.returns}
        defaultTab="shipping"
        baseRoute="/manager/cms"
      />
    </div>
  );
}
