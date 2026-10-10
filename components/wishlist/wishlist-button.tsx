"use client";

import { useWishlistStore } from "@/stores/use-wishlist-store";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { useRouter, usePathname } from "next/navigation";

interface WishlistButtonProps {
  productId: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function WishlistButton({
  productId,
  className,
  variant = "outline",
  size = "icon",
}: WishlistButtonProps) {
  const { wishlist, addItem, removeItem, isLoading } = useWishlistStore();
  const { user } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Check if item is in wishlist
  const wishlistItem = wishlist?.items?.find(
    (item) => item.product_id === productId
  );
  const isWishlisted = !!wishlistItem;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Auth gate: redirect to login if not authenticated
    if (!user) {
      toast.info("Please log in to add items to your wishlist.");
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isWishlisted && wishlistItem) {
      await removeItem(wishlistItem.id);
      toast.success("Removed from wishlist");
    } else {
      await addItem(productId);
      toast.success("Added to wishlist ❤️");
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("transition-colors", className)}
      onClick={handleToggle}
      disabled={isLoading}
      title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-transform hover:scale-110",
          isWishlisted && "fill-red-600 text-red-600"
        )}
      />
    </Button>
  );
}
