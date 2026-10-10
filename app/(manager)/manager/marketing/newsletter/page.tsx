import React from "react";
import { Metadata } from "next";
import { NewsletterRepository } from "@/lib/repositories/marketing/newsletter.repository";
import { NewsletterClient } from "@/features/marketing/components/NewsletterClient";

export const metadata: Metadata = {
  title: "Newsletter & Subscribers | Marketing | Manager Dashboard",
  description: "View customer newsletter subscribers and subscriber lists.",
};

export const dynamic = "force-dynamic";

export default async function ManagerNewsletterPage() {
  const subscribers = await NewsletterRepository.getSubscribers();

  return <NewsletterClient initialSubscribers={subscribers || []} />;
}
