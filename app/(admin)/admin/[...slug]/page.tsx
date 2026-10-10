import { Metadata } from "next";
import { Hammer } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Coming Soon | Anchor Fashion Admin",
};

export default async function AdminPlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = slug.join("/");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 rounded-full bg-slate-100 p-4">
        <Hammer className="h-10 w-10 text-slate-500" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">
        Page Under Construction
      </h1>
      <p className="mx-auto mb-8 max-w-md text-slate-500">
        The <span className="font-semibold text-slate-700">/admin/{path}</span>{" "}
        page is currently being built. Check back later for updates.
      </p>
      <Link
        href="/admin"
        className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 transition-colors hover:bg-slate-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
