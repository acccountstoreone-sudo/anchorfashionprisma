"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductSearchBarProps {
  /** Initial search term from server (searchParams.q) */
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export function ProductSearchBar({
  defaultValue = "",
  placeholder = "Search products…",
  className,
}: ProductSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync if user navigates back/forward or clears via filter badge
  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  const navigate = (term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = term.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    // Reset to page 1 on new search
    params.delete("page");
    startTransition(() => router.push(`/products?${params.toString()}`));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setValue(term);

    // Debounce — wait 350ms after user stops typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate(term);
    }, 350);
  };

  const handleClear = () => {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate(value);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative w-full", className)}>
      {/* Search icon or spinner */}
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C9A86A]" />
        ) : (
          <Search className="h-3.5 w-3.5" />
        )}
      </span>

      <input
        type="search"
        name="q"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Search products"
        className={cn(
          "h-9 sm:h-10 w-full rounded-lg border border-gray-200 bg-gray-50/70 pl-8 sm:pl-9 pr-8",
          "text-xs sm:text-sm text-gray-900 placeholder:text-gray-400",
          "focus:border-[#C9A86A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C9A86A]",
          "transition-all duration-200",
          isPending && "opacity-80"
        )}
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
}
