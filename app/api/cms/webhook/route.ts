import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

/**
 * Webhook receiver for Supabase Database Webhooks.
 * When a CMS item (Page, Blog, Menu) is published or updated,
 * this endpoint clears the Next.js static cache for that specific entity.
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // In a real scenario, you'd verify a secret token from Supabase here
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.CMS_WEBHOOK_SECRET}`) {
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table, record, type } = payload;

    // Example logic based on which table was modified
    if (table === "cms_blog_posts") {
      // Revalidate the specific blog post and the blog index
      // @ts-ignore
      revalidateTag(`blog-${record.slug}`);
      // @ts-ignore
      revalidateTag("blog-index");
    } else if (table === "cms_pages") {
      // Revalidate the specific page
      // @ts-ignore
      revalidateTag(`page-${record.slug}`);
    } else if (table === "cms_menus" || table === "cms_menu_items") {
      // Revalidate global UI components
      // @ts-ignore
      revalidateTag("global-nav");
    }

    return NextResponse.json({ success: true, message: "Cache revalidated" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
