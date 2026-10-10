import { Metadata } from "next";
import { getFaqsAction, getStorePoliciesAction } from "@/app/actions/cms/faq-policy.actions";
import { FaqPolicyManagerClient } from "@/features/cms/components/FaqPolicyManagerClient";

export const metadata: Metadata = {
  title: "FAQs & Policies | Enterprise Admin",
  description: "Manage frequently asked questions, shipping rules, and return policies.",
};

export const dynamic = "force-dynamic";

export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
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
        defaultTab={params?.tab || "faqs"}
        baseRoute="/admin/cms"
      />
    </div>
  );
}
