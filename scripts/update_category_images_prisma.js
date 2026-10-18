const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Premium curated image mapping based on category names / slugs
const CATEGORY_IMAGE_MAP = {
  // Panjabi & Traditional
  "panjabi": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
  "punjabi": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
  "festive": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80",
  "kurta": "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=1000&q=80",
  
  // Shirts
  "formal-shirt": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
  "shirts": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
  "shirt": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
  "casual-shirt": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&q=80",

  // Polos & T-shirts
  "premium-polo": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1000&q=80",
  "polo": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1000&q=80",
  "t-shirt": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80",
  "t-shirts": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80",

  // Belts & Accessories
  "belt": "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=1000&q=80",
  "belts": "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=1000&q=80",
  "accessories": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1000&q=80",
  "wallet": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=1000&q=80",

  // Denim & Pants
  "denim": "https://images.unsplash.com/photo-1542272604-780c96856592?w=1000&q=80",
  "jeans": "https://images.unsplash.com/photo-1542272604-780c96856592?w=1000&q=80",
  "pants": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1000&q=80",
  "trousers": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1000&q=80",
  "chino": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1000&q=80",

  // Jackets & Outerwear
  "jacket": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1000&q=80",
  "jackets": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1000&q=80",
  "blazer": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&q=80",
  "blazers": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&q=80",
  "hoodie": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1000&q=80",
  "hoodies": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1000&q=80",
  "sweater": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1000&q=80",

  // Footwear
  "shoes": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1000&q=80",
  "footwear": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1000&q=80",
  "loafers": "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=1000&q=80",
  "sneakers": "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1000&q=80",

  // Target Groups / Seasonal
  "men": "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=1000&q=80",
  "women": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1000&q=80",
  "kids": "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=1000&q=80",
  "winter": "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=1000&q=80",
  "summer": "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1000&q=80"
};

// Fallback high-fashion editorial category image
const DEFAULT_CATEGORY_IMAGE = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&q=80";

async function main() {
  try {
    console.log("Fetching categories via Prisma Client...");
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    console.log(`Found ${categories.length} categories in database.\n`);

    let updatedCount = 0;

    for (const cat of categories) {
      const slugKey = (cat.slug || "").toLowerCase().trim();
      const nameKey = (cat.name || "").toLowerCase().trim();

      let chosenImage = null;

      for (const [key, url] of Object.entries(CATEGORY_IMAGE_MAP)) {
        if (slugKey.includes(key) || nameKey.includes(key)) {
          chosenImage = url;
          break;
        }
      }

      if (!chosenImage) {
        chosenImage = cat.imageUrl || DEFAULT_CATEGORY_IMAGE;
      }

      await prisma.category.update({
        where: { id: cat.id },
        data: {
          imageUrl: chosenImage,
        },
      });

      console.log(`✓ Category "${cat.name}" (${cat.slug}) -> ${chosenImage}`);
      updatedCount++;
    }

    console.log("\n=======================================================");
    console.log(`SUCCESS: Successfully updated ${updatedCount} categories with images!`);
    console.log("=======================================================");

  } catch (error) {
    console.error("Prisma update error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
