import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <StoreHeader />
      <main className="flex-1 bg-white px-4 py-16">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="border-b pb-8">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Terms of Service
            </h1>
            <p className="mt-2 text-muted-foreground">
              Last updated: October 24, 2024
            </p>
          </div>

          <div className="prose prose-slate max-w-none space-y-6">
            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                1. Acceptance of Terms
              </h2>
              <p className="leading-relaxed text-slate-600">
                By accessing and placing an order with Anchor Fashion, you
                confirm that you are in agreement with and bound by the terms of
                service contained in the Terms & Conditions outlined below.
                These terms apply to the entire website and any email or other
                type of communication between you and Anchor Fashion.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                2. Products and Pricing
              </h2>
              <p className="leading-relaxed text-slate-600">
                All products listed on the website are subject to availability.
                We reserve the right to discontinue any product at any time.
                Prices for our products are subject to change without notice. We
                shall not be liable to you or to any third-party for any
                modification, price change, suspension, or discontinuance of the
                Service.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                3. Orders and Payments
              </h2>
              <p className="leading-relaxed text-slate-600">
                We reserve the right to refuse any order you place with us. We
                may, in our sole discretion, limit or cancel quantities
                purchased per person, per household, or per order. You agree to
                provide current, complete, and accurate purchase and account
                information for all purchases made at our store. We accept major
                credit cards, digital wallets, and Cash on Delivery (COD)
                subject to location availability.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                4. Shipping and Returns
              </h2>
              <p className="leading-relaxed text-slate-600">
                Please review our dedicated Shipping & Returns policy for
                detailed information regarding delivery times, courier partners,
                and our return process. Anchor Fashion utilizes third-party
                courier services (e.g., Pathao, Steadfast) and is not liable for
                delays caused by the courier network.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                5. Loyalty Program and Wallet
              </h2>
              <p className="leading-relaxed text-slate-600">
                Loyalty points and digital wallet balances hold no cash value
                outside of the Anchor Fashion ecosystem and cannot be withdrawn
                as fiat currency. We reserve the right to modify the points
                conversion rate or revoke points in cases of suspected fraud or
                abuse.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                6. Contact Information
              </h2>
              <p className="leading-relaxed text-slate-600">
                Questions about the Terms of Service should be sent to us at
                support@anchorfashion.com.
              </p>
            </section>
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
