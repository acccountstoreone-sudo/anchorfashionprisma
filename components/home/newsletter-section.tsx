"use client";

import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { jost } from "@/lib/fonts";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const newsletterSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

type NewsletterFormValues = z.infer<typeof newsletterSchema>;

export function NewsletterSection() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: NewsletterFormValues) => {
    // Simulate brief network delay for UX
    await new Promise((resolve) => setTimeout(resolve, 600));
    toast.success(
      `You're on the list! 🎉 Check ${values.email} for your 10% off code.`
    );
    reset();
  };

  return (
    <section
      className={`${jost.className} relative overflow-hidden bg-[#F8F6F1] py-20 md:py-28`}
    >
      {/* Decorative Background Lines */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-full w-px bg-[#C9A86A]/10" />
        <div className="absolute right-1/4 top-0 h-full w-px bg-[#C9A86A]/10" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-[#C9A86A]/10" />
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          {/* Icon */}
          <div className="mx-auto mb-8 flex h-12 w-12 items-center justify-center border border-[#C9A86A]/40">
            <Sparkles className="h-5 w-5 text-[#C9A86A]" strokeWidth={1.5} />
          </div>

          {/* Heading */}
          <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.35em] text-[#C9A86A]">
            Exclusive Access
          </span>
          <h2 className="mb-4 text-3xl font-light tracking-tight text-[#1A1A1A] md:text-5xl">
            Be The First to Know.
          </h2>
          <p className="mb-10 text-sm font-light leading-relaxed text-gray-500">
            Subscribe and unlock{" "}
            <strong className="font-medium text-[#1A1A1A]">
              10% off your first order
            </strong>
            . Get early access to new arrivals, exclusive offers, and style
            inspiration — straight to your inbox.
          </p>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mx-auto w-full max-w-md"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-0">
              <input
                type="email"
                placeholder="Enter your email address"
                {...register("email")}
                className={`flex-1 border-b bg-transparent px-2 py-4 text-sm text-[#1A1A1A] transition-colors placeholder:text-gray-400 focus:outline-none ${
                  errors.email
                    ? "border-red-500 focus:border-red-500"
                    : "border-black/20 focus:border-black"
                }`}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="group flex flex-shrink-0 items-center justify-center gap-2 whitespace-nowrap border-b border-black/20 bg-transparent px-4 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[#1A1A1A] transition-all hover:border-black disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    Subscribe{" "}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
            {errors.email && (
              <p className="mt-2 text-left text-xs text-red-500">{errors.email.message}</p>
            )}
          </form>

          <p className="mt-4 text-[11px] font-light text-gray-400">
            No spam. Unsubscribe anytime. By subscribing you agree to our{" "}
            <a
              href="/privacy"
              className="underline transition-colors hover:text-[#C9A86A]"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
