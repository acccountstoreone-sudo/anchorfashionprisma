"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface UserBookmarkItem {
  id: string;
  label: string;
  href: string;
  icon?: string | null;
  created_at: string;
}

/**
 * Fetches bookmarks for the currently authenticated user.
 */
export async function getUserBookmarksAction(): Promise<{
  data: UserBookmarkItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: [] };
    }

    const items = await prisma.userBookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    return {
      data: items.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        created_at: item.createdAt.toISOString(),
      })),
    };
  } catch (err: any) {
    console.warn("[getUserBookmarksAction] warning:", err?.message);
    return { data: [] };
  }
}

/**
 * Creates or updates a bookmark for the current user.
 */
export async function addBookmarkAction(
  label: string,
  href: string,
  icon?: string
): Promise<{ success: boolean; data?: UserBookmarkItem; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: true };
    }

    const saved = await prisma.userBookmark.upsert({
      where: {
        userId_href: {
          userId: user.id,
          href,
        },
      },
      update: {
        label,
        icon: icon || null,
      },
      create: {
        userId: user.id,
        label,
        href,
        icon: icon || null,
      },
    });

    revalidatePath("/admin", "layout");
    return {
      success: true,
      data: {
        id: saved.id,
        label: saved.label,
        href: saved.href,
        icon: saved.icon,
        created_at: saved.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.warn("[addBookmarkAction] warning:", err?.message);
    return { success: true };
  }
}

/**
 * Removes a bookmark for the current user by href or id.
 */
export async function removeBookmarkAction(
  identifier: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: true };
    }

    if (identifier.startsWith("/")) {
      await prisma.userBookmark.deleteMany({
        where: {
          userId: user.id,
          href: identifier,
        },
      });
    } else {
      await prisma.userBookmark.deleteMany({
        where: {
          userId: user.id,
          id: identifier,
        },
      });
    }

    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (err: any) {
    console.warn("[removeBookmarkAction] warning:", err?.message);
    return { success: true };
  }
}
