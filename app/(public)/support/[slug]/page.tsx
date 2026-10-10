import { Metadata } from "next";
import Link from "next/link";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Ruler,
  Truck,
  Search,
  HelpCircle,
  ArrowRight,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Package,
  Clock,
} from "lucide-react";
import { getFaqsAction, getStorePoliciesAction } from "@/app/actions/cms/faq-policy.actions";
import { SupportFaqClient } from "@/features/support/components/SupportFaqClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const titles: Record<string, string> = {
    "size-guide": "Size Guide & Fit Recommendations",
    shipping: "Shipping & Return Policies",
    "track-order": "Track Your Order",
    faq: "Frequently Asked Questions (FAQ)",
  };

  const title = titles[slug] || "Customer Support";
  return {
    title: `${title} | Anchor Fashion`,
    description: `Anchor Fashion customer support for ${title}.`,
  };
}

export default async function SupportTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [faqsRes, policiesRes] = await Promise.all([
    slug === "faq" ? getFaqsAction() : Promise.resolve({ success: true, data: [] }),
    slug === "shipping" ? getStorePoliciesAction() : Promise.resolve(null),
  ]);

  const faqs = faqsRes?.data || [];
  const policies = policiesRes;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <StoreHeader />

      <main className="flex-1">
        {/* Header Breadcrumb & Title */}
        <section className="border-b border-gray-200 bg-white py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A86A] mb-3">
              <Link href="/support" className="hover:underline">
                Customer Care
              </Link>
              <span>/</span>
              <span>
                {slug === "size-guide"
                  ? "Size Guide"
                  : slug === "shipping"
                  ? "Shipping & Returns"
                  : slug === "track-order"
                  ? "Order Tracking"
                  : slug === "faq"
                  ? "FAQ"
                  : "Help Center"}
              </span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
              {slug === "size-guide" && "Size Guide & Measurement Chart"}
              {slug === "shipping" && "Shipping, Delivery & Returns"}
              {slug === "track-order" && "Track Your Order Status"}
              {slug === "faq" && "Frequently Asked Questions"}
              {slug !== "size-guide" &&
                slug !== "shipping" &&
                slug !== "track-order" &&
                slug !== "faq" &&
                "Customer Care Center"}
            </h1>
            <p className="mt-3 text-sm md:text-base text-gray-500 max-w-xl mx-auto">
              Everything you need to know about our craftsmanship, delivery timelines, fitting and service.
            </p>
          </div>
        </section>

        {/* Content Body Based on Topic */}
        <div className="container mx-auto px-4 py-12 md:px-6 md:py-16 max-w-4xl">
          {slug === "size-guide" && (
            <div className="space-y-12">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-xs">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                  <Ruler className="h-6 w-6 text-[#C9A86A]" />
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">
                    Women's Apparel Size Chart (Inches)
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-900">
                      <tr>
                        <th className="px-4 py-3">Size</th>
                        <th className="px-4 py-3">Bust</th>
                        <th className="px-4 py-3">Waist</th>
                        <th className="px-4 py-3">Hips</th>
                        <th className="px-4 py-3">Length</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900">XS (34)</td>
                        <td className="px-4 py-3">32 - 34"</td>
                        <td className="px-4 py-3">25 - 26"</td>
                        <td className="px-4 py-3">35 - 36"</td>
                        <td className="px-4 py-3">40"</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900">S (36)</td>
                        <td className="px-4 py-3">34 - 36"</td>
                        <td className="px-4 py-3">27 - 28"</td>
                        <td className="px-4 py-3">37 - 38"</td>
                        <td className="px-4 py-3">41"</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900">M (38)</td>
                        <td className="px-4 py-3">36 - 38"</td>
                        <td className="px-4 py-3">29 - 31"</td>
                        <td className="px-4 py-3">39 - 41"</td>
                        <td className="px-4 py-3">42"</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900">L (40)</td>
                        <td className="px-4 py-3">38 - 41"</td>
                        <td className="px-4 py-3">32 - 34"</td>
                        <td className="px-4 py-3">42 - 44"</td>
                        <td className="px-4 py-3">43"</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900">XL (42)</td>
                        <td className="px-4 py-3">41 - 44"</td>
                        <td className="px-4 py-3">35 - 37"</td>
                        <td className="px-4 py-3">45 - 47"</td>
                        <td className="px-4 py-3">44"</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900">XXL (44)</td>
                        <td className="px-4 py-3">44 - 47"</td>
                        <td className="px-4 py-3">38 - 40"</td>
                        <td className="px-4 py-3">48 - 50"</td>
                        <td className="px-4 py-3">45"</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-xs">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                  <Ruler className="h-6 w-6 text-[#C9A86A]" />
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">
                    Men's Apparel Size Chart (Inches)
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-900">
                      <tr>
                        <th className="px-4 py-3">Size</th>
                        <th className="px-4 py-3">Chest</th>
                        <th className="px-4 py-3">Length</th>
                        <th className="px-4 py-3">Shoulder</th>
                        <th className="px-4 py-3">Sleeve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900">S (38)</td>
                        <td className="px-4 py-3">38"</td>
                        <td className="px-4 py-3">27.5"</td>
                        <td className="px-4 py-3">17.5"</td>
                        <td className="px-4 py-3">8"</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900">M (40)</td>
                        <td className="px-4 py-3">40"</td>
                        <td className="px-4 py-3">28.5"</td>
                        <td className="px-4 py-3">18.5"</td>
                        <td className="px-4 py-3">8.5"</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900">L (42)</td>
                        <td className="px-4 py-3">42"</td>
                        <td className="px-4 py-3">29.5"</td>
                        <td className="px-4 py-3">19.5"</td>
                        <td className="px-4 py-3">9"</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900">XL (44)</td>
                        <td className="px-4 py-3">44"</td>
                        <td className="px-4 py-3">30.5"</td>
                        <td className="px-4 py-3">20.5"</td>
                        <td className="px-4 py-3">9.5"</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900">XXL (46)</td>
                        <td className="px-4 py-3">46"</td>
                        <td className="px-4 py-3">31.5"</td>
                        <td className="px-4 py-3">21.5"</td>
                        <td className="px-4 py-3">10"</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {slug === "shipping" && (
            <div className="space-y-8">
              {/* Delivery Speed & Rates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center gap-3 mb-3">
                    <Truck className="h-6 w-6 text-[#C9A86A]" />
                    <h3 className="text-lg font-bold text-gray-900">Inside Dhaka</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    Deliveries within Dhaka Metropolitan are completed within{" "}
                    <strong>{policies?.shipping?.inside_dhaka_delivery_time || "24 to 48 hours"}</strong>.
                  </p>
                  <p className="text-xs font-semibold text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    Standard Shipping: ৳{policies?.shipping?.inside_dhaka_fee ?? 60} | Free above ৳
                    {policies?.shipping?.free_shipping_threshold ?? 999}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="h-6 w-6 text-[#C9A86A]" />
                    <h3 className="text-lg font-bold text-gray-900">Outside Dhaka</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    All other nationwide divisions and districts are delivered within{" "}
                    <strong>{policies?.shipping?.outside_dhaka_delivery_time || "3 to 5 business days"}</strong> via courier.
                  </p>
                  <p className="text-xs font-semibold text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    Standard Shipping: ৳{policies?.shipping?.outside_dhaka_fee ?? 120} | Free above ৳
                    {policies?.shipping?.free_shipping_threshold ?? 999}
                  </p>
                </div>
              </div>

              {/* Order Processing & Couriers */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-900">
                  <Clock className="h-4 w-4 text-[#C9A86A]" />
                  <span>Order Processing & Dispatch</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {policies?.shipping?.processing_time || "Same day dispatch for orders confirmed before 2:00 PM."}
                </p>
                {policies?.shipping?.courier_partners && (
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Courier Partners:</span>{" "}
                    {policies.shipping.courier_partners}
                  </p>
                )}
                {policies?.shipping?.notice && (
                  <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-xl text-xs text-blue-900">
                    {policies.shipping.notice}
                  </div>
                )}
              </div>

              {/* Exchange Policy */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-xs space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    {policies?.returns?.return_window_days ?? 7}-Day Hassle-Free Exchange Policy
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mt-2">
                    {policies?.returns?.policy_notice ||
                      "We want you to love what you wear. If your size doesn't fit or you wish to exchange for another design, simply contact our support line with your order invoice."}
                  </p>
                </div>

                <div className="bg-amber-50/80 border border-amber-200/70 p-4 rounded-xl text-xs text-amber-900 leading-relaxed">
                  <strong>Exchange conditions:</strong>{" "}
                  {policies?.returns?.conditions ||
                    "Items must be unworn, unwashed, and with all original tags attached."}
                </div>

                {policies?.returns?.allowed_reasons && policies.returns.allowed_reasons.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Eligible Exchange & Return Reasons
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {policies.returns.allowed_reasons.map((reason, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs py-1 px-2.5 bg-gray-50 border-gray-200">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {slug === "faq" && (
            <SupportFaqClient faqs={faqs} />
          )}

          {/* Quick Contact Assistance Strip */}
          <div className="mt-14 rounded-2xl bg-gray-50 p-6 md:p-8 border border-gray-200/80 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Still have questions?</h3>
              <p className="text-xs text-gray-500 mt-1">Our customer experience team is available 7 days a week, 9 AM - 10 PM.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" size="sm" className="text-xs font-semibold">
                <Link href="/contact">Contact Support</Link>
              </Button>
              <Button asChild size="sm" className="bg-[#0D1B2A] hover:bg-black text-white text-xs font-semibold">
                <Link href="/products">Shop Apparel</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
