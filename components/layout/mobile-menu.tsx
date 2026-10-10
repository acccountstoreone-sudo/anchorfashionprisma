"use client";

import Link from "next/link";
import { Menu, Search, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-full flex-col p-0 sm:max-w-sm"
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b bg-primary p-4 text-primary-foreground">
          <SheetTitle className="font-bold uppercase tracking-tight text-primary-foreground">
            Anchor Fashion
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Mobile Search */}
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full rounded-md bg-muted py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col">

            <Link
              href="/categories/women"
              className="flex items-center justify-between border-b p-4 font-medium"
            >
              Women
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/categories/men"
              className="flex items-center justify-between border-b p-4 font-medium"
            >
              Men
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/categories/accessories"
              className="flex items-center justify-between border-b p-4 font-medium"
            >
              Accessories
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/categories/sale"
              className="flex items-center justify-between border-b p-4 font-medium text-destructive"
            >
              Sale
              <ChevronRight className="h-4 w-4 text-destructive/70" />
            </Link>
          </nav>
        </div>

        <div className="border-t bg-muted/30 p-4">
          <div className="flex flex-col gap-3 text-sm">
            <Link
              href="/account/profile"
              className="font-medium hover:underline"
            >
              My Account
            </Link>
            <Link href="/track" className="font-medium hover:underline">
              Track Order
            </Link>
            <Link href="/contact" className="font-medium hover:underline">
              Support
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
