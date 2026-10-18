const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_zM5AjDtG1hkO@ep-dawn-bonus-b41nfjyi.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";

// Specific curated, high-resolution fashion photography for categories
const SPECIFIC_IMAGE_MAP = {
  // Ethnic Wear & Panjabi
  "premium-panjabi": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80",
  "regular-panjabi": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
  "panjabi-set": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
  "ethnic-wear-panjabi-set": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
  "panjabi": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
  "punjabi": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
  "kabli-set": "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=1000&q=80",
  "kabli": "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=1000&q=80",
  "fatua": "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=1000&q=80",
  "pajama": "https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=1000&q=80",
  "ethnic-wear": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
  "waistcoat": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&q=80",

  // Shirts
  "formal-shirt": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
  "casual-shirt": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&q=80",
  "full-sleeve-shirt": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
  "half-sleeve-shirt": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&q=80",
  "linen-shirt": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1000&q=80",
  "overshirt": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1000&q=80",
  "shirt": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",

  // Polos
  "premium-polo": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1000&q=80",
  "regular-polo": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1000&q=80",
  "printed-polo": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1000&q=80",
  "striped-polo": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1000&q=80",
  "drop-shoulder-polo": "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1000&q=80",
  "polo": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1000&q=80",

  // T-Shirts
  "basic-t-shirt": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80",
  "premium-t-shirt": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80",
  "printed-t-shirt": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1000&q=80",
  "drop-shoulder-t-shirt": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1000&q=80",
  "oversized-t-shirt": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1000&q=80",
  "t-shirt": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80",

  // Bottoms & Pants
  "denim": "https://images.unsplash.com/photo-1542272604-780c96856592?w=1000&q=80",
  "chino": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=1000&q=80",
  "cargo": "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=1000&q=80",
  "formal-trouser": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1000&q=80",
  "casual-trouser": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1000&q=80",
  "shorts": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=1000&q=80",
  "bottom": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1000&q=80",

  // Outerwear & Jackets
  "casual-blazer": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&q=80",
  "lightweight-jacket": "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=1000&q=80",
  "jacket": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1000&q=80",
  "outerwear": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1000&q=80",

  // Footwear
  "sneakers": "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1000&q=80",
  "loafers": "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=1000&q=80",
  "formal-shoes": "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=1000&q=80",
  "casual-shoes": "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=1000&q=80",
  "sandals-and-slippers": "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=1000&q=80",
  "footwear": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1000&q=80",

  // Accessories
  "wallet": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=1000&q=80",
  "belt": "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=1000&q=80",
  "cap": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1000&q=80",
  "tie": "https://images.unsplash.com/photo-1589756823695-278bc923f962?w=1000&q=80",
  "socks": "https://images.unsplash.com/photo-1582966772680-860e372bb558?w=1000&q=80",
  "handkerchief": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1000&q=80",
  "accessories": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1000&q=80",

  // Innerwear & Essentials
  "innerwear": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1000&q=80",
  "undergarments": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1000&q=80",
  "essentials": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1000&q=80",

  // Collections & Highlights
  "festive-collection": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80",
  "everyday-collection": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1000&q=80",
  "premium-collection": "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=1000&q=80",
  "new-arrivals": "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1000&q=80",
  "best-sellers": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&q=80",
  "collections": "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=1000&q=80",
};

// Fallback high-fashion editorial category image
const DEFAULT_CATEGORY_IMAGE = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&q=80";

async function updateCategoryImages() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    console.log("Connecting to PostgreSQL...");
    await client.connect();
    console.log("Connected successfully to DB!\n");

    const res = await client.query(`
      SELECT id, name, slug, image_url 
      FROM categories 
      ORDER BY name ASC;
    `);

    console.log(`Found ${res.rows.length} categories to process.\n`);

    let updatedCount = 0;

    for (const cat of res.rows) {
      const slugKey = (cat.slug || "").toLowerCase().trim();
      const nameKey = (cat.name || "").toLowerCase().trim();

      // Exact slug match first
      let chosenImage = SPECIFIC_IMAGE_MAP[slugKey];

      // If not, substring match
      if (!chosenImage) {
        for (const [key, url] of Object.entries(SPECIFIC_IMAGE_MAP)) {
          if (slugKey.includes(key) || nameKey.includes(key.replace(/-/g, ' '))) {
            chosenImage = url;
            break;
          }
        }
      }

      // Fallback
      if (!chosenImage) {
        chosenImage = cat.image_url || DEFAULT_CATEGORY_IMAGE;
      }

      // Update category with the chosen high quality photo
      await client.query(
        `UPDATE categories 
         SET image_url = $1, updated_at = NOW() 
         WHERE id = $2;`,
        [chosenImage, cat.id]
      );

      console.log(`[${updatedCount + 1}/${res.rows.length}] ✓ "${cat.name}" (${cat.slug})`);
      updatedCount++;
    }

    console.log(`\n=======================================================`);
    console.log(`SUCCESS: Successfully updated ${updatedCount} categories with photos in database!`);
    console.log(`=======================================================`);

  } catch (error) {
    console.error("Error during query/update:", error);
  } finally {
    await client.end();
  }
}

updateCategoryImages();
