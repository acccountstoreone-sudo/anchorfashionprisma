import { Metadata } from "next";
import { WishlistGrid } from "@/components/wishlist/wishlist-grid";
import { fetchWishlistAction } from "@/lib/actions/wishlist.actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Share2, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "My Wishlist | Anchor Fashion",
  description: "View your saved items.",
};

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/account/wishlist");
  }

  // Pre-fetch wishlist on server
  await fetchWishlistAction();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1A1A1A]">My Wishlist</h1>
          <p className="mt-2 text-sm text-gray-500">
            View and manage the items you've saved for later.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9 border-gray-200 text-[#1A1A1A] text-xs font-semibold uppercase tracking-widest">
            <Share2 className="h-3.5 w-3.5 mr-2" /> Share
          </Button>
          <Button size="sm" className="h-9 bg-[#1A1A1A] text-white hover:bg-black text-xs font-semibold uppercase tracking-widest">
            <Plus className="h-3.5 w-3.5 mr-2" /> New Collection
          </Button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-100 overflow-x-auto no-scrollbar pb-2">
        <button className="text-sm font-bold uppercase tracking-widest text-[#1A1A1A] border-b-2 border-[#1A1A1A] pb-2 whitespace-nowrap">
          All Items
        </button>
        <button className="text-sm font-medium uppercase tracking-widest text-gray-400 hover:text-[#1A1A1A] transition-colors pb-2 whitespace-nowrap">
          Summer Looks
        </button>
        <button className="text-sm font-medium uppercase tracking-widest text-gray-400 hover:text-[#1A1A1A] transition-colors pb-2 whitespace-nowrap">
          Evening Wear
        </button>
      </div>

      <WishlistGrid />
    </div>
  );
}
