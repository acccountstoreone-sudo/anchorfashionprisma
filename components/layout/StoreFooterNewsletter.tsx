"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const newsletterSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

type NewsletterFormValues = z.infer<typeof newsletterSchema>;

export function StoreFooterNewsletter() {
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
    await new Promise((resolve) => setTimeout(resolve, 600));
    toast.success(`Thank you for subscribing! Check ${values.email} for exclusive drops.`);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md md:w-auto">
      <div className="flex w-full gap-0">
        <input
          type="email"
          placeholder="Your email address..."
          {...register("email")}
          className={`flex-1 border bg-white px-4 py-3 text-sm text-gray-900 transition-colors placeholder:text-gray-500 focus:outline-none ${
            errors.email
              ? "border-red-500 focus:border-red-500"
              : "border-gray-300 focus:border-[#C9A86A]"
          }`}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 whitespace-nowrap bg-[#C9A86A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#b8973e] disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Subscribe <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
      {errors.email && (
        <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
      )}
    </form>
  );
}
