"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    setIsSubmitted(true);
    toast.success("Password reset link sent to your email!");
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="rounded-full bg-green-100 p-3">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>
        <h3 className="text-xl font-medium">Check your email</h3>
        <p className="text-sm text-muted-foreground">
          We sent a password reset link to{" "}
          <span className="font-medium text-foreground">
            {form.getValues().email}
          </span>
          .
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setIsSubmitted(false)}
        >
          Back to reset
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="name@example.com"
                    className="h-12 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-[#C9A86A] focus-visible:ring-[#C9A86A]/20"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full h-12 bg-[#C9A86A] hover:bg-[#b09156] text-white font-semibold" disabled={isLoading}>
            {isLoading ? "Sending link..." : "Send reset link"}
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm text-slate-600 dark:text-slate-400">
        Remember your password?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-[#C9A86A] hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
