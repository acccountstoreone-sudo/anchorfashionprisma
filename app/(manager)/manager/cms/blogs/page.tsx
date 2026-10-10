import React from "react";
import { Metadata } from "next";
import { getPosts } from "@/actions/blog.actions";
import { CmsBlogsClient } from "@/features/admin/components/cms/CmsBlogsClient";

export const metadata: Metadata = {
  title: "Blog & Content Manager | CMS | Manager Dashboard",
  description: "Manage editorial blog posts, fashion guides, and categories.",
};

export const dynamic = "force-dynamic";

export default async function ManagerBlogPage() {
  const posts = await getPosts();

  return (
    <div className="w-full">
      <CmsBlogsClient posts={posts} />
    </div>
  );
}
