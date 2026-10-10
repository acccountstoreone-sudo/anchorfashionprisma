"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { createLeadAction } from "@/actions/crm.actions";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
    mode: "onTouched",
  });

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await createLeadAction({
        first_name: data.name,
        email: data.email,
        source: "Contact Us Form",
        notes: `[Subject: ${data.subject}]\n\n${data.message}`,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Thank you! Your message has been sent successfully.");
        reset();
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Send us a Message</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-slate-700"
              >
                Full Name *
              </label>
              <Input
                id="name"
                placeholder="John Doe"
                {...register("name")}
                className={errors.name ? "border-rose-500 focus-visible:ring-rose-500" : ""}
              />
              {errors.name && (
                <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-700"
              >
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                {...register("email")}
                className={errors.email ? "border-rose-500 focus-visible:ring-rose-500" : ""}
              />
              {errors.email && (
                <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="subject"
              className="text-sm font-medium text-slate-700"
            >
              Subject *
            </label>
            <Input
              id="subject"
              placeholder="Order Inquiry, Returns, etc."
              {...register("subject")}
              className={errors.subject ? "border-rose-500 focus-visible:ring-rose-500" : ""}
            />
            {errors.subject && (
              <p className="text-xs text-rose-500 mt-1">{errors.subject.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="message"
              className="text-sm font-medium text-slate-700"
            >
              Message *
            </label>
            <Textarea
              id="message"
              placeholder="How can we help you?"
              className={`min-h-[150px] ${errors.message ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
              {...register("message")}
            />
            {errors.message && (
              <p className="text-xs text-rose-500 mt-1">{errors.message.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
