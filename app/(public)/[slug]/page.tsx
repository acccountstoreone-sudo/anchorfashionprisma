import React from "react";
import { getPageBySlug, getPageBlocks } from "@/actions/cms.actions";
import { notFound } from "next/navigation";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

// Simple Renderer Components
const RenderHero = ({ content }: { content: any }) => (
  <section className="relative flex min-h-[60vh] items-center justify-center bg-slate-900 text-white overflow-hidden">
    {content.imageUrl && (
      <Image
        src={content.imageUrl}
        alt="Hero background"
        fill
        className="object-cover opacity-50"
      />
    )}
    <div className="relative z-10 px-4 py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
        {content.title}
      </h1>
      {content.subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300 sm:text-xl">
          {content.subtitle}
        </p>
      )}
    </div>
  </section>
);

const RenderText = ({ content }: { content: any }) => (
  <section className={`px-4 py-16 text-${content.align || "left"}`}>
    <div className="mx-auto max-w-4xl">
      <div className="prose prose-slate max-w-none text-slate-600">
        <p className="whitespace-pre-wrap">{content.text}</p>
      </div>
    </div>
  </section>
);

const RenderImage = ({ content }: { content: any }) => (
  <section className="px-4 py-8">
    <div className="mx-auto max-w-5xl">
      {content.url ? (
        <figure>
          <img src={content.url} alt={content.alt || "Image"} className="w-full rounded-lg object-cover" />
          {content.caption && <figcaption className="mt-2 text-center text-sm text-slate-500">{content.caption}</figcaption>}
        </figure>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
          No Image Provided
        </div>
      )}
    </div>
  </section>
);

const RenderButton = ({ content }: { content: any }) => (
  <section className="px-4 py-8 text-center">
    <Link href={content.url || "#"}>
      <Button size="lg">{content.label || "Click Here"}</Button>
    </Link>
  </section>
);

const RenderDivider = () => (
  <div className="mx-auto max-w-6xl px-4">
    <hr className="my-8 border-t border-slate-200" />
  </div>
);

const RenderVideo = ({ content }: { content: any }) => (
  <section className="px-4 py-8">
    <div className="mx-auto max-w-4xl aspect-video overflow-hidden rounded-lg bg-slate-100">
      {content.url ? (
        <iframe
          src={content.url}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      ) : (
        <div className="flex h-full items-center justify-center text-slate-400">No Video Provided</div>
      )}
    </div>
  </section>
);

import { createClient } from "@/lib/supabase/server";
import { STAFF_ROLES } from "@/lib/constants/auth";

export default async function CMSPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreviewRequested = sParams.preview === "true";

  const page = await getPageBySlug(slug);

  if (!page) {
    return notFound();
  }

  let isAuthorizedPreview = false;
  if (isPreviewRequested) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const role = user.user_metadata?.role || user.app_metadata?.role || "";
        isAuthorizedPreview = STAFF_ROLES.some(
          (r) => r.toLowerCase() === String(role).toLowerCase()
        );
      }
    } catch {
      isAuthorizedPreview = false;
    }
  }

  const isPublished = String(page.status).toUpperCase() === "PUBLISHED";

  if (!isPublished && !isAuthorizedPreview) {
    return notFound();
  }

  const blocks = await getPageBlocks(page.id);

  return (
    <div className="flex min-h-screen flex-col">
      {!isPublished && isAuthorizedPreview && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider sticky top-0 z-50 flex items-center justify-center gap-2 shadow-sm">
          <span>Admin Preview Mode — This page is currently {page.status}</span>
        </div>
      )}
      <StoreHeader />
      <main className="flex-1 bg-white">
        {blocks.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <p className="text-muted-foreground">This page is empty.</p>
          </div>
        ) : (
          blocks.map((block) => {
            switch (block.section_type) {
              case "hero":
                return <RenderHero key={block.id} content={block.content_json} />;
              case "text":
                return <RenderText key={block.id} content={block.content_json} />;
              case "image":
                return <RenderImage key={block.id} content={block.content_json} />;
              case "button":
                return <RenderButton key={block.id} content={block.content_json} />;
              case "divider":
                return <RenderDivider key={block.id} />;
              case "video":
                return <RenderVideo key={block.id} content={block.content_json} />;
              default:
                return (
                  <div key={block.id} className="p-4 text-center text-red-500">
                    Unknown block type: {block.section_type}
                  </div>
                );
            }
          })
        )}
      </main>
      <StoreFooter />
    </div>
  );
}
