import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <StoreHeader />
      <main className="flex-1 bg-white px-4 py-16">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="border-b pb-8">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Privacy Policy
            </h1>
            <p className="mt-2 text-muted-foreground">
              Last updated: October 24, 2024
            </p>
          </div>

          <div className="prose prose-slate max-w-none space-y-6">
            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                1. Information We Collect
              </h2>
              <p className="leading-relaxed text-slate-600">
                At Anchor Fashion, we collect information that you provide
                directly to us when you create an account, make a purchase, sign
                up for our newsletter, or contact customer support. This
                information may include your name, email address, shipping
                address, billing address, phone number, and payment details.
              </p>
              <p className="mt-4 leading-relaxed text-slate-600">
                We also automatically collect certain information about your
                device and how you interact with our website, including your IP
                address, browser type, pages visited, and referring URLs. This
                helps us improve our platform and provide a better shopping
                experience.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                2. How We Use Your Information
              </h2>
              <p className="mb-2 leading-relaxed text-slate-600">
                We use the information we collect to:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-slate-600">
                <li>
                  Process and fulfill your orders, including sending order
                  confirmations and shipping updates.
                </li>
                <li>
                  Manage your account, loyalty points, and digital wallet.
                </li>
                <li>
                  Respond to your customer service inquiries and support
                  tickets.
                </li>
                <li>
                  Send you marketing communications (if you have opted in).
                </li>
                <li>Detect and prevent fraud.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                3. Sharing Your Information
              </h2>
              <p className="leading-relaxed text-slate-600">
                We do not sell your personal information to third parties. We
                only share your information with trusted service providers who
                assist us in operating our website, processing payments, and
                delivering your orders (such as courier partners like Pathao or
                Steadfast). These providers are contractually obligated to keep
                your information secure and use it only for the purposes we
                specify.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                4. Data Security
              </h2>
              <p className="leading-relaxed text-slate-600">
                We take the security of your personal information very
                seriously. We implement robust technical and organizational
                measures to protect your data from unauthorized access, loss, or
                alteration. All payment transactions are encrypted using
                industry-standard SSL technology.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                5. Your Rights
              </h2>
              <p className="leading-relaxed text-slate-600">
                You have the right to access, update, or delete your personal
                information at any time through your Account Dashboard. If you
                need assistance or have questions about our privacy practices,
                please contact our support team.
              </p>
            </section>
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
