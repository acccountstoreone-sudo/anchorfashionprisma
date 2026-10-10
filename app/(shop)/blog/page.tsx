import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPosts, getCategories } from "@/actions/blog.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, ArrowRight, BookOpen, Search, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog & Style Guides | Anchor Fashion",
  description:
    "Explore the latest fashion trends, styling advice, outfit ideas, and seasonal wardrobe essentials from Anchor Fashion.",
};

export const revalidate = 60; // ISR cache revalidation

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; q?: string }>;
}) {
  const sParams = searchParams ? await searchParams : {};
  const [allPosts, categories] = await Promise.all([
    getPosts("published"),
    getCategories(),
  ]);

  const selectedCategory = sParams.category;
  const searchQuery = sParams.q?.toLowerCase() || "";

  // Filter posts
  const filteredPosts = allPosts.filter((post) => {
    const matchesCategory =
      !selectedCategory ||
      post.category_id === selectedCategory ||
      (post as any).blog_categories?.slug === selectedCategory;

    const matchesSearch =
      !searchQuery ||
      post.title.toLowerCase().includes(searchQuery) ||
      (post.excerpt && post.excerpt.toLowerCase().includes(searchQuery)) ||
      (post.content && post.content.toLowerCase().includes(searchQuery));

    return matchesCategory && matchesSearch;
  });

  const featuredPost = filteredPosts[0];
  const regularPosts = filteredPosts.slice(1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <section className="relative overflow-hidden border-b bg-muted/40 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Anchor Editorial
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            The Style Journal
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            Curated wardrobe essentials, seasonal styling guides, trend forecasts, and insider fashion inspiration.
          </p>

          {/* Search Bar */}
          <form className="mt-8 flex w-full max-w-md mx-auto items-center gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={sParams.q || ""}
                placeholder="Search articles, guides, trends..."
                className="w-full rounded-full border border-input bg-background pl-9 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button type="submit" size="sm" className="rounded-full px-5">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Category Pills */}
      {categories.length > 0 && (
        <section className="border-b bg-background/95 backdrop-blur sticky top-14 z-20">
          <div className="container mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Button
              variant={!selectedCategory ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs"
              asChild
            >
              <Link href="/blog">All Articles</Link>
            </Button>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id || selectedCategory === cat.slug;
              return (
                <Button
                  key={cat.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className="rounded-full text-xs shrink-0"
                  asChild
                >
                  <Link href={`/blog?category=${cat.id}`}>{cat.name}</Link>
                </Button>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-12">
        {filteredPosts.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold tracking-tight">No articles found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {searchQuery || selectedCategory
                ? "Try clearing your search or category filter to see other stories."
                : "No articles have been published yet. Check back soon for fresh style advice!"}
            </p>
            {(searchQuery || selectedCategory) && (
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/blog">View All Articles</Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            {/* Featured Post (First item on wide hero card) */}
            {featuredPost && (
              <Card className="overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow group">
                <div className="grid md:grid-cols-12 gap-0">
                  <div className="md:col-span-7 relative min-h-[300px] md:min-h-[420px] bg-muted overflow-hidden">
                    {featuredPost.featured_image || (featuredPost as any).cover_image ? (
                      <Image
                        src={featuredPost.featured_image || (featuredPost as any).cover_image}
                        alt={featuredPost.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        unoptimized
                        priority
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-slate-900 to-slate-800 text-white font-bold text-2xl">
                        {featuredPost.title}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-5 p-6 md:p-10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {(featuredPost as any).blog_categories?.name || "Featured"}
                        </Badge>
                        {featuredPost.reading_time_minutes && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {featuredPost.reading_time_minutes} min read
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        <Link href={`/blog/${featuredPost.slug}`}>
                          {featuredPost.title}
                        </Link>
                      </h2>
                      {featuredPost.excerpt && (
                        <p className="mt-3 text-sm md:text-base text-muted-foreground line-clamp-3 leading-relaxed">
                          {featuredPost.excerpt}
                        </p>
                      )}
                    </div>
                    <div className="mt-6 pt-6 border-t flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {featuredPost.published_at
                            ? new Date(featuredPost.published_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Recently"}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="group-hover:translate-x-1 transition-transform p-0 font-semibold text-primary" asChild>
                        <Link href={`/blog/${featuredPost.slug}`}>
                          Read Story <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Grid of Remaining Posts */}
            {regularPosts.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold tracking-tight mb-6">Latest Articles</h3>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {regularPosts.map((post) => {
                    const img = post.featured_image || (post as any).cover_image;
                    return (
                      <Card
                        key={post.id}
                        className="flex flex-col overflow-hidden border border-border shadow-xs hover:shadow-md transition-shadow group h-full"
                      >
                        <Link href={`/blog/${post.slug}`} className="relative aspect-video w-full bg-muted overflow-hidden block">
                          {img ? (
                            <Image
                              src={img}
                              alt={post.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              unoptimized
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground font-semibold text-sm">
                              Anchor Fashion
                            </div>
                          )}
                        </Link>
                        <CardContent className="flex flex-1 flex-col justify-between p-5">
                          <div>
                            <div className="flex items-center gap-2 mb-2.5">
                              <Badge variant="outline" className="text-[11px]">
                                {(post as any).blog_categories?.name || "Editorial"}
                              </Badge>
                              {post.reading_time_minutes && (
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {post.reading_time_minutes}m
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">
                              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                            </h4>
                            {post.excerpt && (
                              <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {post.excerpt}
                              </p>
                            )}
                          </div>
                          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {post.published_at
                                ? new Date(post.published_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "-"}
                            </span>
                            <Link
                              href={`/blog/${post.slug}`}
                              className="font-medium text-primary hover:underline flex items-center gap-0.5"
                            >
                              Read <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
