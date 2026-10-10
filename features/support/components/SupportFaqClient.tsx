"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, HelpCircle, ArrowRight, MessageSquare, Phone, Mail, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQItem } from "@/app/actions/cms/faq-policy.actions";

interface SupportFaqClientProps {
  faqs: FAQItem[];
}

export function SupportFaqClient({ faqs }: SupportFaqClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Derive unique categories
  const categories = Array.from(new Set(faqs.map((f) => f.category))).filter(Boolean);

  // Filter FAQs
  const filtered = faqs.filter((item) => {
    const matchesCategory =
      selectedCategory === "ALL" || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Search Header Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-xs">
        <div className="max-w-xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C9A86A]/10 text-[#A08040] text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Instant Answers & Guidelines</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
            How can we assist you today?
          </h2>
          <p className="text-xs md:text-sm text-gray-500">
            Search our frequently asked questions or select a topic below.
          </p>

          <div className="relative mt-4">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by keywords (e.g. delivery, exchange, bKash, size)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-sm"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedCategory === "ALL"
                ? "bg-[#0D1B2A] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200/70"
            }`}
          >
            All Questions ({faqs.length})
          </button>
          {categories.map((cat) => {
            const count = faqs.filter((f) => f.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-[#0D1B2A] text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200/70"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Accordion Questions List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <HelpCircle className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No questions found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            We couldn't find any FAQs matching "{searchQuery}". Please try another keyword or reach out directly to customer care.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
              }}
              className="text-xs"
            >
              Clear Search
            </Button>
            <Button asChild size="sm" className="bg-[#0D1B2A] hover:bg-black text-white text-xs">
              <Link href="/contact">Ask Support</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-xs">
          <Accordion type="single" collapsible className="w-full divide-y divide-gray-100">
            {filtered.map((item, index) => (
              <AccordionItem key={item.id || index} value={`faq-${index}`} className="border-none py-2">
                <AccordionTrigger className="hover:no-underline text-left text-sm md:text-base font-semibold text-gray-900 group">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 pr-4 text-left">
                    <span className="group-hover:text-[#C9A86A] transition-colors">
                      {item.question}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] w-fit font-normal text-gray-500 bg-gray-50 border-gray-200 group-hover:border-[#C9A86A]/40"
                    >
                      {item.category}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-xs md:text-sm text-gray-600 leading-relaxed pt-2 pb-4 whitespace-pre-line">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* Helpful Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/support/shipping"
          className="group rounded-2xl border border-gray-200 bg-white p-5 hover:border-gray-300 transition-all flex items-center justify-between"
        >
          <div>
            <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#C9A86A] transition-colors">
              Shipping & Return Policies
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              View nationwide delivery charges and 7-day exchange rules
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/support/track-order"
          className="group rounded-2xl border border-gray-200 bg-white p-5 hover:border-gray-300 transition-all flex items-center justify-between"
        >
          <div>
            <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#C9A86A] transition-colors">
              Track Your Order
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Live status update using your Order ID and phone number
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}
