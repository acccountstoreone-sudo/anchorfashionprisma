import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock, MessageSquare, Sparkles, ShieldCheck } from "lucide-react";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";
import { ContactForm } from "@/components/contact/ContactForm";
import { jost } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Contact Us & Concierge Support | Anchor Fashion",
  description:
    "Get in touch with Anchor Fashion customer concierge, atelier headquarters, order support, and showroom inquiries.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StoreHeader />

      <main className="flex-1 pb-20">
        {/* Editorial Header Banner */}
        <section className="relative overflow-hidden bg-[#0D1B2A] py-16 text-white md:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(201,168,106,0.18),transparent_60%)] pointer-events-none" />
          <div className="container relative mx-auto max-w-4xl px-4 text-center md:px-6">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A86A]/40 bg-[#C9A86A]/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#EAD098] mb-4">
              <Sparkles className="h-3 w-3" />
              <span>Customer Concierge</span>
            </div>
            <h1
              className={`${jost.className} text-4xl font-light tracking-tight text-white sm:text-5xl md:text-6xl`}
            >
              We Are Here For You.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm font-light leading-relaxed text-gray-300 md:text-base">
              Whether you need styling consultations, sizing advice, or assistance with an order, our dedicated team is at your service.
            </p>
          </div>
        </section>

        {/* Contact Layout */}
        <div className="container mx-auto max-w-6xl px-4 pt-12 md:px-6 md:pt-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
            {/* Contact Information & Channels */}
            <div className="space-y-6 lg:col-span-5">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A86A]">
                  Direct Channels
                </span>
                <h2 className={`${jost.className} mt-1 text-2xl font-light text-gray-900 sm:text-3xl`}>
                  Get In Touch
                </h2>
                <p className="mt-1 text-xs text-gray-500 font-light">
                  Reach out through any of our official communication desks.
                </p>
              </div>

              <div className="space-y-4">
                <Card className="rounded-2xl border border-gray-200/80 bg-[#FAFAFA] p-5 shadow-xs transition hover:border-[#C9A86A]/40">
                  <CardContent className="p-0 flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9A86A]/15 text-[#C9A86A]">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                        Phone Concierge
                      </h3>
                      <p className="text-sm font-medium text-gray-700 mt-0.5">+880 1800 000000</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Toll-free / Direct support lines</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-gray-200/80 bg-[#FAFAFA] p-5 shadow-xs transition hover:border-[#C9A86A]/40">
                  <CardContent className="p-0 flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9A86A]/15 text-[#C9A86A]">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                        Email Desk
                      </h3>
                      <p className="text-sm font-medium text-gray-700 mt-0.5">support@anchorfashion.com</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Typical response within 2 hours</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-gray-200/80 bg-[#FAFAFA] p-5 shadow-xs transition hover:border-[#C9A86A]/40">
                  <CardContent className="p-0 flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9A86A]/15 text-[#C9A86A]">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                        Flagship Atelier & HQ
                      </h3>
                      <p className="text-sm font-medium text-gray-700 mt-0.5">
                        Road 11, Banani Block D<br />Dhaka 1213, Bangladesh
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Showroom & Corporate Studio</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-gray-200/80 bg-[#FAFAFA] p-5 shadow-xs transition hover:border-[#C9A86A]/40">
                  <CardContent className="p-0 flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9A86A]/15 text-[#C9A86A]">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                        Operating Hours
                      </h3>
                      <p className="text-sm font-medium text-gray-700 mt-0.5">
                        Saturday – Thursday: 9:30 AM – 9:00 PM
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Friday: 2:00 PM – 9:00 PM</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Contact Form Section */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm sm:p-8 md:p-10">
                <div className="mb-6 border-b border-gray-100 pb-4">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A86A]">
                    Leave A Message
                  </span>
                  <h3 className={`${jost.className} mt-1 text-2xl font-light text-gray-900`}>
                    Send Us An Inquiry
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 font-light">
                    Fill in your details below and our team will get in touch promptly.
                  </p>
                </div>
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
