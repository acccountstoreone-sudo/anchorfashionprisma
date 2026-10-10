"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useState, useEffect, useRef } from "react";

export function ManagerProductSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search") || searchParams.get("q") || "";
  const [query, setQuery] = useState(currentSearch);
  const isInitialMount = useRef(true);

  useEffect(() => {
    setQuery(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (query.trim() === currentSearch.trim()) {
      return;
    }

    const handler = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        const trimmed = query.trim();
        if (trimmed) {
          params.set("search", trimmed);
          params.set("page", "1");
        } else {
          params.delete("search");
          params.delete("q");
        }
        const queryString = params.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [query, currentSearch, pathname, router, searchParams]);

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search products by title, SKU..."
        className="w-full bg-background pl-8"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {isPending && (
        <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      )}
    </div>
  );
}
