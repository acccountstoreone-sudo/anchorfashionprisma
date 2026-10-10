import { Metadata } from "next";
import { getWhyChooseUsSettings } from "@/actions/why-choose-us.actions";
import { WhyChooseUsManagerClient } from "@/features/admin/components/cms/WhyChooseUsManagerClient";

export const metadata: Metadata = {
  title: "Brand Ethos & 'Why Choose Us' | CMS Admin",
  description: "Customize homepage brand ethos and value propositions",
};

export default async function WhyChooseUsAdminPage() {
  const initialData = await getWhyChooseUsSettings();

  return <WhyChooseUsManagerClient initialData={initialData} />;
}
