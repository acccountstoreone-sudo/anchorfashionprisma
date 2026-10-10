import { CustomerSegmentRepository } from "@/lib/repositories/crm/customer-segment.repository";
import { CustomerGroupsClient } from "@/features/crm/components/CustomerGroupsClient";

export const metadata = {
  title: "Customer Groups | Customers | Anchor Fashion Enterprise",
};

export default async function AdminCustomerGroupsPage() {
  const segments = await CustomerSegmentRepository.getSegments();

  return <CustomerGroupsClient segments={segments} />;
}
