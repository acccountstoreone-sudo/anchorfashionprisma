"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bookmark, BookmarkCheck, X, ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Bookmark {
  label: string;
  href: string;
  addedAt: number;
}

const STORAGE_KEY = "anchor-admin-bookmarks";
const DEFAULT_BOOKMARKS: Bookmark[] = [
  { label: "Dashboard", href: "/admin", addedAt: 0 },
  { label: "Products", href: "/admin/products", addedAt: 0 },
  { label: "Orders", href: "/admin/orders", addedAt: 0 },
];

function getPageLabel(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  // Turn e.g. "admin/orders/processing" → "Processing"
  const last = parts[parts.length - 1];
  if (!last) return "Dashboard";
  return last
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function loadBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Bookmark[];
  } catch {}
  return DEFAULT_BOOKMARKS;
}

function saveBookmarks(bookmarks: Bookmark[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {}
}

import {
  getUserBookmarksAction,
  addBookmarkAction,
  removeBookmarkAction,
} from "@/actions/admin/bookmarks.actions";

export function AdminBookmarksMenu() {
  const pathname = usePathname();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Instant initial load from cache if available
    const cached = loadBookmarks();
    if (cached.length > 0) setBookmarks(cached);

    // Sync authoritative state from database
    getUserBookmarksAction().then((res) => {
      if (res.data && res.data.length > 0) {
        const synced = res.data.map((item) => ({
          label: item.label,
          href: item.href,
          addedAt: new Date(item.created_at).getTime(),
        }));
        setBookmarks(synced);
        saveBookmarks(synced);
      }
    });
  }, []);

  const isBookmarked = mounted && bookmarks.some((b) => b.href === pathname);

  const toggleBookmark = useCallback(async () => {
    if (bookmarks.some((b) => b.href === pathname)) {
      // Optimistic remove
      const next = bookmarks.filter((b) => b.href !== pathname);
      setBookmarks(next);
      saveBookmarks(next);
      toast.success("Removed from bookmarks");

      try {
        await removeBookmarkAction(pathname);
      } catch (err) {
        console.warn("Bookmark deletion sync:", err);
      }
    } else {
      // Optimistic add
      const label = getPageLabel(pathname);
      const newBm = { label, href: pathname, addedAt: Date.now() };
      const next = [...bookmarks, newBm];
      setBookmarks(next);
      saveBookmarks(next);
      toast.success(`"${label}" bookmarked!`);

      try {
        await addBookmarkAction(label, pathname);
      } catch (err) {
        console.warn("Bookmark addition sync:", err);
      }
    }
  }, [bookmarks, pathname]);

  const removeBookmark = useCallback(async (href: string) => {
    const next = bookmarks.filter((b) => b.href !== href);
    setBookmarks(next);
    saveBookmarks(next);
    toast.success("Bookmark removed");

    try {
      await removeBookmarkAction(href);
    } catch (err) {
      console.warn("Bookmark removal sync:", err);
    }
  }, [bookmarks]);

  if (!mounted) {
    // Render placeholder button to prevent layout shift during SSR
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"
      >
        <Bookmark className="h-[18px] w-[18px]" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors",
            isBookmarked
              ? "text-amber-500 dark:text-amber-400"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          )}
          title="Bookmarks"
        >
          <Bookmark className={cn("h-[18px] w-[18px]", isBookmarked && "fill-current text-amber-500 dark:text-amber-400")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 mt-2 rounded-xl p-0 shadow-lg border border-border bg-popover">
        <DropdownMenuLabel className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 dark:text-amber-400 fill-amber-500/20" />
            <span className="font-bold text-sm text-foreground">Bookmarks</span>
          </div>
          <span className="text-xs text-muted-foreground">{bookmarks.length} saved</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />

        {/* Current page quick-add/remove */}
        <div className="px-3 py-2.5 border-b border-border">
          <button
            onClick={toggleBookmark}
            className={cn(
              "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isBookmarked
                ? "bg-[#00A1FF]/10 text-[#00A1FF] hover:bg-[#00A1FF]/20"
                : "hover:bg-muted text-foreground"
            )}
          >
            {isBookmarked ? (
              <>
                <BookmarkCheck className="h-4 w-4 shrink-0 fill-current" />
                <span>Remove this page from bookmarks</span>
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4 shrink-0" />
                <span>Bookmark current page</span>
              </>
            )}
          </button>
        </div>

        {/* Saved bookmarks list */}
        <div className="max-h-[280px] overflow-y-auto">
          {bookmarks.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No bookmarks yet.</p>
              <p className="text-xs mt-1">Bookmark your most visited pages for quick access.</p>
            </div>
          ) : (
            <div className="py-1">
              {bookmarks.map((bm) => (
                <div
                  key={bm.href}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-1.5 mx-2 my-0.5 rounded-lg transition-colors hover:bg-muted",
                    pathname === bm.href && "bg-[#00A1FF]/8"
                  )}
                >
                  <Link
                    href={bm.href}
                    className={cn(
                      "flex-1 flex items-center gap-2 text-sm py-1",
                      pathname === bm.href ? "font-semibold text-[#00A1FF]" : "text-foreground/80"
                    )}
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{bm.label}</span>
                    {pathname === bm.href && (
                      <span className="ml-auto shrink-0 text-[10px] bg-[#00A1FF]/15 text-[#00A1FF] rounded-full px-1.5 py-0.5 font-medium">
                        Current
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={() => removeBookmark(bm.href)}
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                    title="Remove bookmark"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
