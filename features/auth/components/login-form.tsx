"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Link from "next/link";

import { authClient } from "@/lib/auth/client";
import { getPostLoginRedirectAction } from "@/actions/auth.actions";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { loginSchema, type LoginFormValues } from "@/schemas/auth.schema";

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("anchor_saved_email");
      if (savedEmail) {
        form.setValue("email", savedEmail);
      }
    } catch {}
  }, [form]);

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);

    const email = values.email.trim().toLowerCase();
    const password = values.password.trim();

    try {
      await authClient.signOut();
    } catch (_) {}

    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      toast.error(error.message || "Invalid login credentials.");
      setIsLoading(false);
      return;
    }

    try {
      if (rememberMe) {
        localStorage.setItem("anchor_saved_email", email);
      } else {
        localStorage.removeItem("anchor_saved_email");
      }
    } catch {}

    toast.success("Successfully logged in!");

    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");

    try {
      const { redirectUrl } = await getPostLoginRedirectAction(next, data?.user);
      window.location.href = redirectUrl;
    } catch {
      window.location.href = next || "/account/profile";
    }
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                  Email address
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <svg
                      aria-hidden="true"
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9A86A]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <Input
                      {...field}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      disabled={isLoading}
                      className="pl-10 h-12 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-[#C9A86A]/30 focus-visible:border-[#C9A86A]"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                    Password
                  </FormLabel>
                  <Link
                    href="/auth/forgot-password"
                    prefetch={false}
                    tabIndex={-1}
                    className="text-xs font-medium text-[#C9A86A] hover:text-[#b09156] hover:underline underline-offset-4 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <svg
                      aria-hidden="true"
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9A86A]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <PasswordInput
                      {...field}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="pl-10 h-12 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-[#C9A86A]/30 focus-visible:border-[#C9A86A]"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Remember me */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-[#C9A86A]"
            />
            <label
              htmlFor="remember"
              className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none"
            >
              Remember me
            </label>
          </div>

          {/* Submit */}
          <LoadingButton
            type="submit"
            isLoading={isLoading}
            className="w-full h-12 bg-[#C9A86A] hover:bg-[#b09156] active:bg-[#9d7e47] text-white shadow-md shadow-[#C9A86A]/20 transition-all rounded-lg font-semibold mt-2 tracking-wide"
          >
            {isLoading ? "Signing in…" : "Sign In"}
          </LoadingButton>
        </form>
      </Form>
    </div>
  );
}
