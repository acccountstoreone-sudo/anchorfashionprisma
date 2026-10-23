import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== CHECKING BLOG & INVENTORY TABLES IN NEON POSTGRESQL ===");
  const tables: any[] = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
  `);
  console.log("Tables in database:", tables.map((t) => t.table_name).join(", "));

  const postCols: any[] = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'blog_posts' 
    ORDER BY ordinal_position;
  `);
  console.log("\nblog_posts columns:\n", postCols.map((c) => `${c.column_name} (${c.data_type})`).join(", "));

  const catCols: any[] = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'blog_categories' 
    ORDER BY ordinal_position;
  `);
  console.log("\nblog_categories columns:\n", catCols.map((c) => `${c.column_name} (${c.data_type})`).join(", "));

  if (hasBlogPosts) {
    const posts: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, title, slug, status, published_at, category_id FROM blog_posts ORDER BY created_at DESC LIMIT 10;
    `);
    console.log(`\nExisting Blog Posts (${posts.length}):`);
    posts.forEach((p) =>
      console.log(`- [${p.status}] "${p.title}" (slug: "${p.slug}")`)
    );
  }

  const hasBlogCategories = tables.some((t) => t.table_name === "blog_categories");
  if (hasBlogCategories) {
    const cats: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, name, slug FROM blog_categories;
    `);
    console.log(`\nBlog Categories (${cats.length}):`);
    cats.forEach((c) => console.log(`- ${c.name} (${c.slug})`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
