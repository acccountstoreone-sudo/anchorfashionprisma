const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const DATABASE_URL =
  process.env.DIRECT_URL ||
  "postgresql://neondb_owner:npg_zM5AjDtG1hkO@ep-dawn-bonus-b41nfjyi.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";

const WAREHOUSE_ID = "fc4ab9a5-7623-46ad-ada5-2bbdd95f3655";

// Category Data mapping & products
const SEED_PRODUCTS = [
  // 1. PANJABI
  {
    categoryName: "PANJABI",
    categorySlug: "panjabi",
    categoryImage: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
    name: "Royal Heritage Embroidered Silk Panjabi",
    slug: "royal-heritage-embroidered-silk-panjabi",
    shortDescription: "Hand-embellished collar and placket on premium mulberry silk blend.",
    description: `<h3>Luxury Meets Tradition</h3>
<p>Crafted for moments of grandeur, our Royal Heritage Silk Panjabi features intricate tone-on-tone embroidery across the mandarin collar and concealed placket. Tailored from a high-thread-count silk-cotton jacquard that drapes effortlessly.</p>
<h4>Specifications:</h4>
<ul>
  <li>Fabric: 70% Mulberry Silk, 30% Egyptian Cotton</li>
  <li>Cut: Modern Semi-Fitted Silhouette</li>
  <li>Buttons: Hand-carved Mother of Pearl buttons</li>
  <li>Pockets: Two discreet side pockets</li>
</ul>`,
    basePrice: 4850.00,
    salePrice: 3890.00, // 20% discount
    costPrice: 2200.00,
    sku: "AF-PAN-ROYAL-01",
    barcode: "8941001001015",
    gender: "MEN",
    season: "Festive 2026",
    careInstructions: "Dry clean only. Store in breathable garment bag away from direct sunlight.",
    rating: 4.9,
    reviewCount: 38,
    isFeatured: true,
    isNewArrival: true,
    images: [
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80",
      "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=1000&q=80",
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
    ],
    sizes: ["S (38)", "M (40)", "L (42)", "XL (44)", "XXL (46)"],
  },
  {
    categoryName: "PANJABI",
    categorySlug: "panjabi",
    categoryImage: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80",
    name: "Minimalist Pure Irish Linen Panjabi",
    slug: "minimalist-pure-irish-linen-panjabi",
    shortDescription: "Ultra-breathable 100% Irish flax linen tailored with contemporary minimalism.",
    description: `<h3>Effortless Breathability</h3>
<p>Engineered for warm tropical climates, this minimalist Panjabi is crafted from ethically sourced 100% Irish linen. Features a clean band collar, seamless shoulder line, and an airy relaxed silhouette.</p>
<h4>Specifications:</h4>
<ul>
  <li>Fabric: 100% Pre-washed Irish Linen</li>
  <li>Fit: Relaxed tailored drape</li>
  <li>Texture: Natural slub linen texture</li>
</ul>`,
    basePrice: 3600.00,
    salePrice: 2950.00, // 18% discount
    costPrice: 1700.00,
    sku: "AF-PAN-LINEN-02",
    barcode: "8941001001022",
    gender: "MEN",
    season: "Summer 2026",
    careInstructions: "Machine wash cold delicate. Hang dry in shade. Warm steam iron while slightly damp.",
    rating: 4.8,
    reviewCount: 24,
    isFeatured: true,
    isNewArrival: true,
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80",
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
      "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=1000&q=80",
    ],
    sizes: ["M (40)", "L (42)", "XL (44)", "XXL (46)"],
  },

  // 2. FORMAL SHIRT
  {
    categoryName: "Formal Shirt",
    categorySlug: "formal-shirt",
    categoryImage: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
    name: "Executive Non-Iron Egyptian Cotton Shirt",
    slug: "executive-non-iron-egyptian-cotton-shirt",
    shortDescription: "120s 2-ply Giza Egyptian cotton with wrinkle-resistant nano-finish.",
    description: `<h3>The Boardroom Standard</h3>
<p>Impeccably tailored from certified 120s two-ply Giza Egyptian cotton, this shirt remains crisp and sharp through 16-hour workdays. Features a semi-spread English collar compatible with both full Windsor and half Windsor knots.</p>
<h4>Specifications:</h4>
<ul>
  <li>Fabric: 100% Long-Staple Egyptian Cotton (120s two-ply)</li>
  <li>Collar: Semi-spread collar with removable brass collar stays</li>
  <li>Cuffs: Convertible dual-button barrel cuffs (cufflink compatible)</li>
  <li>Finish: Advanced Eco-Friendly Non-Iron technology</li>
</ul>`,
    basePrice: 2850.00,
    salePrice: 2280.00, // 20% discount
    costPrice: 1250.00,
    sku: "AF-SHT-EXEC-01",
    barcode: "8941001002012",
    gender: "MEN",
    season: "All-Season",
    careInstructions: "Machine wash warm 40°C. Tumble dry low and hang immediately for wrinkle-free wear.",
    rating: 4.85,
    reviewCount: 42,
    isFeatured: true,
    isNewArrival: false,
    images: [
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&q=80",
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1000&q=80",
      "https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=1000&q=80",
    ],
    sizes: ["15 (S)", "15.5 (M)", "16 (L)", "16.5 (XL)", "17 (XXL)"],
  },
  {
    categoryName: "Formal Shirt",
    categorySlug: "formal-shirt",
    categoryImage: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&q=80",
    name: "Milano Slim-Fit Oxford Herringbone Shirt",
    slug: "milano-slim-fit-oxford-herringbone-shirt",
    shortDescription: "Textured herringbone weave in subtle ice-blue with mother-of-pearl accents.",
    description: `<h3>Refined Sartorial Texture</h3>
<p>Add subtle depth to your tailoring with our Italian-inspired herringbone weave. The micro-texture catches light elegantly under suit jackets while maintaining peak breathability.</p>`,
    basePrice: 2650.00,
    salePrice: 2150.00,
    costPrice: 1100.00,
    sku: "AF-SHT-MIL-02",
    barcode: "8941001002029",
    gender: "MEN",
    season: "All-Season",
    careInstructions: "Machine wash cold. Warm iron.",
    rating: 4.75,
    reviewCount: 19,
    isFeatured: false,
    isNewArrival: true,
    images: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&q=80",
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1000&q=80",
    ],
    sizes: ["15.5 (M)", "16 (L)", "16.5 (XL)"],
  },

  // 3. PREMIUM POLO
  {
    categoryName: "Premium Polo",
    categorySlug: "premium-polo",
    categoryImage: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1000&q=80",
    name: "Supima Silk-Touch Mercerized Cotton Polo",
    slug: "supima-silk-touch-mercerized-cotton-polo",
    shortDescription: "Double-mercerized 100% American Supima cotton with lustrous silk-like hand feel.",
    description: `<h3>Elevated Casual Elegance</h3>
<p>The pinnacle of smart casual dressing. Our signature polo is knitted from double-mercerized American Supima extra-long staple cotton. The specialized mercerization process permanently enhances color depth, luster, and resistance to pilling.</p>
<h4>Specifications:</h4>
<ul>
  <li>Fabric: 100% Double-Mercerized Supima Cotton (240 GSM)</li>
  <li>Collar: Anti-curl ribbed collar with stay-flat woven interlining</li>
  <li>Placket: 3-button placket with genuine horn buttons</li>
  <li>Vents: Reinforced tennis tail side vents</li>
</ul>`,
    basePrice: 2150.00,
    salePrice: 1690.00, // 21% discount
    costPrice: 850.00,
    sku: "AF-POLO-SUP-01",
    barcode: "8941001003019",
    gender: "MEN",
    season: "Summer / Autumn",
    careInstructions: "Machine wash cold inside out with mild detergent. Do not bleach. Dry flat.",
    rating: 4.9,
    reviewCount: 56,
    isFeatured: true,
    isNewArrival: true,
    images: [
      "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1000&q=80",
      "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1000&q=80",
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1000&q=80",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    categoryName: "Premium Polo",
    categorySlug: "premium-polo",
    categoryImage: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1000&q=80",
    name: "Knitted Tipped Collar Riviera Polo",
    slug: "knitted-tipped-collar-riviera-polo",
    shortDescription: "Vintage Italian resort-inspired open knit with contrasting collar tipping.",
    description: `<h3>Retro Mediterranean Sophistication</h3>
<p>Inspired by 1960s Riviera fashion, this lightweight knit polo features fine geometric jacquard and a tailored Johnny collar. Perfect for weekend brunches and seaside getaways.</p>`,
    basePrice: 2400.00,
    salePrice: 1950.00,
    costPrice: 950.00,
    sku: "AF-POLO-RIV-02",
    barcode: "8941001003026",
    gender: "MEN",
    season: "Spring / Summer",
    careInstructions: "Hand wash cold or dry clean. Do not wring. Dry flat.",
    rating: 4.8,
    reviewCount: 31,
    isFeatured: false,
    isNewArrival: true,
    images: [
      "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1000&q=80",
      "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1000&q=80",
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1000&q=80",
    ],
    sizes: ["M", "L", "XL"],
  },

  // 4. BELT & ACCESSORIES
  {
    categoryName: "Belt",
    categorySlug: "belt",
    categoryImage: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=1000&q=80",
    name: "Artisan Full-Grain Italian Leather Reversible Belt",
    slug: "artisan-full-grain-italian-leather-reversible-belt",
    shortDescription: "Two-in-one black/cognac brown vegetable-tanned leather with brushed palladium buckle.",
    description: `<h3>Crafted to Last Decades</h3>
<p>Hand-cut in Tuscany from 100% full-grain vegetable-tanned bovine leather, this reversible belt rotates smoothly between Midnight Black and Rich Cognac Brown. Finished with hand-painted beveled edges and a scratch-resistant brushed palladium buckle.</p>
<h4>Specifications:</h4>
<ul>
  <li>Leather: Full-Grain Tuscan Vegetable-Tanned Cowhide</li>
  <li>Width: 35mm (Ideal for suit trousers and casual chinos)</li>
  <li>Hardware: Solid brass buckle with brushed palladium coating</li>
  <li>Mechanism: Smooth swivel-and-lock reversible buckle mechanism</li>
</ul>`,
    basePrice: 2200.00,
    salePrice: 1750.00, // 20% discount
    costPrice: 850.00,
    sku: "AF-BLT-REV-01",
    barcode: "8941001004016",
    gender: "MEN",
    season: "All-Season",
    careInstructions: "Wipe with damp cloth. Condition leather twice a year with natural beeswax balsam.",
    rating: 4.95,
    reviewCount: 68,
    isFeatured: true,
    isNewArrival: false,
    images: [
      "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=1000&q=80",
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1000&q=80",
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&q=80",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1000&q=80",
    ],
    sizes: ["32 (S)", "34 (M)", "36 (L)", "38 (XL)", "40 (XXL)"],
  },

  // 5. DENIM / BOTTOM
  {
    categoryName: "Denim",
    categorySlug: "denim",
    categoryImage: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=1000&q=80",
    name: "Japanese Selvedge Raw Indigo Denim Jeans",
    slug: "japanese-selvedge-raw-indigo-denim-jeans",
    shortDescription: "13.5oz Kuroki red-line selvedge denim woven on vintage shuttle looms.",
    description: `<h3>Authentic Selvedge Heritage</h3>
<p>Tailored from premium 13.5 oz Japanese red-line selvedge denim from the famous Kuroki Mills. Woven slowly on restored vintage shuttle looms, ensuring rich indigo depth that develops personalized honeycomb and whisker fades over time.</p>
<h4>Specifications:</h4>
<ul>
  <li>Denim: 13.5 oz 100% Cotton Kuroki Selvedge Denim</li>
  <li>Cut: Modern Slim Straight</li>
  <li>Fly: Solid copper donut button fly</li>
  <li>Patch: Genuine thick vegetable-tanned leather patch</li>
</ul>`,
    basePrice: 3850.00,
    salePrice: 3200.00,
    costPrice: 1650.00,
    sku: "AF-DNM-SEL-01",
    barcode: "8941001005013",
    gender: "MEN",
    season: "All-Season",
    careInstructions: "Wear raw for 6 months before first wash. Wash inside out in cold water. Hang dry.",
    rating: 4.88,
    reviewCount: 45,
    isFeatured: true,
    isNewArrival: true,
    images: [
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=1000&q=80",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=1000&q=80",
      "https://images.unsplash.com/photo-1475178626620-a4d074967452?w=1000&q=80",
    ],
    sizes: ["30", "32", "34", "36", "38"],
  },

  // 6. JACKET / OUTERWEAR
  {
    categoryName: "Jacket",
    categorySlug: "jacket",
    categoryImage: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1000&q=80",
    name: "Milano Wool-Blend Unstructured Safari Jacket",
    slug: "milano-wool-blend-unstructured-safari-jacket",
    shortDescription: "Tailored 4-pocket field jacket in wool-cashmere blend with horn button closures.",
    description: `<h3>Contemporary Utilitarian Tailoring</h3>
<p>An effortless layering piece combining military utility with refined tailoring. Cut in an unstructured drape from a lightweight wool-cashmere blend with quadruple bellows pockets and internal drawstring waist.</p>`,
    basePrice: 5950.00,
    salePrice: 4750.00, // 20% discount
    costPrice: 2800.00,
    sku: "AF-JKT-SAF-01",
    barcode: "8941001006010",
    gender: "MEN",
    season: "Autumn / Winter",
    careInstructions: "Dry clean only. Steam refresh.",
    rating: 4.9,
    reviewCount: 22,
    isFeatured: true,
    isNewArrival: true,
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1000&q=80",
      "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=1000&q=80",
      "https://images.unsplash.com/photo-1544441893-675973e31985?w=1000&q=80",
    ],
    sizes: ["S (38)", "M (40)", "L (42)", "XL (44)"],
  },
];

