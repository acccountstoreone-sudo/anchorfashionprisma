import React from "react";
import { Metadata } from "next";
import { NewsletterRepository } from "@/lib/repositories/marketing/newsletter.repository";
import { NewsletterClient } from "@/features/marketing/components/NewsletterClient";

export const metadata: Metadata = {
  title: "Newsletter Subscribers | Marketing | Anchor Fashion Enterprise",
  description: "Manage customer email subscriptions and opt-in channels",
};

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  const subscribers = await NewsletterRepository.getSubscribers();

  return <NewsletterClient initialSubscribers={subscribers || []} />;
}
