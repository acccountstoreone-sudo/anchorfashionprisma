import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Clock, BookOpen, Sparkles } from "lucide-react";
import { getPosts } from "@/actions/blog.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export async function LatestBlogs() {
  let posts: any[] = [];
  try {
    const fetched = await getPosts("published");
    posts = fetched ? fetched.slice(0, 3) : [];
  } catch (err) {
    console.error("[LatestBlogs Error]:", err);
  }

  return (
    <section className="bg-white py-16 md:py-24 border-t border-b border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#C9A86A]">
                Anchor Journal
              </span>
              <Sparkles className="h-3.5 w-3.5 text-[#C9A86A]" />
            </div>
            <h2 className="text-3xl font-light tracking-tight text-gray-950 md:text-4xl">
              Style Stories & <span className="font-serif italic font-normal">Guides</span>
            </h2>
            <p className="mt-2 text-sm font-light text-gray-600 leading-relaxed">
              Explore seasonal trends, fashion advice, styling tips, and editorial stories curated for the contemporary wardrobe.
            </p>
          </div>

          <Link
            href="/blog"
            className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#1A1A1A] transition-colors hover:text-[#C9A86A]"
          >
            Explore The Journal
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              strokeWidth={2}
            />
          </Link>
        </div>

        {/* Blog Posts Grid */}
        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const coverUrl = post.featured_image || post.cover_image;
              const formattedDate = post.published_at
                ? new Date(post.published_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Latest";

              return (
                <article
                  key={post.id}
                  className="group flex flex-col overflow-hidden bg-[#FAFAFA] border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-[#C9A86A]/30"
                >
                  {/* Image Container */}
                  <Link
                    href={"/blog/" + post.slug}
                    className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100 block"
                  >
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center p-4">
                        <BookOpen className="h-8 w-8 opacity-40 mb-2 mx-auto" />
                        <span className="font-serif italic text-sm">{post.title}</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur-xs text-gray-900 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 shadow-xs">
                        {post.blog_categories?.name || "Editorial"}
                      </span>
                    </div>
                  </Link>

                  {/* Content Container */}
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      {/* Meta info */}
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-[#C9A86A]" />
                          {formattedDate}
                        </span>
                        {post.reading_time_minutes && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-[#C9A86A]" />
                              {post.reading_time_minutes} min read
                            </span>
                          </>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-medium text-gray-900 line-clamp-2 transition-colors group-hover:text-[#C9A86A]">
                        <Link href={"/blog/" + post.slug}>
                          {post.title}
                        </Link>
                      </h3>

                      {/* Excerpt */}
                      {post.excerpt && (
                        <p className="mt-2 text-xs font-light text-gray-600 line-clamp-2 leading-relaxed">
                          {post.excerpt}
                        </p>
                      )}
                    </div>

                    {/* Footer link */}
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <Link
                        href={"/blog/" + post.slug}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-900 transition-colors group-hover:text-[#C9A86A]"
                      >
                        Read Article
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Empty / Teaser state */
          <div className="rounded-lg border border-dashed border-[#C9A86A]/40 bg-[#FAFAFA] p-8 md:p-12 text-center max-w-xl mx-auto">
            <BookOpen className="h-10 w-10 mx-auto text-[#C9A86A] mb-3" />
            <h3 className="text-xl font-medium text-gray-900">Explore Anchor Journal</h3>
            <p className="mt-2 text-sm text-gray-600">
              Discover styling guides, trend analyses, and modern wardrobe inspiration in our official blog.
            </p>
            <div className="mt-6">
              <Link href="/blog">
                <Button className="bg-[#1A1A1A] hover:bg-[#C9A86A] text-white text-xs uppercase tracking-widest px-6">
                  Visit Blog
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
