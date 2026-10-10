import React from "react";
import { getPosts } from "@/actions/blog.actions";
import { CmsBlogsClient } from "@/features/admin/components/cms/CmsBlogsClient";

export const metadata = {
  title: "Blog Manager | CMS",
  description: "Manage editorial blog posts, fashion guides, and categories.",
};

export const dynamic = "force-dynamic";

export default async function BlogManager() {
  const posts = await getPosts();

  return <CmsBlogsClient posts={posts} />;
}
