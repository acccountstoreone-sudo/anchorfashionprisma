import { Metadata } from "next";
import Link from "next/link";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";

export const metadata: Metadata = {
  title: "Cookie Policy | Anchor Fashion",
  description: "Learn how Anchor Fashion uses cookies to personalize and enhance your browsing experience.",
};

export default function CookiePolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <StoreHeader />

      <main className="flex-1 py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl bg-white p-8 md:p-14 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="border-b border-gray-100 pb-6 mb-8">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#C9A86A]">
              Legal & Compliance
            </span>
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-gray-900 mt-2">
              Cookie Policy
            </h1>
            <p className="text-xs text-gray-400 mt-2">Last Updated: September 2026</p>
          </div>

          <div className="prose prose-slate max-w-none text-sm text-gray-600 space-y-6 leading-relaxed">
            <p>
              At Anchor Fashion, we believe in being clear and open about how we collect and use data related to you. This Cookie Policy explains when and why cookies and similar tracking technologies may be sent to your device when you visit our website.
            </p>

            <h2 className="text-lg font-bold text-gray-900 pt-4">1. What are cookies?</h2>
            <p>
              Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to ensure websites function smoothly, remember your cart items, improve browsing speed, and provide analytics on customer preferences.
            </p>

            <h2 className="text-lg font-bold text-gray-900 pt-4">2. Cookies we use</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Strictly Necessary Cookies:</strong> Essential for you to browse the site, maintain session security, and keep your shopping bag persistent.
              </li>
              <li>
                <strong>Performance & Analytics Cookies:</strong> Allow us to measure website traffic, understand popular categories, and optimize store performance.
              </li>
              <li>
                <strong>Functional Cookies:</strong> Remember your currency and language preferences for a tailored shopping experience.
              </li>
            </ul>

            <h2 className="text-lg font-bold text-gray-900 pt-4">3. Managing your cookie preferences</h2>
            <p>
              Most web browsers permit you to manage cookie settings via their browser preferences. You can choose to block cookies or delete existing cookies, although doing so may impair certain features of our shopping bag and account dashboard.
            </p>

            <h2 className="text-lg font-bold text-gray-900 pt-4">4. Inquiries</h2>
            <p>
              If you have any questions about our use of cookies or privacy standards, please reach us via{" "}
              <Link href="/contact" className="font-semibold text-black underline">
                our contact portal
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
