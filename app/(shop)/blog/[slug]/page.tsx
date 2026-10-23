import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPostBySlug, getPosts } from "@/actions/blog.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, ArrowLeft, Share2, Tag, BookOpen, ChevronRight } from "lucide-react";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Article Not Found | Anchor Fashion",
    };
  }

  const img = post.featured_image || (post as any).cover_image;

  return {
    title: `${post.title} | Anchor Fashion Blog`,
    description: post.excerpt || `Read ${post.title} on Anchor Fashion.`,
    openGraph: {
      title: post.title,
      description: post.excerpt || "",
      images: img ? [{ url: img }] : [],
    },
  };
}

function renderInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("[") && token.includes("](")) {
      const closingBracket = token.indexOf("](");
      const label = token.slice(1, closingBracket);
      const url = token.slice(closingBracket + 2, -1);
      parts.push(
        <Link
          key={match.index}
          href={url}
          className="text-[#C9A86A] font-semibold underline decoration-[#C9A86A]/40 hover:text-[#9A7B3E] transition-colors"
        >
          {label}
        </Link>
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export default async function BlogPostDetailPage({
  params,
  searchParams,
}: BlogPostPageProps) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreview = sParams.preview === "true";

  const post = await getPostBySlug(slug);

  if (!post) {
    return notFound();
  }

  if (post.status !== "published" && !isPreview) {
    return notFound();
  }

  // Fetch 3 related posts
  const allPosts = await getPosts("published");
  const relatedPosts = allPosts
    .filter((p) => p.id !== post.id)
    .slice(0, 3);

  const img = post.featured_image || (post as any).cover_image;
  const categoryName = (post as any).blog_categories?.name;

  return (
    <article className="min-h-screen bg-background">
      {/* Admin Preview Notice */}
      {post.status !== "published" && isPreview && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-bold uppercase tracking-wider sticky top-14 z-50 shadow-sm">
          Admin Preview Mode — Post status: {post.status}
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-3 flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link href="/blog" className="hover:text-foreground transition-colors">
            Blog
          </Link>
          {categoryName && (
            <>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <Link
                href={`/blog?category=${post.category_id}`}
                className="hover:text-foreground transition-colors"
              >
                {categoryName}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-foreground truncate max-w-xs">{post.title}</span>
        </div>
      </div>

      {/* Header Container */}
      <header className="container mx-auto px-4 pt-10 pb-8 max-w-4xl">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {categoryName && (
            <Badge variant="secondary" className="px-3 py-1 font-semibold text-xs">
              {categoryName}
            </Badge>
          )}
          {post.reading_time_minutes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {post.reading_time_minutes} min read
            </span>
          )}
          {post.published_at && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.published_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-4 text-lg sm:text-xl text-muted-foreground leading-relaxed font-normal">
            {post.excerpt}
          </p>
        )}
      </header>

      {/* Featured Cover Image */}
      {img && (
        <div className="container mx-auto px-4 max-w-5xl mb-12">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-md bg-muted">
            <Image
              src={img}
              alt={post.title}
              fill
              className="object-cover"
              unoptimized
              priority
            />
          </div>
        </div>
      )}

      {/* JSON-LD Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt || "",
            image: img ? [img] : [],
            datePublished: post.published_at || post.created_at,
            dateModified: post.updated_at || post.created_at,
            author: {
              "@type": "Person",
              name: "Anchor Editorial Team",
            },
            publisher: {
              "@type": "Organization",
              name: "Anchor Fashion",
              logo: {
                "@type": "ImageObject",
                url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.anchorfashion.com.bd"}/images/home/hero-banner.png`,
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.anchorfashion.com.bd"}/blog/${post.slug}`,
            },
          }),
        }}
      />

      {/* Article Content */}
      <div className="container mx-auto px-4 max-w-3xl pb-16">
        <div className="prose prose-slate dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-base sm:text-lg">
          {post.content ? (
            post.content.split("\n\n").map((paragraph, idx) => {
              const trimmed = paragraph.trim();

              if (trimmed === "---") {
                return <hr key={idx} className="my-8 border-border" />;
              }

              if (trimmed.startsWith("### ")) {
                return (
                  <h3 key={idx} className="text-xl font-bold mt-8 mb-3 text-foreground">
                    {renderInlineFormatting(trimmed.replace("### ", ""))}
                  </h3>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h2 key={idx} className="text-2xl font-bold mt-10 mb-4 text-foreground border-b pb-2">
                    {renderInlineFormatting(trimmed.replace("## ", ""))}
                  </h2>
                );
              }
              if (trimmed.startsWith("# ")) {
                return (
                  <h2 key={idx} className="text-3xl font-extrabold mt-12 mb-4 text-foreground">
                    {renderInlineFormatting(trimmed.replace("# ", ""))}
                  </h2>
                );
              }

              if (trimmed.startsWith("> ")) {
                return (
                  <blockquote
                    key={idx}
                    className="my-6 border-l-4 border-[#C9A86A] pl-5 italic text-muted-foreground bg-muted/20 py-3 rounded-r-lg"
                  >
                    {renderInlineFormatting(trimmed.replace(/^>\s*/, ""))}
                  </blockquote>
                );
              }

              // Markdown Table Support
              if (trimmed.startsWith("|") && trimmed.includes("\n|")) {
                const rows = trimmed.split("\n").filter((r) => r.trim().startsWith("|"));
                const headerRow = rows[0];
                const bodyRows = rows.slice(2);
                const headers = headerRow
                  .split("|")
                  .map((c) => c.trim())
                  .filter(Boolean);

                return (
                  <div key={idx} className="my-8 overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/60 text-xs uppercase tracking-wider font-semibold text-muted-foreground border-b border-border">
                        <tr>
                          {headers.map((h, hIdx) => (
                            <th key={hIdx} className="px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {bodyRows.map((r, rIdx) => {
                          const cells = r.split("|").map((c) => c.trim()).filter(Boolean);
                          return (
                            <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                              {cells.map((c, cIdx) => (
                                <td key={cIdx} className="px-4 py-3 text-foreground/90">
                                  {renderInlineFormatting(c)}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }

              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                const items = trimmed.split("\n");
                return (
                  <ul key={idx} className="list-disc pl-6 my-4 space-y-1.5">
                    {items.map((it, i) => (
                      <li key={i}>{renderInlineFormatting(it.replace(/^[-*]\s+/, ""))}</li>
                    ))}
                  </ul>
                );
              }

              if (/^\d+\.\s/.test(trimmed)) {
                const items = trimmed.split("\n").filter(Boolean);
                return (
                  <ol key={idx} className="list-decimal pl-6 my-4 space-y-1.5">
                    {items.map((it, i) => (
                      <li key={i}>{renderInlineFormatting(it.replace(/^\d+\.\s+/, ""))}</li>
                    ))}
                  </ol>
                );
              }

              return (
                <p key={idx} className="mb-6 whitespace-pre-line leading-relaxed">
                  {renderInlineFormatting(trimmed)}
                </p>
              );
            })
          ) : (
            <p className="text-muted-foreground italic">No content available for this article.</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href="/blog">
              <ArrowLeft className="h-4 w-4" /> Back to all articles
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              asChild
            >
              <Link href="/products">
                Shop Curated Collection &rarr;
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="border-t bg-muted/20 py-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold tracking-tight">You Might Also Like</h3>
              <Button variant="ghost" size="sm" className="gap-1 font-semibold text-primary" asChild>
                <Link href="/blog">
                  View all <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((rp) => {
                const rImg = rp.featured_image || (rp as any).cover_image;
                return (
                  <div
                    key={rp.id}
                    className="flex flex-col rounded-xl border bg-card overflow-hidden shadow-xs hover:shadow-md transition-shadow group"
                  >
                    <Link href={`/blog/${rp.slug}`} className="relative aspect-video w-full bg-muted overflow-hidden">
                      {rImg ? (
                        <Image
                          src={rImg}
                          alt={rp.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-xs font-semibold">
                          Anchor Editorial
                        </div>
                      )}
                    </Link>
                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                          {rp.reading_time_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {rp.reading_time_minutes}m
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                          <Link href={`/blog/${rp.slug}`}>{rp.title}</Link>
                        </h4>
                      </div>
                      <div className="mt-3 pt-3 border-t text-xs text-primary font-medium">
                        Read Story &rarr;
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
