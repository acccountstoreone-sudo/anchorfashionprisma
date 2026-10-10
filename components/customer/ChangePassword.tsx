"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Lock, CheckCircle2, Copy, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateUserPasswordAction } from "@/actions/users.actions";
import { createClient } from "@/lib/supabase/client";

const changePasswordSchema = z
  .object({
    current_password: z.string().optional(),
    new_password: z.string().min(6, "New password must be at least 6 characters"),
    confirm_password: z.string().min(6, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const STORAGE_KEY = "anchor_user_password";

export function ChangePassword() {
  const [isPending, startTransition] = useTransition();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [hasSavedPassword, setHasSavedPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const currentPasswordVal = watch("current_password");

  const handleCopyCurrentPassword = () => {
    if (!currentPasswordVal) return;
    navigator.clipboard.writeText(currentPasswordVal);
    setIsCopied(true);
    toast.success("Current password copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setValue("current_password", saved);
        setHasSavedPassword(true);
      } else {
        setValue("current_password", "");
        setHasSavedPassword(false);
      }
    } catch {
      setValue("current_password", "");
      setHasSavedPassword(false);
    }
  }, [setValue]);

  const onSubmit = (values: ChangePasswordValues) => {
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error: clientAuthError } = await supabase.auth.updateUser({
          password: values.new_password,
        });

        if (clientAuthError) {
          const res = await updateUserPasswordAction(values.new_password);
          if (!res.success) {
            toast.error(res.error || clientAuthError.message || "Failed to update password");
            return;
          }
        }

        toast.success("Password updated successfully!");
        try {
          localStorage.setItem(STORAGE_KEY, values.new_password);
        } catch {}
        setValue("current_password", values.new_password);
        setHasSavedPassword(true);
        setValue("new_password", "");
        setValue("confirm_password", "");
      } catch (err: any) {
        toast.error(err.message || "Failed to update password");
      }
    });
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-[#C9A86A]" />
          Change Password
        </CardTitle>
        <CardDescription>
          {hasSavedPassword
            ? "Your current session password is saved below. You can update your password directly by typing a new password."
            : "You can update your password directly by typing and confirming a new password below."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Current Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="current_password">Current Password</Label>
              {hasSavedPassword ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Saved
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Optional</span>
              )}
            </div>
            <div className="relative">
              <Input
                id="current_password"
                type={showCurrentPassword ? "text" : "password"}
                {...register("current_password")}
                placeholder={hasSavedPassword ? "Current password" : "Enter current password (optional)"}
                className="pr-16 font-mono text-sm bg-muted/40"
              />
              {currentPasswordVal ? (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
                  <button
                    type="button"
                    onClick={handleCopyCurrentPassword}
                    className="p-1 hover:text-foreground focus:outline-none transition-colors"
                    title="Copy current password"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="p-1 hover:text-foreground focus:outline-none transition-colors"
                    title={showCurrentPassword ? "Hide current password" : "Show current password"}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {hasSavedPassword
                ? "Click the eye icon to view your current password. To change your password, simply enter a new password below."
                : "You do not need your current password to set a new password. Enter a new password below."}
            </p>
          </div>

          {/* New Password Field */}
          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter at least 6 characters"
                {...register("new_password")}
                className={`pr-10 ${
                  errors.new_password ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                title={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.new_password && (
              <p className="text-xs text-destructive">{errors.new_password.message}</p>
            )}
          </div>

          {/* Confirm New Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                {...register("confirm_password")}
                className={`pr-10 ${
                  errors.confirm_password ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-[#C9A86A] text-white hover:bg-[#b09156]"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Password...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
