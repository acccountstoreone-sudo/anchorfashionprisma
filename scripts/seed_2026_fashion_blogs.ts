import { prisma } from "../lib/prisma";

async function seedTrending2026Blogs() {
  console.log("=== SEEDING 2026 TRENDING FASHION BLOGS & EDITORIAL SYSTEM ===");

  // 1. Get or pick an author profile
  let authorProfile = await prisma.profile.findFirst();
  if (!authorProfile) {
    authorProfile = await prisma.profile.create({
      data: {
        firstName: "Anchor",
        lastName: "Editorial",
        email: "editorial@anchorfashion.com.bd",
        phone: "+8801711000000",
      },
    });
  }
  const authorId = authorProfile.id;
  console.log(`Using Author ID: ${authorId} (${authorProfile.firstName} ${authorProfile.lastName})`);

  // 2. Remove dummy test post 'hi'
  await prisma.$executeRawUnsafe(`DELETE FROM blog_posts WHERE slug = 'hi' OR title = 'hi';`);
  console.log("Cleaned up test post 'hi'");

  // 3. Define and upsert the 4 Strategic 2026 Fashion Categories
  const categoriesData = [
    {
      id: "a1111111-1111-4111-a111-111111111111",
      name: "Trend Forecast 2026",
      slug: "trend-forecast-2026",
      description: "Forecasting South Asian luxury fashion, runway directions, silhouettes, and seasonal palettes for 2026.",
    },
    {
      id: "b2222222-2222-4222-b222-222222222222",
      name: "Ethnic & Festive Styling",
      slug: "ethnic-and-festive-styling",
      description: "Royal Panjabis, Kabli suits, handcrafted embroidery, and celebratory Eid and wedding edits.",
    },
    {
      id: "c3333333-3333-4333-c333-333333333333",
      name: "Executive & Smart Casual",
      slug: "executive-smart-casual",
      description: "Modern workwear tailoring, French linen shirts, luxury knit polos, and boardroom-to-evening versatility.",
    },
    {
      id: "d4444444-4444-4444-d444-444444444444",
      name: "Fabrics & Craftsmanship Guide",
      slug: "fabrics-craftsmanship-guide",
      description: "Deep-dive guides on Mulberry silk, Egyptian Giza cotton, Japanese selvedge denim, and weave care.",
    },
  ];

  for (const cat of categoriesData) {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO blog_categories (id, name, slug, description, created_at)
      VALUES ($1::uuid, $2, $3, $4, NOW())
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name, slug = EXCLUDED.slug, description = EXCLUDED.description;
    `,
      cat.id,
      cat.name,
      cat.slug,
      cat.description
    );
    console.log(`✓ Category seeded: ${cat.name} (${cat.slug})`);
  }

  // 4. Five Master 2026 Fashion Articles
  const postsData = [
    {
      id: "f1000000-0000-4000-a000-000000000001",
      title: "The 2026 Panjabi Trend Forecast: Royal Silks, Tonal Jacquard & Minimalist Zari",
      slug: "2026-panjabi-trend-forecast-royal-silk-jacquard-zari",
      excerpt:
        "From Dhaka wedding soirees to celebratory Eid mornings: How South Asian luxury ethnic wear is transitioning toward understated opulence, muted jewel tones, and whisper-weight mulberry silks.",
      category_id: "b2222222-2222-4222-b222-222222222222",
      cover_image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1400&q=85",
      reading_time_minutes: 6,
      tags: ["Panjabi2026", "FestiveWear", "AarongHeritage", "SilkPanjabi", "AnchorSignature"],
      content: `# The 2026 Panjabi Trend Forecast: Royal Silks, Tonal Jacquard & Minimalist Zari

Ethnic menswear across South Asia is undergoing its most profound aesthetic evolution in a decade. Where previous seasons celebrated heavy, contrast gold zardozi and overtly loud ornamentation, 2026 firmly ushers in an era of **quiet luxury, micro-textures, and architectural silhouette precision**.

Leading heritage and premium retail labels like Aarong's Taaga Man, Sailor Festive, and Anchor Fashion have observed an undeniable shift in the discerning consumer: men in Dhaka, Chittagong, and Sylhet are investing in garments that feel weightless on the skin yet command attention through tactile sophistication.

---

## 1. The Color Palette: Muted Earth Meets Aristocratic Jewels

The vibrant canary yellows and stark neons of yesterday have made way for a refined chromatic spectrum:

- **Slate Sage & Dewdrop Mint**: An ethereal, calming tone perfect for morning Eid prayers and daytime outdoor ceremonies.
- **Dusty Champagne & Warm Sand**: Accented with antique copper threadwork rather than flashy yellow gold.
- **Deep Midnight Obsidian & Prussian Navy**: For evening banquets and receptions, black and midnight navy paired with tonal matte embroidery provide an unshakeable aura of authority.

> "True elegance in ethnic menswear does not announce itself with neon fireworks. It speaks through the drape of raw mulberry silk and the gleam of hand-carved mother-of-pearl buttons." — Anchor Fashion Master Tailor

---

## 2. Weaves of Distinction: Mulberry Silk, Dobby & Viscose Blends

Comfort is paramount in the humid subtropical climate of Bangladesh. Heavy synthetic jacquards that trap body heat are being abandoned for:

1. **Pure Mulberry & Tussar Silk**: Natural breathable fibers with a high-tensile sheen that catches golden-hour light without appearing shiny.
2. **Textured Dobby Cotton**: Intricate geometric weaves that offer depth even on monochromatic single-color panjabis.
3. **Viscose Modal Touch**: Superior fluid drape that flows naturally with movement, avoiding rigid cardboard stiffness.

---

## 3. The New Silhouette: Tailored Semi-Fit vs Kabli Proportion

While the traditional loose-fit panjabi remains a staple for relaxed gatherings, the **Anchor Tailored Semi-Fit** has become the gold standard for executive and festive wear. Featuring slightly structured shoulder seams, high-armhole cutouts, and a clean taper through the torso, it flatters the male physique while preserving full range of motion.

Meanwhile, the **Modern Kabli Set** has surged in popularity among younger trendsetters:
- Pairs a calf-length shirt with coordinated tonal pathani salwars.
- Completed with a Mandarin band collar and sleek hidden plackets.

---

## 4. How to Accessorize Your 2026 Look

- **Waistcoats & Prince Coats**: Layering is the ultimate multiplier. A raw silk waist coat in a complementary earthy tone elevates any plain cotton panjabi instantly.
- **Footwear**: Pair your ethnic silhouette with handcrafted full-grain leather slide sandals or soft suede loafers in tobacco brown or deep cognac.
- **Timepieces**: Minimalist dress watches with leather straps harmonize far better with ethnic cuffs than bulky sports chronographs.

---

### Explore Anchor Fashion's Heritage Collection
Ready to discover the season's finest handcrafted pieces? Browse our [Royal Silk Panjabi and Festive Kabli Suits](/categories/panjabi) online today with free home delivery across Bangladesh.`,
    },
    {
      id: "f1000000-0000-4000-a000-000000000002",
      title: "The Ultimate Polo Fabric Guide: Double-Mercerized Cotton vs Honeycomb Piqué vs Waffle Knit",
      slug: "ultimate-polo-fabric-guide-mercerized-cotton-pique-waffle-knit",
      excerpt:
        "Not all polo shirts are created equal. Decode yarn counts, mercerization chemical finishes, breathability ratings, and why luxury knits are replacing formal button-downs.",
      category_id: "d4444444-4444-4444-d444-444444444444",
      cover_image: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1400&q=85",
      reading_time_minutes: 5,
      tags: ["PoloGuide", "MercerizedCotton", "SmartCasual", "FabricScience", "SailorCasual"],
      content: `# The Ultimate Polo Fabric Guide: Double-Mercerized Cotton vs Honeycomb Piqué vs Waffle Knit

The polo shirt is the undisputed chameleon of menswear. Worn under an unstructured navy blazer, it delivers sharp corporate polish; unbuttoned over chinos on a weekend getaway, it embodies effortless Riviera ease.

Yet most shoppers struggle to articulate why a ৳3,500 luxury knit feels leagues ahead of a ৳800 supermarket polo. The secret lies in **fiber genetics, knit density, and finishing chemistry**. Here is your definitive guide to polo fabrics in 2026.

---

## 1. Double-Mercerized Cotton: The Pinnacle of Luxury Knits

Mercerization is a specialized textile treatment where long-staple cotton yarn is immersed in a concentrated sodium hydroxide bath under tension.

### Why Double-Mercerization Matters:
- **Liquid Sheen**: The rounder cross-section of treated cotton fibers reflects light with a subtle, silk-like luster.
- **Color Fastness**: Dye penetrates deep into the core of the yarn, ensuring your rich black or deep emerald polo never fades to dull grey even after 40 wash cycles.
- **Zero Pilling**: The surface fuzz is chemically eliminated, creating a cool-to-the-touch, ultra-smooth hand feel.

**Best For**: Corporate boardrooms, upscale evening dinners, and smart-casual presentations.

---

## 2. Honeycomb Piqué: The Sporty Classic

Piqué is an open-structured waffle weave invented specifically for tennis players in the 1920s who needed superior ventilation.

### Characteristics:
- **Breathability**: The subtle cellular grid structure allows airflow directly against the skin, evaporating moisture rapidly in 34°C tropical heat.
- **Structural Integrity**: Piqué holds its shape exceptionally well around the placket and collar, resisting the dreaded 'floppy collar' syndrome.
- **Casual Texture**: Provides rugged visual interest when paired with selvedge denim or casual linen shorts.

**Best For**: Daytime golf, weekend road trips, airport transit, and casual summer coffee runs.

---

## 3. Waffle & Ribbed Textures: The 2026 Trendsetter

As seen across modern South Asian streetwear brands like Sailor, Clubhaus, and Yellow, geometric textured knits and ribbed collars are dominating 2026:

- **Zipper Plackets**: Replacing traditional 3-button plackets with sleek antiqued metal or gunmetal zippers.
- **Drop-Shoulder Proportions**: A relaxed, modern shoulder line that bridges sporty casual with European street aesthetics.

---

## Quick Comparison Matrix

| Feature | Double-Mercerized | Classic Piqué | Waffle Knit |
| :--- | :--- | :--- | :--- |
| **Feel** | Silky, ultra-soft, cool | Textured, crisp, structured | Plush, tactile, flexible |
| **Drape** | Fluid, contours cleanly | Firm, holds athletic shape | Relaxed, streetwear-ready |
| **Formality** | High (Semi-formal / blazer) | Medium (Casual Friday) | Everyday Contemporary |
| **Durability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

### Find Your Perfect Fit
Upgrade your warm-weather rotation with Anchor Fashion's curated [Mercerized & Piqué Polo Collection](/categories/polo). Designed for the tropics, engineered for the gentleman.`,
    },
    {
      id: "f1000000-0000-4000-a000-000000000003",
      title: "From Boardroom to Gala: The Art of Layering Blazers, Prince Coats & Waistcoats",
      slug: "boardroom-to-gala-layering-blazers-prince-coats-waistcoats",
      excerpt:
        "Master the transition between corporate meetings and evening celebrations. Discover unstructured wool-linen blazers, velvet prince coats, and silk waistcoats.",
      category_id: "c3333333-3333-4333-c333-333333333333",
      cover_image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1400&q=85",
      reading_time_minutes: 5,
      tags: ["Blazers", "PrinceCoat", "FormalStyle", "WeddingSeason", "ExecutiveLook"],
      content: `# From Boardroom to Gala: The Art of Layering Blazers, Prince Coats & Waistcoats

In modern Dhaka and South Asian metropolitan centers, a gentleman's calendar rarely follows a single dress code. A typical Tuesday may start with high-stakes investor discussions in Gulshan, transition into a client lunch in Banani, and conclude at an engagement gala or networking reception in the evening.

Wearing a rigid, heavy three-piece wool suit through congested traffic and temperature swings is impractical. The modern answer is **modular, versatile layering**.

---

## 1. The Unstructured Wool-Linen Blazer

Traditional suits rely on heavy canvas padding, stiff chest haircloth, and shoulder pads. While authoritative, they feel restrictive.

The **2026 Unstructured Blazer** changes the game:
- **No Padding**: Hugs the natural contour of your shoulders like an overshirt.
- **Breathable Blend**: 60% tropical wool blended with 40% crisp European linen allows airflow while resisting the severe wrinkles of pure linen.
- **Versatility**: Wear it with a crisp white formal shirt and pleated trousers by day; switch to an open-collar mercerized tee or knit polo after 6 PM.

---

## 2. The Aristocratic Prince Coat: Modernized

The Prince Coat (or Jodhpuri bandhgala jacket) represents the absolute pinnacle of contemporary South Asian formal tailoring.

### Key Rules for 2026:
1. **Length**: Should end right below the hip curve — never too long like an overcoat, nor too short like a bolero.
2. **Fabric Selection**: Micro-textured matte velvet or blended raw jacquard in jewel shades like imperial wine, deep emerald, and obsidian midnight.
3. **Buttons**: Metal crest or enamel buttons provide an elevated bespoke touch.

> Pairing Tip: Wear your Prince Coat closed over slim-tapered formal trousers with patent leather Oxford shoes or velvet smoking slippers.

---

## 3. The Silk Waistcoat: Instant Festive Upgrade

If you are attending a Mehendi, Sangeet, or Eid dinner, a plain cotton panjabi can feel understated. Slipping into a **handcrafted silk waistcoat** instantly transforms your ensemble into celebration-ready couture without overheating.

- **Mandarin Collar**: Crisp, upright neckline that neatly frames the collar of your panjabi.
- **Concealed Slits**: Side vents that allow easy access to your panjabi pockets.

---

### Discover Anchor Outerwear
Explore our latest drop of [Tailored Blazers, Waistcoats, and Prince Coats](/categories/outerwear) crafted with timeless precision.`,
    },
    {
      id: "f1000000-0000-4000-a000-000000000004",
      title: "Why 240+ GSM Heavyweight Boxy Tees Dominate 2026 Streetwear",
      slug: "why-240-gsm-heavyweight-boxy-tees-dominate-2026-streetwear",
      excerpt:
        "Say goodbye to flimsy 140 GSM t-shirts that shrink after two washes. How heavyweight combed cotton, drop-shoulder silhouettes, and minimal typography became wardrobe essentials.",
      category_id: "a1111111-1111-4111-a111-111111111111",
      cover_image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1400&q=85",
      reading_time_minutes: 4,
      tags: ["Streetwear2026", "HeavyweightTee", "DropShoulder", "MinimalistFashion", "SailorStreet"],
      content: `# Why 240+ GSM Heavyweight Boxy Tees Dominate 2026 Streetwear

For years, fast-fashion brands produced paper-thin 140 to 160 GSM (grams per square meter) t-shirts. They lost their collar shape within two washes, clung unflatteringly to the torso, and became translucent in daylight.

In 2026, the global and Bangladeshi fashion community — championed by labels like Sailor, Kloth, and Anchor Fashion — has decisively shifted toward **heavyweight 240+ GSM combed organic cotton**.

---

## What Makes 240+ GSM Superior?

1. **Structured Silhouette**: The substantial weight of the knit creates clean, crisp drape lines that do not cling to body contours, delivering a clean, tailored streetwear posture.
2. **Neckline Resilience**: Built with thick 1x1 rib knit collars reinforced with double-needle topstitching that prevents the infamous 'bacon neck'.
3. **Breathable Despite the Weight**: When woven from 100% long-staple combed cotton, the natural fibers remain porous and breathable in warm weather while maintaining substantial durability.

---

## The Proportions of Modern Casual: Drop-Shoulder & Boxy Cut

The 2026 tee is not just heavier; its geometry is reimagined:
- **Extended Drop-Shoulder**: The shoulder seam rests 2 to 3 inches below the natural shoulder joint for relaxed ease.
- **Cropped Boxy Length**: Avoids excess fabric bunching in the pockets, sitting perfectly on the beltline of your cargos or denim.
- **Sleeve Opening**: Wider, elbow-skimming sleeves that enhance an athletic, relaxed upper-body profile.

---

## How to Style Heavyweight Tees

- **Tactical Utility**: Pair an ivory or asphalt grey boxy tee with multi-pocket cargo pants and clean low-top leather sneakers.
- **Smart Minimalist**: Tuck a clean black 240 GSM tee into pleated formal trousers with a full-grain leather dress belt.
- **Layered Look**: Wear under an open unbuttoned corduroy overshirt for cool autumn and spring evenings.

---

### Shop the Drop
Experience the substantial feel of our [Heavyweight & Drop-Shoulder Tees](/categories/t-shirt) in curated timeless colorways.`,
    },
    {
      id: "f1000000-0000-4000-a000-000000000005",
      title: "The Capsule Wardrobe for the South Asian Climate: 10 Essential Pieces",
      slug: "capsule-wardrobe-south-asian-climate-10-essential-pieces",
      excerpt:
        "Build a timeless, versatile wardrobe tailored for 35°C monsoon summers and mild festive winters. Quality over quantity: how to create 30+ outfits from just 10 foundational items.",
      category_id: "c3333333-3333-4333-c333-333333333333",
      cover_image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1400&q=85",
      reading_time_minutes: 6,
      tags: ["CapsuleWardrobe", "Minimalism", "SmartStyling", "SouthAsianFashion", "AnchorEssentials"],
      content: `# The Capsule Wardrobe for the South Asian Climate: 10 Essential Pieces

A crowded closet full of clothes with "nothing to wear" is the hallmark of impulse buying. South Asian weather is dynamic: scorching summer humidity, heavy monsoon downpours, and brief yet intensely social festive winter wedding seasons.

The modern solution embraced by stylish men from Aarong and Sailor patrons to international fashion connoisseurs is the **10-Piece South Asian Capsule Wardrobe**.

---

## The 10 Foundation Pillars

1. **The French Linen White Shirt**: Breathable, naturally textured, and crisp. Roll up the sleeves for casual weekends or wear buttoned up with a blazer.
2. **The Non-Iron Oxford Striped Shirt**: Wrinkle-free tech fabric that keeps you looking pressed through 10-hour workdays.
3. **The Double-Mercerized Navy Polo**: The bridge between a t-shirt and a dress shirt. Never fades.
4. **The Heavyweight 240 GSM Boxy Tee in Black & Off-White**: The reliable everyday casual workhorse.
5. **The Handcrafted Mulberry Silk Panjabi**: In Slate Sage or Muted Champagne for Friday prayers, family dawats, and Eid mornings.
6. **The Unstructured Wool-Linen Blazer**: Navy or Charcoal. Your secret weapon for corporate meetings and evening galas.
7. **The 4-Way Stretch Chino in Khaki & Olive**: Office-appropriate with sweat-wicking stretch comfort.
8. **The Raw Indigo Selvedge Denim**: Deep, unwashed indigo with classic orange stitching that molds to your lifestyle.
9. **The Italian Full-Grain Leather Dress Belt**: Double-sided in Black/Cognac with solid brass hardware.
10. **The Minimalist Low-Top Nappa Leather Sneaker**: Clean white or monochromatic leather that pairs seamlessly with suits, chinos, or denim.

---

## The Mixing Formula: 30+ Outfits from 10 Items

- **Executive Corporate**: Non-iron Oxford + Khaki Stretch Chinos + Leather Belt + Navy Blazer.
- **Smart Casual Friday**: Mercerized Navy Polo + Selvedge Denim + Leather Sneakers.
- **Weekend Brunch**: French Linen Shirt (unbuttoned over white tee) + Olive Chinos + Leather Slide Sandals.
- **Celebratory Dawat**: Mulberry Silk Panjabi + Matching Pajamas + Raw Silk Waistcoat.

---

### Build Your Capsule Today
Invest in craftsmanship that outlasts transient trends. Explore [Anchor Fashion's Complete Apparel & Essentials Catalog](/products).`,
    },
  ];

  for (const post of postsData) {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO blog_posts (
        id, title, slug, excerpt, content, cover_image, featured_image,
        category_id, author_id, tags, status, reading_time_minutes,
        published_at, created_at, updated_at
      )
      VALUES (
        $1::uuid, $2, $3, $4, $5, $6, $6,
        $7::uuid, $8::uuid, $9::text[], 'published', $10,
        NOW(), NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE 
      SET 
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        excerpt = EXCLUDED.excerpt,
        content = EXCLUDED.content,
        cover_image = EXCLUDED.cover_image,
        featured_image = EXCLUDED.featured_image,
        category_id = EXCLUDED.category_id,
        author_id = EXCLUDED.author_id,
        tags = EXCLUDED.tags,
        status = 'published',
        reading_time_minutes = EXCLUDED.reading_time_minutes,
        updated_at = NOW();
    `,
      post.id,
      post.title,
      post.slug,
      post.excerpt,
      post.content,
      post.cover_image,
      post.category_id,
      authorId,
      post.tags,
      post.reading_time_minutes
    );
    console.log(`✓ Article seeded: "${post.title}" (slug: "${post.slug}")`);
  }

  console.log("\n=== 2026 FASHION BLOG SEEDING COMPLETED SUCCESSFULLY! ===");
}

seedTrending2026Blogs()
  .catch((err) => {
    console.error("Error seeding blogs:", err);
  })
  .finally(() => prisma.$disconnect());