async function seedProducts() {
  console.log("Connecting to PostgreSQL...");
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log("Connected successfully! Seeding rich dummy products...");

    for (const prod of SEED_PRODUCTS) {
      console.log(`\nProcessing product: ${prod.name}`);

      // 1. Resolve Category ID by slug or name
      const catRes = await client.query(
        `SELECT id, image_url FROM categories WHERE slug = $1 OR LOWER(name) = LOWER($2) LIMIT 1;`,
        [prod.categorySlug, prod.categoryName]
      );

      let categoryId = null;
      if (catRes.rows.length > 0) {
        categoryId = catRes.rows[0].id;

        // If category currently has no image, update category with high-res banner image!
        if (!catRes.rows[0].image_url && prod.categoryImage) {
          await client.query(
            `UPDATE categories SET image_url = $1, updated_at = NOW() WHERE id = $2;`,
            [prod.categoryImage, categoryId]
          );
          console.log(`  Updated category banner for ${prod.categoryName}`);
        }
      }

      // 2. Check if product already exists by slug or SKU
      const existingRes = await client.query(
        `SELECT id FROM products WHERE slug = $1 OR sku = $2 LIMIT 1;`,
        [prod.slug, prod.sku]
      );

      let productId = null;

      if (existingRes.rows.length > 0) {
        productId = existingRes.rows[0].id;
        console.log(`  Product already exists (ID: ${productId}). Updating details...`);

        await client.query(
          `UPDATE products SET
            name = $1,
            description = $2,
            short_description = $3,
            base_price = $4,
            sale_price = $5,
            cost_price = $6,
            sku = $7,
            barcode = $8,
            gender = $9,
            season = $10,
            care_instructions = $11,
            country_of_origin = 'Bangladesh',
            is_featured = $12,
            is_new_arrival = $13,
            rating = $14,
            review_count = $15,
            image_url = $16,
            gallery_urls = $17,
            category_id = $18,
            status = 'ACTIVE',
            updated_at = NOW()
          WHERE id = $19;`,
          [
            prod.name,
            prod.description,
            prod.shortDescription,
            prod.basePrice,
            prod.salePrice,
            prod.costPrice,
            prod.sku,
            prod.barcode,
            prod.gender,
            prod.season,
            prod.careInstructions,
            prod.isFeatured,
            prod.isNewArrival,
            prod.rating,
            prod.reviewCount,
            prod.images[0],
            prod.images,
            categoryId,
            productId,
          ]
        );
      } else {
        // Insert new product
        const insertRes = await client.query(
          `INSERT INTO products (
            name, slug, description, short_description,
            base_price, sale_price, cost_price, sku, barcode,
            status, gender, season, care_instructions, country_of_origin,
            is_featured, is_new_arrival, rating, review_count,
            image_url, gallery_urls, category_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8, $9,
            'ACTIVE', $10, $11, $12, 'Bangladesh',
            $13, $14, $15, $16,
            $17, $18, $19, NOW(), NOW()
          ) RETURNING id;`,
          [
            prod.name,
            prod.slug,
            prod.description,
            prod.shortDescription,
            prod.basePrice,
            prod.salePrice,
            prod.costPrice,
            prod.sku,
            prod.barcode,
            prod.gender,
            prod.season,
            prod.careInstructions,
            prod.isFeatured,
            prod.isNewArrival,
            prod.rating,
            prod.reviewCount,
            prod.images[0],
            prod.images,
            categoryId,
          ]
        );
        productId = insertRes.rows[0].id;
        console.log(`  Inserted new product with ID: ${productId}`);
      }

      // 3. Link product in product_categories join table
      if (categoryId) {
        await client.query(
          `INSERT INTO product_categories (product_id, category_id, assigned_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (product_id, category_id) DO NOTHING;`,
          [productId, categoryId]
        );
      }

      // 4. Insert 3-4 images into product_media table
      // Clear old media first to prevent duplicates
      await client.query(`DELETE FROM product_media WHERE product_id = $1;`, [productId]);

      for (let i = 0; i < prod.images.length; i++) {
        await client.query(
          `INSERT INTO product_media (
            product_id, url, is_primary, display_order, media_type, created_at
          ) VALUES ($1, $2, $3, $4, 'IMAGE', NOW());`,
          [productId, prod.images[i], i === 0, i]
        );
      }
      console.log(`  Created ${prod.images.length} product media gallery records.`);

      // 5. Create Variants with Inventory
      for (const size of prod.sizes) {
        const variantSku = `${prod.sku}-${size.replace(/[^a-zA-Z0-9]/g, "")}`;
        const attributes = JSON.stringify({ size });

        let variantId = null;
        const varRes = await client.query(
          `SELECT id FROM variants WHERE sku = $1 LIMIT 1;`,
          [variantSku]
        );

        if (varRes.rows.length > 0) {
          variantId = varRes.rows[0].id;
        } else {
          const newVarRes = await client.query(
            `INSERT INTO variants (
              product_id, sku, price_override, sale_price, cost_price,
              attributes, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
            RETURNING id;`,
            [
              productId,
              variantSku,
              prod.basePrice,
              prod.salePrice,
              prod.costPrice,
              attributes,
            ]
          );
          variantId = newVarRes.rows[0].id;
        }

        // Add inventory level in central warehouse
        if (variantId && WAREHOUSE_ID) {
          await client.query(
            `INSERT INTO inventory_levels (
              variant_id, warehouse_id, quantity_available, quantity_reserved, reorder_point, created_at, updated_at
            ) VALUES ($1, $2, 45, 0, 5, NOW(), NOW())
            ON CONFLICT (variant_id, warehouse_id) DO UPDATE SET
              quantity_available = 45,
              updated_at = NOW();`,
            [variantId, WAREHOUSE_ID]
          );
        }
      }
      console.log(`  Generated ${prod.sizes.length} sized variants with inventory.`);
    }

    console.log("\n=======================================================");
    console.log("SUCCESS: All dummy products, galleries, & inventory seeded!");
    console.log("=======================================================");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await client.end();
  }
}

seedProducts();
