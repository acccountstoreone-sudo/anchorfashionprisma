"use client";

import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { CheckoutFormValues } from "@/schemas/checkout.schema";
import { PaymentGatewayConfig } from "@/lib/actions/payment.actions";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Info, Landmark, Smartphone, ShieldAlert, ShieldCheck, CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";

interface ManualPaymentFieldsProps {
  form: UseFormReturn<CheckoutFormValues>;
  selectedMethod: string;
  config?: PaymentGatewayConfig;
}

export function ManualPaymentFields({
  form,
  selectedMethod,
  config,
}: ManualPaymentFieldsProps) {
  const [copied, setCopied] = useState(false);
  const method = selectedMethod.toUpperCase();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Account number copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  if (method === "COD") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-emerald-800">Cash on Delivery (ক্যাশ অন ডেলিভারি)</p>
          <p className="text-emerald-700 leading-relaxed">
            {config?.instructions ||
              "পণ্য হাতে পেয়ে দেখে ডেলিভারি ম্যানের কাছে মূল্য পরিশোধ করুন। ঢাকার ভেতরে ১-২ দিন এবং ঢাকার বাইরে ৩-৫ দিনে ডেলিভারি সম্পন্ন হবে।"}
          </p>
        </div>
      </div>
    );
  }

  if (method === "SSLCOMMERZ") {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-card p-5 shadow-sm space-y-4 animate-in fade-in-50 duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                SSLCommerz Instant Payment
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold border border-emerald-300/40">
                  <Check className="h-3 w-3" /> Auto Confirm
                </span>
              </h4>
              <p className="text-xs text-muted-foreground">
                সুরক্ষিত অনলাইন পেমেন্ট গেটওয়ে
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground border border-border shadow-xs">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span>256-bit SSL</span>
          </div>
        </div>

        {/* Channels Grid */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            সমর্থিত পেমেন্ট মাধ্যমসমূহ (Supported Channels):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5 shadow-xs">
              <CreditCard className="h-4 w-4 text-blue-600 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-foreground">Debit / Credit Card</p>
                <p className="text-[10px] text-muted-foreground">Visa, Mastercard, Amex, Nexus</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5 shadow-xs">
              <Smartphone className="h-4 w-4 text-pink-600 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-foreground">Mobile Banking</p>
                <p className="text-[10px] text-muted-foreground">bKash, Nagad, Rocket, Upay</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5 shadow-xs">
              <Landmark className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-foreground">Internet Banking</p>
                <p className="text-[10px] text-muted-foreground">City Touch, EBL, IBBL, Bank Asia</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 p-3 text-xs text-foreground space-y-1">
          <p className="font-medium flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
            <Info className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
            পেমেন্ট নির্দেশিকা:
          </p>
          <ul className="list-disc pl-4 space-y-0.5 text-emerald-950 dark:text-emerald-200 text-[11px] leading-relaxed">
            <li>নিচের <strong>&quot;Complete Order&quot;</strong> বাটনে ক্লিক করলেই নিরাপদ SSLCommerz পোর্টালে নিয়ে যাওয়া হবে।</li>
            <li>সেখানে আপনার কার্ড অথবা বিকাশ/নগদ সিলেক্ট করে পিন ও ওটিপি দিয়ে পেমেন্ট করুন।</li>
            <li>পেমেন্ট শেষ হওয়ামাত্র স্বয়ংক্রিয়ভাবে আপনার অর্ডারটি কনফার্ম হয়ে যাবে (কোনো ট্রানজ্যাকশন আইডি কপি-পেস্টের প্রয়োজন নেই)।</li>
          </ul>
        </div>
      </div>
    );
  }

  const isBkash = method === "BKASH";
  const isNagad = method === "NAGAD";
  const isRocket = method === "ROCKET";
  const isBank = method === "BANK_TRANSFER" || method === "BANK";

  const brandColor = isBkash
    ? "border-pink-300 bg-pink-50/60 text-pink-950"
    : isNagad
    ? "border-orange-300 bg-orange-50/60 text-orange-950"
    : isRocket
    ? "border-purple-300 bg-purple-50/60 text-purple-950"
    : "border-sky-300 bg-sky-50/60 text-sky-950";

  const brandBadge = isBkash
    ? "bg-pink-600 text-white"
    : isNagad
    ? "bg-orange-600 text-white"
    : isRocket
    ? "bg-purple-600 text-white"
    : "bg-slate-800 text-white";

  const accountNumber =
    config?.account_number ||
    (isBkash
      ? "01700000000"
      : isNagad
      ? "01800000000"
      : isRocket
      ? "01900000000-0"
      : "123.456.7890");

  const accountType = config?.account_type || "Personal";

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-in fade-in-50 duration-200">
      {/* Merchant / Receiver Info Banner */}
      <div className={`rounded-lg border p-4 text-xs ${brandColor} space-y-2`}>
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${brandBadge}`}>
            {method.replace(/_/g, " ")} ({accountType})
          </span>
          {accountNumber && (
            <button
              type="button"
              onClick={() => handleCopy(accountNumber)}
              className="inline-flex items-center gap-1 font-semibold text-[11px] bg-white/80 hover:bg-white px-2 py-0.5 rounded border shadow-xs transition"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Copy Number"}</span>
            </button>
          )}
        </div>

        {isBank ? (
          <div className="space-y-1.5 pt-1 text-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 font-medium">Bank Name:</span>{" "}
                <span className="font-bold">{config?.bank_name || "Dutch-Bangla Bank Ltd"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Account Name:</span>{" "}
                <span className="font-bold">{config?.account_name || "Anchor Fashion Ltd"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Account Number:</span>{" "}
                <span className="font-mono font-bold">{accountNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Branch Name:</span>{" "}
                <span className="font-bold">{config?.branch_name || "Gulshan Branch, Dhaka"}</span>
              </div>
              {config?.routing_number && (
                <div>
                  <span className="text-slate-500 font-medium">Routing No:</span>{" "}
                  <span className="font-mono font-bold">{config.routing_number}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <Smartphone className="h-4 w-4 opacity-70" />
            <span className="text-sm font-bold font-mono tracking-wider">{accountNumber}</span>
            <span className="text-[11px] font-medium opacity-80">({accountType})</span>
          </div>
        )}

        <p className="text-[11px] leading-relaxed pt-1 border-t border-black/5 opacity-90">
          {config?.instructions ||
            `Please transfer your total order amount to the ${accountType} account above. Once completed, enter your sender details and Transaction ID (TrxID) below.`}
        </p>
      </div>

      {/* Customer Input Fields */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
          <span>Payment Submission Details (পেমেন্টের তথ্য প্রদান করুন)</span>
        </div>

        {isBank ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="payment.manual_payment.bank_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Your Bank Name (প্রেরক ব্যাংক)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. City Bank, Brac Bank, DBBL" {...field} value={field.value || ""} className="h-9 text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment.manual_payment.account_holder_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Account Holder / Depositor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Tanvir Ahmed" {...field} value={field.value || ""} className="h-9 text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment.manual_payment.transaction_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Deposit Slip No / Transaction Reference <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. DEP-98271625 / TXN109283" {...field} value={field.value || ""} className="h-9 text-xs font-mono" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="payment.manual_payment.sender_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Sender {method} Number (যে নম্বর থেকে পাঠিয়েছেন) <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="01XXXXXXXXX"
                      {...field}
                      value={field.value || ""}
                      className="h-9 text-xs font-mono"
                      maxLength={14}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment.manual_payment.transaction_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Transaction ID (TrxID) <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 9K28A19XKL"
                      {...field}
                      value={field.value || ""}
                      className="h-9 text-xs font-mono uppercase"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="payment.manual_payment.notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Additional Payment Reference / Note (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Optional reference, counter number, or notes"
                  {...field}
                  value={field.value || ""}
                  className="h-9 text-xs"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
