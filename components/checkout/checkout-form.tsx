"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCheckoutStore } from "@/stores/use-checkout-store";
import { useCartStore } from "@/stores/use-cart-store";
import {
  checkoutFormSchema,
  CheckoutFormValues,
} from "@/schemas/checkout.schema";
import {
  processCheckoutAction,
  sendCodOtpAction,
} from "@/lib/actions/checkout.actions";
import { CodOtpDialog } from "@/components/checkout/cod-otp-dialog";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, ShieldCheck, Lock, Smartphone, Landmark, Banknote, CreditCard } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { AllPaymentConfigs } from "@/lib/actions/payment.actions";
import { ManualPaymentFields } from "@/components/checkout/manual-payment-fields";

export function CheckoutForm({
  checkoutSessionId,
  paymentConfigs,
  cartId,
}: {
  checkoutSessionId: string;
  paymentConfigs?: AllPaymentConfigs;
  cartId?: string;
}) {
  const router = useRouter();
  const { cart } = useCartStore();
  const {
    formData,
    currentStep,
    updateStep,
    setInformation,
    setShipping,
    setPayment,
  } = useCheckoutStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // COD Fraud Shield OTP Verification states
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpTarget, setOtpTarget] = useState("");
  const [otpTargetType, setOtpTargetType] = useState<"email" | "phone">("email");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(60);



  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      information: {
        email: formData.information?.email || "",
        shipping_address: {
          first_name: formData.information?.shipping_address?.first_name || "",
          last_name: formData.information?.shipping_address?.last_name || "",
          phone: formData.information?.shipping_address?.phone || "",
          address_line_1:
            formData.information?.shipping_address?.address_line_1 || "",
          address_line_2:
            formData.information?.shipping_address?.address_line_2 || "",
          city: formData.information?.shipping_address?.city || "",
          postal_code:
            formData.information?.shipping_address?.postal_code || "",
          country:
            formData.information?.shipping_address?.country || "Bangladesh",
        },
        save_information: false,
        create_account: false,
        password: "",
      },
      shipping: {
        shipping_method: formData.shipping?.shipping_method || "home_delivery",
      },
      payment: {
        payment_method: formData.payment?.payment_method || "COD",
        billing_address_same_as_shipping:
          formData.payment?.billing_address_same_as_shipping ?? true,
        manual_payment: {
          sender_number: "",
          transaction_id: "",
          bank_name: "",
          branch_name: "",
          account_holder_name: "",
          notes: "",
        },
      },
      notes: formData.notes || "",
    },
  });

  const billingSameAsShipping = form.watch(
    "payment.billing_address_same_as_shipping"
  );
  const activeStep = currentStep === "COMPLETED" ? "REVIEW" : currentStep;

  // Sync form with external store when loaded/hydrated
  useEffect(() => {
    if (formData.information?.email && !form.getValues("information.email")) {
      form.reset({
        information: {
          email: formData.information?.email || "",
          shipping_address: {
            first_name: formData.information?.shipping_address?.first_name || "",
            last_name: formData.information?.shipping_address?.last_name || "",
            phone: formData.information?.shipping_address?.phone || "",
            address_line_1: formData.information?.shipping_address?.address_line_1 || "",
            address_line_2: formData.information?.shipping_address?.address_line_2 || "",
            city: formData.information?.shipping_address?.city || "",
            postal_code: formData.information?.shipping_address?.postal_code || "",
            country: formData.information?.shipping_address?.country || "Bangladesh",
          },
          save_information: false,
          create_account: false,
          password: "",
        },
        shipping: {
          shipping_method: formData.shipping?.shipping_method || "home_delivery",
        },
        payment: {
          payment_method: formData.payment?.payment_method || "COD",
          billing_address_same_as_shipping:
            formData.payment?.billing_address_same_as_shipping ?? true,
          manual_payment: {
            sender_number: "",
            transaction_id: "",
            bank_name: "",
            branch_name: "",
            account_holder_name: "",
            notes: "",
          },
        },
        notes: formData.notes || "",
      });
    }
  }, [formData, form]);

  const handleNextStep = async (
    step: "INFORMATION" | "SHIPPING" | "PAYMENT" | "REVIEW"
  ) => {
    try {
      if (step === "SHIPPING") {
        const isInfoValid = await form.trigger("information");
        if (!isInfoValid) {
          toast.error("Please fill in all required contact and address details.");
          return;
        }
        const city = form.getValues("information.shipping_address.city");
        const currentShipping = form.getValues("shipping.shipping_method");
        const defaultMethod =
          city && city.toLowerCase().includes("dhaka")
            ? "home_delivery"
            : "home_delivery_outside";
        const methodToSet = currentShipping || defaultMethod;
        form.setValue("shipping.shipping_method", methodToSet, {
          shouldValidate: true,
        });

        setInformation(form.getValues("information"));
        setShipping({ shipping_method: methodToSet });
        updateStep("SHIPPING");
      } else if (step === "PAYMENT") {
        // Ensure shipping method is set
        const currentMethod = form.getValues("shipping.shipping_method");
        if (!currentMethod) {
          form.setValue("shipping.shipping_method", "home_delivery", {
            shouldValidate: true,
          });
        }

        const isShippingValid = await form.trigger("shipping.shipping_method");
        if (!isShippingValid) {
          toast.error("Please select a shipping method.");
          return;
        }

        const isInfoValid = await form.trigger("information");
        if (!isInfoValid) {
          toast.error("Please complete your shipping address details first.");
          updateStep("INFORMATION");
          return;
        }

        setInformation(form.getValues("information"));
        setShipping(form.getValues("shipping"));
        updateStep("PAYMENT");
      } else if (step === "REVIEW") {
        const isPaymentValid = await form.trigger("payment");
        if (!isPaymentValid) {
          toast.error("Please complete your payment details.");
          return;
        }
        setPayment(form.getValues("payment"));
        updateStep("REVIEW");
      }
    } catch (err) {
      console.error("Step navigation error:", err);
      updateStep(step);
    }
  };

  const activeCartId = cartId || cart?.id;

  const onInvalid = (errors: any) => {
    console.error("Checkout form validation errors:", errors);

    if (errors.information) {
      const firstKey = Object.keys(errors.information)[0];
      const infoErr = errors.information[firstKey];
      let msg = "Please complete all required contact & shipping address details.";
      if (typeof infoErr?.message === "string") {
        msg = infoErr.message;
      } else if (errors.information.shipping_address) {
        const subKey = Object.keys(errors.information.shipping_address)[0];
        if (errors.information.shipping_address[subKey]?.message) {
          msg = errors.information.shipping_address[subKey].message;
        }
      }
      toast.error(msg);
      updateStep("INFORMATION");
      return;
    }

    if (errors.shipping) {
      toast.error(errors.shipping.shipping_method?.message || "Please select a shipping method.");
      updateStep("SHIPPING");
      return;
    }

    if (errors.payment) {
      const payErr =
        errors.payment.payment_method?.message ||
        errors.payment.manual_payment?.sender_number?.message ||
        errors.payment.manual_payment?.transaction_id?.message ||
        errors.payment.billing_address?.message ||
        "Please complete all required payment details.";
      toast.error(payErr);
      return;
    }

    toast.error("Please fill in all required fields before completing your order.");
  };

  const onSubmit = async (data: CheckoutFormValues) => {
    const finalCartId = activeCartId;
    if (!finalCartId) {
      toast.error("Cart not found or session expired. Please refresh the page.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await processCheckoutAction(finalCartId, checkoutSessionId, data);

      // Check if server-side COD Fraud Shield requires OTP verification
      if (res.verificationRequired) {
        setOtpTarget(res.maskedTarget || data.information.email);
        setOtpTargetType(res.targetType || "email");
        setOtpCooldown(res.remainingCooldownSeconds || 60);
        setOtpError(null);
        setShowOtpDialog(true);
        setIsSubmitting(false);
        return;
      }

      if (res.success && res.orderId) {
        toast.success("Order placed successfully!");
        if (data.payment.payment_method === "SSLCOMMERZ") {
          // Redirect to payment initialization endpoint for gateway integration via full window navigation
          window.location.href = `/api/payment/init?order_id=${res.orderId}&method=SSLCOMMERZ`;
          return;
        } else {
          router.push(`/checkout/success?order_id=${res.orderId}`);
        }
      } else {
        toast.error(res.error || "Failed to process checkout");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    const finalCartId = activeCartId;
    if (!finalCartId) return;
    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      const currentData = form.getValues();
      const res = await processCheckoutAction(
        finalCartId,
        checkoutSessionId,
        currentData,
        otp
      );

      if (res.success && res.orderId) {
        setShowOtpDialog(false);
        toast.success("Order verified and placed successfully!");
        if (currentData.payment.payment_method === "SSLCOMMERZ") {
          window.location.href = `/api/payment/init?order_id=${res.orderId}&method=SSLCOMMERZ`;
          return;
        }
        router.push(`/checkout/success?order_id=${res.orderId}`);
      } else {
        setOtpError(res.error || "Failed to verify code. Please try again.");
      }
    } catch {
      setOtpError("An error occurred during verification. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResendingOtp(true);
    try {
      const currentData = form.getValues();
      const res = await sendCodOtpAction(checkoutSessionId, currentData);
      if (res.success) {
        toast.success("A new verification code has been dispatched.");
        setOtpError(null);
      } else {
        setOtpError(res.error || "Failed to resend verification code.");
      }
    } catch {
      setOtpError("Failed to resend verification code.");
    } finally {
      setIsResendingOtp(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
        {/* Step 1: Information */}
        <div
          className={`space-y-6 ${activeStep !== "INFORMATION" && "hidden"}`}
        >
          <div>
            <h2 className="mb-4 text-xl font-semibold">Contact Information</h2>
            <FormField
              control={form.control}
              name="information.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <h2 className="mb-4 mt-8 text-xl font-semibold">
              Shipping Address
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="information.shipping_address.first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="information.shipping_address.last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="information.shipping_address.phone"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="01XXXXXXXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="information.shipping_address.address_line_1"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="House, Road, Area" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-4 grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="information.shipping_address.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Dhaka" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="information.shipping_address.postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="1212" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="mt-4 p-4 border border-[#222] rounded-lg bg-[#111]">
            <FormField
              control={form.control}
              name="information.create_account"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer font-medium">
                      Save details & create an account
                    </FormLabel>
                    <p className="text-xs text-gray-400 mt-1">
                      Check this box to easily track your order and checkout faster next time.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("information.create_account") && (
              <FormField
                control={form.control}
                name="information.password"
                render={({ field }) => (
                  <FormItem className="mt-4 animate-in slide-in-from-top-2">
                    <FormLabel>Set a Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <Button
            type="button"
            size="lg"
            className="mt-6 w-full h-12 bg-[#1A1A1A] text-xs font-bold uppercase tracking-widest text-white hover:bg-black"
            onClick={() => handleNextStep("SHIPPING")}
          >
            Continue to Shipping <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Step 2: Shipping */}
        <div className={`space-y-6 ${activeStep !== "SHIPPING" && "hidden"}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Shipping Method</h2>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => updateStep("INFORMATION")}
            >
              Edit Information
            </Button>
          </div>

          <FormField
            control={form.control}
            name="shipping.shipping_method"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormControl>
                  <RadioGroup
                    value={field.value || "home_delivery"}
                    onValueChange={(val) => {
                      field.onChange(val);
                      setShipping({ shipping_method: val });
                    }}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border border-border p-4 transition-colors hover:border-primary/60 hover:bg-muted/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 cursor-pointer">
                      <FormControl>
                        <RadioGroupItem value="home_delivery" />
                      </FormControl>
                      <div className="flex flex-1 justify-between items-center cursor-pointer">
                        <div className="flex flex-col">
                          <FormLabel className="cursor-pointer font-medium text-foreground text-sm">
                            Home Delivery (Inside Dhaka)
                          </FormLabel>
                          <span className="text-xs text-muted-foreground mt-0.5">Est. 1-2 business days</span>
                        </div>
                        <span className="font-semibold text-foreground">
                          ৳ 100
                        </span>
                      </div>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border border-border p-4 transition-colors hover:border-primary/60 hover:bg-muted/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 cursor-pointer">
                      <FormControl>
                        <RadioGroupItem value="home_delivery_outside" />
                      </FormControl>
                      <div className="flex flex-1 justify-between items-center cursor-pointer">
                        <div className="flex flex-col">
                          <FormLabel className="cursor-pointer font-medium text-foreground text-sm">
                            Home Delivery (Outside Dhaka)
                          </FormLabel>
                          <span className="text-xs text-muted-foreground mt-0.5">Est. 3-5 business days</span>
                        </div>
                        <span className="font-semibold text-foreground">
                          ৳ 150
                        </span>
                      </div>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="button"
            size="lg"
            className="mt-6 w-full h-12 bg-[#1A1A1A] text-xs font-bold uppercase tracking-widest text-white hover:bg-black dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
            onClick={() => handleNextStep("PAYMENT")}
          >
            Continue to Payment <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Step 3: Payment */}
        <div
          className={`space-y-6 ${activeStep !== "PAYMENT" && activeStep !== "REVIEW" && "hidden"}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Payment</h2>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => updateStep("SHIPPING")}
            >
              Edit Shipping
            </Button>
          </div>

          <FormField
            control={form.control}
            name="payment.payment_method"
            render={({ field }) => {
              const currentConfigs = paymentConfigs;
              const isCodEnabled = currentConfigs?.cod?.enabled ?? true;
              const isBkashEnabled = currentConfigs?.bkash?.enabled ?? true;
              const isNagadEnabled = currentConfigs?.nagad?.enabled ?? true;
              const isRocketEnabled = currentConfigs?.rocket?.enabled ?? true;
              const isBankEnabled = currentConfigs?.bank?.enabled ?? true;
              const isSslEnabled = currentConfigs?.sslcommerz?.enabled ?? true;

              const activeConfig =
                field.value === "COD"
                  ? currentConfigs?.cod
                  : field.value === "BKASH"
                  ? currentConfigs?.bkash
                  : field.value === "NAGAD"
                  ? currentConfigs?.nagad
                  : field.value === "ROCKET"
                  ? currentConfigs?.rocket
                  : field.value === "BANK_TRANSFER" || field.value === "BANK"
                  ? currentConfigs?.bank
                  : currentConfigs?.sslcommerz;

              return (
                <FormItem className="space-y-4">
                  <FormControl>
                    <RadioGroup
                      value={field.value || "COD"}
                      onValueChange={(val) => {
                        field.onChange(val);
                        setPayment({
                          ...form.getValues("payment"),
                          payment_method: val,
                        });
                      }}
                      className="flex flex-col space-y-2"
                    >
                      {isCodEnabled && (
                        <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border border-border p-4 transition-colors hover:border-primary/60 hover:bg-muted/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 cursor-pointer">
                          <FormControl>
                            <RadioGroupItem value="COD" />
                          </FormControl>
                          <div className="flex flex-1 items-center justify-between cursor-pointer">
                            <FormLabel className="cursor-pointer font-medium text-foreground text-sm">
                              Cash on Delivery (ক্যাশ অন ডেলিভারি)
                            </FormLabel>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Cash
                            </span>
                          </div>
                        </FormItem>
                      )}

                      {isBkashEnabled && (
                        <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border border-border p-4 transition-colors hover:border-[#E2136E]/60 hover:bg-pink-50/20 data-[state=checked]:border-[#E2136E] data-[state=checked]:bg-pink-50/30 cursor-pointer">
                          <FormControl>
                            <RadioGroupItem value="BKASH" />
                          </FormControl>
                          <div className="flex flex-1 items-center justify-between cursor-pointer">
                            <FormLabel className="cursor-pointer font-medium flex items-center gap-2 text-foreground text-sm">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#E2136E]" />
                              bKash (বিকাশ)
                            </FormLabel>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-pink-100 text-[#E2136E] dark:bg-pink-950 dark:text-pink-300">
                              {currentConfigs?.bkash?.account_type || "Personal"}
                            </span>
                          </div>
                        </FormItem>
                      )}

                      {isNagadEnabled && (
                        <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border border-border p-4 transition-colors hover:border-[#F7941D]/60 hover:bg-orange-50/20 data-[state=checked]:border-[#F7941D] data-[state=checked]:bg-orange-50/30 cursor-pointer">
                          <FormControl>
                            <RadioGroupItem value="NAGAD" />
                          </FormControl>
                          <div className="flex flex-1 items-center justify-between cursor-pointer">
                            <FormLabel className="cursor-pointer font-medium flex items-center gap-2 text-foreground text-sm">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#F7941D]" />
                              Nagad (নগদ)
                            </FormLabel>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-orange-100 text-[#F7941D] dark:bg-orange-950 dark:text-orange-300">
                              {currentConfigs?.nagad?.account_type || "Personal"}
                            </span>
                          </div>
                        </FormItem>
                      )}

                      {isRocketEnabled && (
                        <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border border-border p-4 transition-colors hover:border-[#8C3494]/60 hover:bg-purple-50/20 data-[state=checked]:border-[#8C3494] data-[state=checked]:bg-purple-50/30 cursor-pointer">
                          <FormControl>
                            <RadioGroupItem value="ROCKET" />
                          </FormControl>
                          <div className="flex flex-1 items-center justify-between cursor-pointer">
                            <FormLabel className="cursor-pointer font-medium flex items-center gap-2 text-foreground text-sm">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#8C3494]" />
                              Rocket (রকেট)
                            </FormLabel>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-[#8C3494] dark:bg-purple-950 dark:text-purple-300">
                              {currentConfigs?.rocket?.account_type || "Personal"}
                            </span>
                          </div>
                        </FormItem>
                      )}

                      {isBankEnabled && (
                        <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border border-border p-4 transition-colors hover:border-blue-600/60 hover:bg-blue-50/20 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-50/30 cursor-pointer">
                          <FormControl>
                            <RadioGroupItem value="BANK_TRANSFER" />
                          </FormControl>
                          <div className="flex flex-1 items-center justify-between cursor-pointer">
                            <FormLabel className="cursor-pointer font-medium flex items-center gap-2 text-foreground text-sm">
                              <Landmark className="h-4 w-4 text-blue-600" />
                              Bank Transfer / Deposit (ব্যাংক ট্রান্সফার)
                            </FormLabel>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              BEFTN / NPSB
                            </span>
                          </div>
                        </FormItem>
                      )}

                      {isSslEnabled && (
                        <FormItem className="flex items-start space-x-3 space-y-0 rounded-lg border border-border p-4 transition-colors hover:border-emerald-600/60 hover:bg-emerald-50/10 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-50/20 data-[state=checked]:ring-1 data-[state=checked]:ring-emerald-600 cursor-pointer">
                          <FormControl className="mt-1">
                            <RadioGroupItem value="SSLCOMMERZ" />
                          </FormControl>
                          <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer">
                            <div>
                              <FormLabel className="cursor-pointer font-medium flex items-center gap-2 text-sm text-foreground">
                                <CreditCard className="h-4 w-4 text-emerald-600" />
                                <span>Cards / Mobile Banking (SSLCommerz Gateway)</span>
                              </FormLabel>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Visa, MasterCard, bKash, Nagad, Rocket, Net Banking
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/50">
                                Instant Auto-Pay
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/50">VISA</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/50">Mastercard</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-50 text-[#E2136E] dark:bg-pink-950/50 dark:text-pink-300 border border-pink-200/50">bKash</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-[#F7941D] dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200/50">Nagad</span>
                              </div>
                            </div>
                          </div>
                        </FormItem>
                      )}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />

                  {/* Dynamic Instructions and Payment Input Form */}
                  <div className="pt-2">
                    <ManualPaymentFields
                      form={form}
                      selectedMethod={field.value}
                      config={activeConfig}
                    />
                  </div>
                </FormItem>
              );
            }}
          />

          <div className="mt-8">
            <h3 className="mb-4 text-lg font-medium">Billing Address</h3>
            <FormField
              control={form.control}
              name="payment.billing_address_same_as_shipping"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Same as shipping address
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="mt-8">
                <FormLabel>Order Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any special instructions?"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-500">
            <Lock className="h-3 w-3" />
            <span>Payments are secure and encrypted.</span>
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-4 w-full h-14 bg-[#1A1A1A] text-sm font-bold uppercase tracking-widest text-white hover:bg-black"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Order...
              </>
            ) : (
              "Complete Order"
            )}
          </Button>
        </div>
      </form>

      {/* COD Fraud Shield Verification Dialog */}
      <CodOtpDialog
        open={showOtpDialog}
        onOpenChange={setShowOtpDialog}
        maskedTarget={otpTarget}
        targetType={otpTargetType}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        isVerifying={isVerifyingOtp}
        isResending={isResendingOtp}
        initialCooldown={otpCooldown}
        errorMessage={otpError}
      />
    </Form>
  );
}
