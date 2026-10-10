import Link from "next/link";
import { CreditCard, ShieldCheck, Mail, MapPin, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="bg-[#111111] text-white">
      {/* Newsletter & Trust Bar */}
      <div className="border-b border-zinc-800">
        <div className="container mx-auto px-4 py-12 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            {/* Newsletter */}
            <div className="flex flex-col space-y-4">
              <h3 className="text-2xl font-semibold tracking-tight">
                Unlock 10% Off Your First Order
              </h3>
              <p className="text-sm text-zinc-400">
                Subscribe to receive updates, access to exclusive deals, and
                more.
              </p>
              <form className="mt-2 flex w-full max-w-md items-center space-x-2">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  className="h-12 rounded-none border-zinc-700 bg-transparent text-white placeholder:text-zinc-500 focus-visible:ring-zinc-500"
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="h-12 rounded-none border-none bg-white px-6 font-medium uppercase tracking-wider text-black hover:bg-zinc-200"
                >
                  Subscribe
                </Button>
              </form>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:ml-auto">
              <div className="flex flex-col items-center space-y-2 text-center">
                <ShieldCheck className="h-8 w-8 text-zinc-400" />
                <span className="text-xs font-medium uppercase tracking-widest text-zinc-300">
                  Authentic
                  <br />
                  Products
                </span>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <CreditCard className="h-8 w-8 text-zinc-400" />
                <span className="text-xs font-medium uppercase tracking-widest text-zinc-300">
                  Secure
                  <br />
                  Payment
                </span>
              </div>
              <div className="col-span-2 flex flex-col items-center space-y-2 text-center sm:col-span-1">
                <svg
                  className="h-8 w-8 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  ></path>
                </svg>
                <span className="text-xs font-medium uppercase tracking-widest text-zinc-300">
                  Easy
                  <br />
                  Returns
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="container mx-auto px-4 pb-12 pt-16 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Company Info */}
          <div>
            <Link href="/" className="mb-6 inline-block">
              <span className="text-2xl font-extrabold uppercase tracking-[0.2em]">
                Anchor
              </span>
            </Link>
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">
              Elevating the standard of fashion in Bangladesh. Premium quality,
              timeless designs, and unmatched elegance for the modern lifestyle.
            </p>
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4" />{" "}
                <span>Gulshan Avenue, Dhaka, Bangladesh</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4" /> <span>+880 9638-000000</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4" />{" "}
                <span>support@anchorfashion.com.bd</span>
              </div>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="mb-6 text-sm font-medium uppercase tracking-widest">
              Shop
            </h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li>
                <Link
                  href="/categories/women"
                  className="transition-colors hover:text-white"
                >
                  Women's Collection
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/men"
                  className="transition-colors hover:text-white"
                >
                  Men's Collection
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="transition-colors hover:text-white"
                >
                  Kids & Baby
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/accessories"
                  className="transition-colors hover:text-white"
                >
                  Accessories
                </Link>
              </li>
              <li>
                <Link
                  href="/products?sort=newest"
                  className="transition-colors hover:text-white"
                >
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/sale"
                  className="text-red-400 transition-colors hover:text-red-300"
                >
                  Special Offers
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="mb-6 text-sm font-medium uppercase tracking-widest">
              Customer Care
            </h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li>
                <Link
                  href="/account"
                  className="transition-colors hover:text-white"
                >
                  My Account
                </Link>
              </li>
              <li>
                <Link
                  href="/track"
                  className="transition-colors hover:text-white"
                >
                  Track Order
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors hover:text-white"
                >
                  Shipping & Delivery
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors hover:text-white"
                >
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors hover:text-white"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors hover:text-white"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-6 text-sm font-medium uppercase tracking-widest">
              Company
            </h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li>
                <Link
                  href="/about"
                  className="transition-colors hover:text-white"
                >
                  About Anchor
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors hover:text-white"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors hover:text-white"
                >
                  Store Locator
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-white"
                >
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Secondary Footer */}
      <div className="border-t border-zinc-800 bg-black">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row lg:px-8">
          <p className="text-xs tracking-wider text-zinc-500">
            © {new Date().getFullYear()} ANCHOR FASHION. ALL RIGHTS RESERVED.
          </p>

          {/* Payment Methods (Placeholder Icons) */}
          <div className="flex items-center gap-3">
            <span className="mr-2 text-xs uppercase tracking-widest text-zinc-500">
              We Accept:
            </span>
            <div className="flex h-6 w-10 items-center justify-center rounded bg-zinc-800 text-[8px] font-bold text-zinc-400">
              VISA
            </div>
            <div className="flex h-6 w-10 items-center justify-center rounded bg-zinc-800 text-[8px] font-bold text-zinc-400">
              MC
            </div>
            <div className="flex h-6 w-10 items-center justify-center rounded bg-[#e2136e] text-[9px] font-bold text-white">
              bKash
            </div>
            <div className="flex h-6 w-10 items-center justify-center rounded bg-[#f7941d] text-[9px] font-bold text-white">
              Nagad
            </div>
          </div>

          {/* Social Media */}
          <div className="flex gap-4">
            <Link
              href="/"
              className="rounded-full bg-white/10 p-2 transition-colors hover:bg-primary hover:text-white"
            >
              <span className="sr-only">Facebook</span>
            </Link>
            <Link
              href="/"
              className="rounded-full bg-white/10 p-2 transition-colors hover:bg-primary hover:text-white"
            >
              <span className="sr-only">Instagram</span>
            </Link>
            <Link
              href="/"
              className="rounded-full bg-white/10 p-2 transition-colors hover:bg-primary hover:text-white"
            >
              <span className="sr-only">Twitter</span>
            </Link>
            <Link
              href="/"
              className="rounded-full bg-white/10 p-2 transition-colors hover:bg-primary hover:text-white"
            >
              <span className="sr-only">Youtube</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
