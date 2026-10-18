const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const DATABASE_URL =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_zM5AjDtG1hkO@ep-dawn-bonus-b41nfjyi.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";

const WAREHOUSE_ID = "fc4ab9a5-7623-46ad-ada5-2bbdd95f3655";

// High quality themed Unsplash image pools
const IMAGES = {
  panjabi: [
    "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80",
    "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=1000&q=80",
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80"
  ],
  formalShirt: [
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&q=80",
    "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1000&q=80",
    "https://images.unsplash.com/photo-1620012253295-c15c429f66bf?w=1000&q=80"
  ],
  casualShirt: [
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&q=80",
    "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1000&q=80",
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
    "https://images.unsplash.com/photo-1620012253295-c15c429f66bf?w=1000&q=80"
  ],
  polo: [
    "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1000&q=80",
    "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1000&q=80",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1000&q=80",
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80"
  ],
  tshirt: [
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1000&q=80",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1000&q=80",
    "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1000&q=80"
  ],
  chino: [
    "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=1000&q=80",
    "https://images.unsplash.com/photo-1542272604-780c96856592?w=1000&q=80",
    "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=1000&q=80",
    "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=1000&q=80"
  ],
  denim: [
    "https://images.unsplash.com/photo-1542272604-780c96856592?w=1000&q=80",
    "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=1000&q=80",
    "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=1000&q=80",
    "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=1000&q=80"
  ],
  outerwear: [
    "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=1000&q=80",
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1000&q=80",
    "https://images.unsplash.com/photo-1544441893-675973e31985?w=1000&q=80",
    "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=1000&q=80"
  ],
  footwear: [
    "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=1000&q=80",
    "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=1000&q=80",
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=1000&q=80",
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1000&q=80"
  ],
  accessories: [
    "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=1000&q=80",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1000&q=80",
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1000&q=80",
    "https://images.unsplash.com/photo-1509941943102-10c232535736?w=1000&q=80"
  ],
  essentials: [
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1000&q=80",
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80",
    "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1000&q=80",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1000&q=80"
  ]
};

// 65 Products covering all categories
const PRODUCTS = [
  // --- PANJABI & ETHNIC WEAR ---
  {
    categorySlug: "regular-panjabi",
    name: "Classic Textured Cotton Regular Panjabi",
    slug: "classic-textured-cotton-regular-panjabi",
    shortDescription: "Breathable self-textured 100% combed cotton designed for timeless daily elegance.",
    description: `<h3>Timeless Daily Sophistication</h3>
<p>An indispensable essential for the contemporary gentleman. Knitted from ultra-soft combed cotton with subtle geometric micro-textures, this panjabi pairs effortlessly with churidar, pyjamas, or dark denims.</p>
<h4>Specifications:</h4>
<ul>
  <li>Fabric: 100% Combed Slub Cotton</li>
  <li>Collar: Mandarin Band Collar with Subtle Piping</li>
  <li>Cut: Classic Regular Comfort Silhouette</li>
  <li>Pockets: Dual ergonomic side welt pockets</li>
</ul>`,
    basePrice: 2450.00,
    salePrice: 1950.00,
    costPrice: 950.00,
    sku: "AF-PAN-REG-01",
    barcode: "8941001004001",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash cold delicate. Hang dry in shade. Warm iron.",
    rating: 4.8,
    reviewCount: 34,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.panjabi,
    sizes: ["S (38)", "M (40)", "L (42)", "XL (44)", "XXL (46)"]
  },
  {
    categorySlug: "regular-panjabi",
    name: "Charcoal Indigo Dobby Weave Panjabi",
    slug: "charcoal-indigo-dobby-weave-panjabi",
    shortDescription: "Rich dobby weave texture in deep charcoal indigo tone.",
    description: `<h3>Subtle Depth & Distinction</h3>
<p>Crafted from premium long-staple cotton with a specialized dobby weave that catches light gracefully. Finished with metallic snap buttons for modern ease.</p>`,
    basePrice: 2650.00,
    salePrice: 2150.00,
    costPrice: 1050.00,
    sku: "AF-PAN-REG-02",
    barcode: "8941001004002",
    gender: "MEN",
    season: "Summer 2026",
    careInstructions: "Wash with like colors. Do not bleach.",
    rating: 4.7,
    reviewCount: 19,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.panjabi,
    sizes: ["M (40)", "L (42)", "XL (44)", "XXL (46)"]
  },
  {
    categorySlug: "premium-panjabi",
    name: "Embroidered Zari Heritage Silk Panjabi",
    slug: "embroidered-zari-heritage-silk-panjabi",
    shortDescription: "Intricate matte antique gold zari embroidery on premium mulberry silk.",
    description: `<h3>Grandeur Redefined</h3>
<p>Featuring handcrafted neck and sleeve border detailing inspired by Mughal courtly attire. An exclusive artisanal piece for wedding and festive celebrations.</p>`,
    basePrice: 5850.00,
    salePrice: 4750.00,
    costPrice: 2400.00,
    sku: "AF-PAN-PREM-01",
    barcode: "8941001004003",
    gender: "MEN",
    season: "Festive 2026",
    careInstructions: "Dry clean only. Store in breathable garment cover.",
    rating: 5.0,
    reviewCount: 48,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.panjabi,
    sizes: ["S (38)", "M (40)", "L (42)", "XL (44)", "XXL (46)"]
  },
  {
    categorySlug: "premium-panjabi",
    name: "Ivory Jacquard Tussar Silk Panjabi",
    slug: "ivory-jacquard-tussar-silk-panjabi",
    shortDescription: "Regal ivory tussar silk with tonal floral jacquard motifs.",
    description: `<h3>Imperial Elegance</h3>
<p>Cut from raw tussar silk woven in artisanal looms, offering natural luster and structured drape. Accented with natural shell buttons.</p>`,
    basePrice: 5200.00,
    salePrice: 4200.00,
    costPrice: 2100.00,
    sku: "AF-PAN-PREM-02",
    barcode: "8941001004004",
    gender: "MEN",
    season: "Festive 2026",
    careInstructions: "Dry clean only.",
    rating: 4.9,
    reviewCount: 27,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.panjabi,
    sizes: ["M (40)", "L (42)", "XL (44)", "XXL (46)"]
  },
  {
    categorySlug: "panjabi-set",
    name: "Grand Festive Panjabi & Aligari Pajama Set",
    slug: "grand-festive-panjabi-aligari-pajama-set",
    shortDescription: "Complete two-piece set featuring embroidered silk panjabi and slim-cut Aligari pajama.",
    description: `<h3>Complete Coordinated Ensemble</h3>
<p>Take the guesswork out of formal ethnic dressing with this coordinated set. Includes a lavishly embroidered silk blend panjabi paired with a tapered cotton-sateen Aligari trouser.</p>`,
    basePrice: 6500.00,
    salePrice: 5350.00,
    costPrice: 2700.00,
    sku: "AF-PAN-SET-01",
    barcode: "8941001004005",
    gender: "MEN",
    season: "Festive 2026",
    careInstructions: "Dry clean only.",
    rating: 4.9,
    reviewCount: 52,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.panjabi,
    sizes: ["S (38)", "M (40)", "L (42)", "XL (44)", "XXL (46)"]
  },
  {
    categorySlug: "kabli-set",
    name: "Signature Sovereign Kabli Set",
    slug: "signature-sovereign-kabli-set",
    shortDescription: "Modern safari-cut Kabli tunic paired with matching tailored shalwar.",
    description: `<h3>Authoritative Sophistication</h3>
<p>Inspired by royal pathani silhouettes, crafted from heavy-fall tropical suiting fabric. Features epaulets, flap chest pockets, and horn buttons.</p>`,
    basePrice: 5900.00,
    salePrice: 4800.00,
    costPrice: 2350.00,
    sku: "AF-KAB-SET-01",
    barcode: "8941001004006",
    gender: "MEN",
    season: "Autumn 2026",
    careInstructions: "Dry clean or gentle hand wash.",
    rating: 4.8,
    reviewCount: 31,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.panjabi,
    sizes: ["M (40)", "L (42)", "XL (44)", "XXL (46)"]
  },
  {
    categorySlug: "punjabi",
    name: "Artisan Kantha Stitch Cotton Punjabi",
    slug: "artisan-kantha-stitch-cotton-punjabi",
    shortDescription: "Heritage hand-embroidered Kantha motifs on pure khadi cotton.",
    description: `<h3>Living Bengal Heritage</h3>
<p>Each piece represents hours of meticulous needlecraft by traditional rural artisans. Airy, lightweight, and deeply connected to Bengal's sartorial roots.</p>`,
    basePrice: 3200.00,
    salePrice: 2650.00,
    costPrice: 1300.00,
    sku: "AF-ETH-PUN-01",
    barcode: "8941001004007",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Cold hand wash with mild liquid soap. Dry in shade.",
    rating: 4.9,
    reviewCount: 42,
    isFeatured: false,
    isNewArrival: false,
    images: IMAGES.panjabi,
    sizes: ["S (38)", "M (40)", "L (42)", "XL (44)"]
  },
  {
    categorySlug: "kabli",
    name: "Onyx Black Minimalist Kabli",
    slug: "onyx-black-minimalist-kabli",
    shortDescription: "Sharp monochrome tailoring in breathable stretch-cotton twill.",
    description: `<h3>Understated Power</h3>
<p>Featuring a sleek high-neck mandarin collar, concealed front button placket, and deep side slits for fluid movement.</p>`,
    basePrice: 4200.00,
    salePrice: 3450.00,
    costPrice: 1750.00,
    sku: "AF-ETH-KAB-01",
    barcode: "8941001004008",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash cold inside out.",
    rating: 4.8,
    reviewCount: 22,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.panjabi,
    sizes: ["M (40)", "L (42)", "XL (44)", "XXL (46)"]
  },
  {
    categorySlug: "fatua",
    name: "Summer Khadi Relaxed Short Fatua",
    slug: "summer-khadi-relaxed-short-fatua",
    shortDescription: "Featherlight handloom khadi short kurta for breezy weekend wear.",
    description: `<h3>Artisanal Tropical Comfort</h3>
<p>Naturally temperature-regulating handspun cotton khadi. Perfect paired with linen trousers or relaxed shorts for warm afternoons.</p>`,
    basePrice: 1850.00,
    salePrice: 1490.00,
    costPrice: 700.00,
    sku: "AF-ETH-FAT-01",
    barcode: "8941001004009",
    gender: "MEN",
    season: "Summer 2026",
    careInstructions: "Hand wash separately in cold water.",
    rating: 4.7,
    reviewCount: 35,
    isFeatured: false,
    isNewArrival: false,
    images: IMAGES.panjabi,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "pajama",
    name: "Premium Sateen Aligari Tapered Pajama",
    slug: "premium-sateen-aligari-tapered-pajama",
    shortDescription: "Luxurious stretch cotton sateen with elasticated drawstring waist.",
    description: `<h3>The Flawless Ethnic Foundation</h3>
<p>Tailored with a refined taper from knee to ankle, creating clean drape under any length of panjabi or kabli.</p>`,
    basePrice: 1450.00,
    salePrice: 1190.00,
    costPrice: 550.00,
    sku: "AF-ETH-PAJ-01",
    barcode: "8941001004010",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash warm.",
    rating: 4.8,
    reviewCount: 65,
    isFeatured: false,
    isNewArrival: false,
    images: IMAGES.panjabi,
    sizes: ["S (30-32)", "M (32-34)", "L (34-36)", "XL (36-38)", "XXL (38-40)"]
  },
  {
    categorySlug: "ethnic-wear-panjabi-set",
    name: "Royal Zari Embroidered Silk Kurta Set",
    slug: "royal-zari-embroidered-silk-kurta-set",
    shortDescription: "Heirloom grade pure silk panjabi with matching churidar pajama.",
    description: `<h3>Ceremonial Elegance</h3>
<p>Designed for wedding grooms and elite occasions. Embellished with subtle metallic embroidery that whispers quiet luxury.</p>`,
    basePrice: 7200.00,
    salePrice: 5950.00,
    costPrice: 3100.00,
    sku: "AF-ETH-SET-02",
    barcode: "8941001004011",
    gender: "MEN",
    season: "Festive 2026",
    careInstructions: "Dry clean only.",
    rating: 5.0,
    reviewCount: 29,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.panjabi,
    sizes: ["S (38)", "M (40)", "L (42)", "XL (44)", "XXL (46)"]
  },

  // --- SHIRTS ---
  {
    categorySlug: "casual-shirt",
    name: "Oxford Washed Button-Down Casual Shirt",
    slug: "oxford-washed-button-down-casual-shirt",
    shortDescription: "Garment-washed 100% heavy Oxford cotton with comfortable relaxed drape.",
    description: `<h3>The Ivy League Staple</h3>
<p>Woven from hefty two-ply Oxford cloth that gets softer with every wash. Features an unlined button-down collar with an authentic roll.</p>`,
    basePrice: 2250.00,
    salePrice: 1790.00,
    costPrice: 850.00,
    sku: "AF-SHI-CAS-01",
    barcode: "8941001004012",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash warm. Tumble dry medium.",
    rating: 4.8,
    reviewCount: 54,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.casualShirt,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "casual-shirt",
    name: "Indigo Chambray Workwear Casual Shirt",
    slug: "indigo-chambray-workwear-casual-shirt",
    shortDescription: "Authentic selvedge-inspired indigo chambray with twin chest pockets.",
    description: `<h3>Rugged Everyday Utility</h3>
<p>Reinforced with triple-needle stitching across stress points. Ages gracefully with personalized fading.</p>`,
    basePrice: 2400.00,
    salePrice: 1950.00,
    costPrice: 920.00,
    sku: "AF-SHI-CAS-02",
    barcode: "8941001004013",
    gender: "MEN",
    season: "Autumn 2026",
    careInstructions: "Wash cold separately.",
    rating: 4.7,
    reviewCount: 23,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.casualShirt,
    sizes: ["M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "formal-shirt",
    name: "Savile Row Double Cuff Poplin Shirt",
    slug: "savile-row-double-cuff-poplin-shirt",
    shortDescription: "Crisp 140s two-ply superfine Italian poplin with French double cuffs.",
    description: `<h3>The Black Tie Standard</h3>
<p>Meticulously crafted for bespoke suits and tuxedos. Features hand-stitched collar stays and genuine mother of pearl buttons.</p>`,
    basePrice: 2950.00,
    salePrice: 2390.00,
    costPrice: 1100.00,
    sku: "AF-SHI-FOR-02",
    barcode: "8941001004014",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash cold delicate. Warm steam iron.",
    rating: 4.9,
    reviewCount: 41,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.formalShirt,
    sizes: ["S (15)", "M (15.5)", "L (16)", "XL (16.5)", "XXL (17)"]
  },
  {
    categorySlug: "linen-shirt",
    name: "Capri Riviera Pure Linen Shirt",
    slug: "capri-riviera-pure-linen-shirt",
    shortDescription: "Breathable 100% Normandy flax linen with relaxed camp collar.",
    description: `<h3>Mediterranean Breeze</h3>
<p>Engineered for hot summer days and seaside dinners. Pre-washed for maximum softness without losing structural integrity.</p>`,
    basePrice: 2750.00,
    salePrice: 2190.00,
    costPrice: 1050.00,
    sku: "AF-SHI-LIN-01",
    barcode: "8941001004015",
    gender: "MEN",
    season: "Summer 2026",
    careInstructions: "Machine wash cold delicate. Hang dry in shade.",
    rating: 4.8,
    reviewCount: 38,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.casualShirt,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "half-sleeve-shirt",
    name: "Cuban Collar Printed Half Sleeve Shirt",
    slug: "cuban-collar-printed-half-sleeve-shirt",
    shortDescription: "Vintage geometric botanical print on ultra-soft modal cotton.",
    description: `<h3>Effortless Resort Sophistication</h3>
<p>Featuring a relaxed Cuban revere collar, straight hem with side vents, and silk-touch drape.</p>`,
    basePrice: 1950.00,
    salePrice: 1550.00,
    costPrice: 750.00,
    sku: "AF-SHI-HLF-01",
    barcode: "8941001004016",
    gender: "MEN",
    season: "Summer 2026",
    careInstructions: "Machine wash cold.",
    rating: 4.7,
    reviewCount: 29,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.casualShirt,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "full-sleeve-shirt",
    name: "Micro Houndstooth Twill Full Sleeve Shirt",
    slug: "micro-houndstooth-twill-full-sleeve-shirt",
    shortDescription: "Fine weave cotton twill with sophisticated micro houndstooth pattern.",
    description: `<h3>Smart Business Casual</h3>
<p>Bridging corporate elegance and after-hours versatility. Wrinkle-resistant finish for sharp presentation.</p>`,
    basePrice: 2350.00,
    salePrice: 1890.00,
    costPrice: 900.00,
    sku: "AF-SHI-FUL-01",
    barcode: "8941001004017",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash warm.",
    rating: 4.8,
    reviewCount: 22,
    isFeatured: false,
    isNewArrival: false,
    images: IMAGES.formalShirt,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },

  // --- POLOS ---
  {
    categorySlug: "regular-polo",
    name: "Honeycomb Pique Classic Regular Polo",
    slug: "honeycomb-pique-classic-regular-polo",
    shortDescription: "220 GSM heavyweight combed cotton pique with anti-curl collar.",
    description: `<h3>The Modern Classic</h3>
<p>Tailored from double-knitted honeycomb cotton pique with ribbed collar and armbands that retain their crisp shape through countless washes.</p>`,
    basePrice: 1650.00,
    salePrice: 1290.00,
    costPrice: 600.00,
    sku: "AF-POLO-REG-01",
    barcode: "8941001004018",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash cold. Do not tumble dry.",
    rating: 4.8,
    reviewCount: 78,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.polo,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "drop-shoulder-polo",
    name: "Street Minimalist Drop Shoulder Polo",
    slug: "street-minimalist-drop-shoulder-polo",
    shortDescription: "Oversized relaxed silhouette with dropped shoulder seams and zip placket.",
    description: `<h3>Contemporary Street Lux</h3>
<p>Crafted from dense modal French terry with clean metal quarter-zip collar and boxy modern drape.</p>`,
    basePrice: 1850.00,
    salePrice: 1450.00,
    costPrice: 700.00,
    sku: "AF-POLO-DRP-01",
    barcode: "8941001004019",
    gender: "MEN",
    season: "Summer 2026",
    careInstructions: "Machine wash cold inside out.",
    rating: 4.7,
    reviewCount: 45,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.polo,
    sizes: ["M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "striped-polo",
    name: "Breton Nautical Engineered Striped Polo",
    slug: "breton-nautical-engineered-striped-polo",
    shortDescription: "Yarn-dyed horizontal nautical stripes with contrasting knit collar.",
    description: `<h3>Heritage Coastal Aesthetics</h3>
<p>Featuring yarn-dyed stripes that will never fade or bleed. Tailored with reinforced side vents.</p>`,
    basePrice: 1750.00,
    salePrice: 1390.00,
    costPrice: 650.00,
    sku: "AF-POLO-STR-01",
    barcode: "8941001004020",
    gender: "MEN",
    season: "Summer 2026",
    careInstructions: "Machine wash cold with like colors.",
    rating: 4.8,
    reviewCount: 36,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.polo,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "printed-polo",
    name: "Botanical Jacquard Monogram Printed Polo",
    slug: "botanical-jacquard-monogram-printed-polo",
    shortDescription: "Subtle tone-on-tone micro botanical print on mercerized cotton.",
    description: `<h3>Refined Visual Texture</h3>
<p>An elevated statement piece that transitions effortlessly from country club afternoons to rooftop evenings.</p>`,
    basePrice: 1950.00,
    salePrice: 1550.00,
    costPrice: 750.00,
    sku: "AF-POLO-PRT-01",
    barcode: "8941001004021",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash cold.",
    rating: 4.7,
    reviewCount: 21,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.polo,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },

  // --- T-SHIRTS ---
  {
    categorySlug: "basic-t-shirt",
    name: "Heavyweight 240 GSM Crewneck Basic Tee",
    slug: "heavyweight-240-gsm-crewneck-basic-tee",
    shortDescription: "Premium combed cotton jersey with stay-flat reinforced collar.",
    description: `<h3>The Perfect Everyday Essential</h3>
<p>Constructed from thick, opaque 240 GSM organic cotton that holds its structure and drape all day long.</p>`,
    basePrice: 950.00,
    salePrice: 750.00,
    costPrice: 350.00,
    sku: "AF-TSH-BAS-01",
    barcode: "8941001004022",
    gender: "UNISEX",
    season: "All Season",
    careInstructions: "Machine wash warm.",
    rating: 4.9,
    reviewCount: 112,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.tshirt,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "premium-t-shirt",
    name: "Supima Silk-Touch Luxe Crewneck T-Shirt",
    slug: "supima-silk-touch-luxe-crewneck-t-shirt",
    shortDescription: "Ultra-luxurious 100% American Supima cotton with liquid smooth finish.",
    description: `<h3>Unrivaled Softness</h3>
<p>Crafted from the top 1% of world cotton crops. Naturally vibrant color retention, anti-pilling, and featherlight hand feel.</p>`,
    basePrice: 1450.00,
    salePrice: 1150.00,
    costPrice: 520.00,
    sku: "AF-TSH-PRM-01",
    barcode: "8941001004023",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash cold delicate.",
    rating: 5.0,
    reviewCount: 68,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.tshirt,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "oversized-t-shirt",
    name: "Acid Wash Heavyweight Oversized T-Shirt",
    slug: "acid-wash-heavyweight-oversized-t-shirt",
    shortDescription: "Streetwear aesthetic with dropped shoulders and vintage mineral wash.",
    description: `<h3>Downtown Edge</h3>
<p>Features thick 260 GSM loopback cotton, relaxed boxy cut, and distressed mineral acid wash effect.</p>`,
    basePrice: 1350.00,
    salePrice: 1050.00,
    costPrice: 480.00,
    sku: "AF-TSH-OVR-01",
    barcode: "8941001004024",
    gender: "UNISEX",
    season: "Summer 2026",
    careInstructions: "Wash inside out cold.",
    rating: 4.8,
    reviewCount: 57,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.tshirt,
    sizes: ["S", "M", "L", "XL"]
  },
  {
    categorySlug: "drop-shoulder-t-shirt",
    name: "Clean Cut Minimal Drop Shoulder T-Shirt",
    slug: "clean-cut-minimal-drop-shoulder-t-shirt",
    shortDescription: "Minimalist silhouette with tailored wide sleeves and seamless sides.",
    description: `<h3>Effortless Modern Proportion</h3>
<p>Perfect for layering over long sleeves or wearing solo with relaxed chinos and sneakers.</p>`,
    basePrice: 1250.00,
    salePrice: 990.00,
    costPrice: 440.00,
    sku: "AF-TSH-DRP-01",
    barcode: "8941001004025",
    gender: "UNISEX",
    season: "Summer 2026",
    careInstructions: "Machine wash cold.",
    rating: 4.7,
    reviewCount: 39,
    isFeatured: false,
    isNewArrival: false,
    images: IMAGES.tshirt,
    sizes: ["M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "printed-t-shirt",
    name: "Atelier Heritage Typographic Graphic Tee",
    slug: "atelier-heritage-typographic-graphic-tee",
    shortDescription: "High-density puff screen print celebrating Anchor Fashion heritage.",
    description: `<h3>Artistic Streetwear Expression</h3>
<p>Featuring rubberized tactile puff print on pre-shrunk combed cotton jersey.</p>`,
    basePrice: 1150.00,
    salePrice: 890.00,
    costPrice: 400.00,
    sku: "AF-TSH-PRT-01",
    barcode: "8941001004026",
    gender: "UNISEX",
    season: "All Season",
    careInstructions: "Iron on reverse side only. Do not bleach.",
    rating: 4.8,
    reviewCount: 46,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.tshirt,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },

  // --- BOTTOMS ---
  {
    categorySlug: "chino",
    name: "Milano Stretch Slim-Fit Chino Trouser",
    slug: "milano-stretch-slim-fit-chino-trouser",
    shortDescription: "Cotton twill with 3% elastane for unrestricted day-to-night flexibility.",
    description: `<h3>The Modern Smart Essential</h3>
<p>Tailored with a refined taper from thigh to cuff. Features internal shirt-gripper waistband and double welt rear pockets.</p>`,
    basePrice: 2450.00,
    salePrice: 1950.00,
    costPrice: 950.00,
    sku: "AF-BOT-CHI-01",
    barcode: "8941001004027",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash warm inside out.",
    rating: 4.9,
    reviewCount: 72,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.chino,
    sizes: ["30", "32", "34", "36", "38"]
  },
  {
    categorySlug: "formal-trouser",
    name: "Savile Wool-Blend Pleated Formal Trouser",
    slug: "savile-wool-blend-pleated-formal-trouser",
    shortDescription: "Italian style single reverse pleat with adjustable side tabs.",
    description: `<h3>Old Money Tailoring</h3>
<p>Designed without belt loops for sleek side adjusters. Cut with high-rise drape that elongates leg lines.</p>`,
    basePrice: 2850.00,
    salePrice: 2290.00,
    costPrice: 1100.00,
    sku: "AF-BOT-FOR-01",
    barcode: "8941001004028",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Dry clean recommended.",
    rating: 4.8,
    reviewCount: 38,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.chino,
    sizes: ["30", "32", "34", "36", "38"]
  },
  {
    categorySlug: "casual-trouser",
    name: "Urban Drawstring Easy Casual Trouser",
    slug: "urban-drawstring-easy-casual-trouser",
    shortDescription: "Relaxed hybrid trouser with elasticated waistband and tailored look.",
    description: `<h3>Comfort Meets Polish</h3>
<p>Combines the ease of lounge pants with the crisp lines of tailored trousers. Made from breathable tencel-cotton blend.</p>`,
    basePrice: 2150.00,
    salePrice: 1690.00,
    costPrice: 820.00,
    sku: "AF-BOT-CAS-01",
    barcode: "8941001004029",
    gender: "MEN",
    season: "Summer 2026",
    careInstructions: "Machine wash cold.",
    rating: 4.7,
    reviewCount: 29,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.chino,
    sizes: ["S (30)", "M (32)", "L (34)", "XL (36)", "XXL (38)"]
  },
  {
    categorySlug: "cargo",
    name: "Tactical Modular 6-Pocket Cargo Pant",
    slug: "tactical-modular-6-pocket-cargo-pant",
    shortDescription: "Durable ripstop cotton with ergonomic bellows cargo pockets.",
    description: `<h3>Utility Redefined</h3>
<p>Featuring reinforced knees, drawcord adjustable cuffs, and deep flap pockets engineered for everyday gear carry.</p>`,
    basePrice: 2650.00,
    salePrice: 2090.00,
    costPrice: 1000.00,
    sku: "AF-BOT-CRG-01",
    barcode: "8941001004030",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash cold.",
    rating: 4.8,
    reviewCount: 44,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.chino,
    sizes: ["30", "32", "34", "36", "38"]
  },
  {
    categorySlug: "shorts",
    name: "Riviera Linen-Blend Tailored Shorts",
    slug: "riviera-linen-blend-tailored-shorts",
    shortDescription: "7-inch inseam tailored shorts in breathable linen cotton.",
    description: `<h3>Resort Ease</h3>
<p>Cut above the knee for modern proportions. Perfect paired with polo shirts and boat shoes.</p>`,
    basePrice: 1650.00,
    salePrice: 1290.00,
    costPrice: 600.00,
    sku: "AF-BOT-SHO-01",
    barcode: "8941001004031",
    gender: "MEN",
    season: "Summer 2026",
    careInstructions: "Machine wash warm.",
    rating: 4.7,
    reviewCount: 31,
    isFeatured: false,
    isNewArrival: false,
    images: IMAGES.chino,
    sizes: ["30", "32", "34", "36", "38"]
  },
  {
    categorySlug: "denim",
    name: "Selvedge Raw Indigo Slim Tapered Jeans",
    slug: "selvedge-raw-indigo-slim-tapered-jeans",
    shortDescription: "13.5 oz red-line Japanese selvedge denim woven on vintage shuttle looms.",
    description: `<h3>Authentic Denim Craftsmanship</h3>
<p>Unwashed raw denim that molds to your body and develops high-contrast fading unique to your lifestyle.</p>`,
    basePrice: 3450.00,
    salePrice: 2750.00,
    costPrice: 1350.00,
    sku: "AF-BOT-DEN-02",
    barcode: "8941001004032",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Wear raw as long as possible before first cold soak.",
    rating: 5.0,
    reviewCount: 58,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.denim,
    sizes: ["30", "32", "34", "36", "38"]
  },

  // --- OUTERWEAR ---
  {
    categorySlug: "lightweight-jacket",
    name: "Weatherproof Windbreaker Lightweight Jacket",
    slug: "weatherproof-windbreaker-lightweight-jacket",
    shortDescription: "Water-repellent technical nylon shell with breathable mesh lining.",
    description: `<h3>All-Weather Urban Shield</h3>
<p>Featherlight storm protection featuring YKK waterproof zippers, adjustable hood, and packable pocket pouch.</p>`,
    basePrice: 3200.00,
    salePrice: 2550.00,
    costPrice: 1250.00,
    sku: "AF-OUT-LWT-01",
    barcode: "8941001004033",
    gender: "UNISEX",
    season: "Autumn 2026",
    careInstructions: "Machine wash cold delicate.",
    rating: 4.8,
    reviewCount: 34,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.outerwear,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "casual-blazer",
    name: "Unstructured Wool-Linen Casual Blazer",
    slug: "unstructured-wool-linen-casual-blazer",
    shortDescription: "Italian style soft shoulder construction without stiff internal canvas.",
    description: `<h3>Sprezzatura Italian Elegance</h3>
<p>Drapes like a cardigan while providing the commanding silhouette of a blazer. Patch pockets and notch lapels.</p>`,
    basePrice: 6200.00,
    salePrice: 4950.00,
    costPrice: 2500.00,
    sku: "AF-OUT-BLZ-01",
    barcode: "8941001004034",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Dry clean only.",
    rating: 4.9,
    reviewCount: 42,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.outerwear,
    sizes: ["38 (S)", "40 (M)", "42 (L)", "44 (XL)", "46 (XXL)"]
  },
  {
    categorySlug: "waistcoat",
    name: "Artisan Heritage Silk Embroidered Waistcoat",
    slug: "artisan-heritage-silk-embroidered-waistcoat",
    shortDescription: "Nehru mandarin collar vest in handloom silk jacquard.",
    description: `<h3>Regal Layering</h3>
<p>Designed to be worn over panjabis or crisp shirts for weddings and celebrations. Accented with brass buttons.</p>`,
    basePrice: 3450.00,
    salePrice: 2790.00,
    costPrice: 1350.00,
    sku: "AF-OUT-WST-01",
    barcode: "8941001004035",
    gender: "MEN",
    season: "Festive 2026",
    careInstructions: "Dry clean only.",
    rating: 4.8,
    reviewCount: 26,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.outerwear,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "overshirt",
    name: "Heavy Corduroy Workwear Overshirt",
    slug: "heavy-corduroy-workwear-overshirt",
    shortDescription: "8-wale plush cotton corduroy jacket-shirt for effortless layering.",
    description: `<h3>Vintage Texture & Warmth</h3>
<p>Substantial enough to serve as a light jacket in mild chill, stylish enough to wear buttoned up as a statement shirt.</p>`,
    basePrice: 2850.00,
    salePrice: 2250.00,
    costPrice: 1100.00,
    sku: "AF-OUT-OVR-01",
    barcode: "8941001004036",
    gender: "MEN",
    season: "Winter 2026",
    careInstructions: "Machine wash cold delicate.",
    rating: 4.8,
    reviewCount: 31,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.outerwear,
    sizes: ["M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "jacket",
    name: "Classic Suede Bomber Flight Jacket",
    slug: "classic-suede-bomber-flight-jacket",
    shortDescription: "Supple vegan suede with ribbed varsity hem and storm cuffs.",
    description: `<h3>Timeless Aviator Heritage</h3>
<p>Lined with smooth quilted satin for easy on-and-off layering. Features antique brass hardware.</p>`,
    basePrice: 4800.00,
    salePrice: 3850.00,
    costPrice: 1900.00,
    sku: "AF-OUT-JCK-02",
    barcode: "8941001004037",
    gender: "MEN",
    season: "Winter 2026",
    careInstructions: "Specialist clean only.",
    rating: 4.9,
    reviewCount: 47,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.outerwear,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },

  // --- FOOTWEAR ---
  {
    categorySlug: "formal-shoes",
    name: "Artisan Goodyear-Welted Cap-Toe Oxford Shoes",
    slug: "artisan-goodyear-welted-cap-toe-oxford-shoes",
    shortDescription: "Full-grain calfskin leather handcrafted with channel-stitched leather soles.",
    description: `<h3>Gentleman's Cornerstone</h3>
<p>Hand-burnished deep cognac leather oxford shoes. Designed to be resoled repeatedly over decades of boardroom leadership.</p>`,
    basePrice: 5600.00,
    salePrice: 4490.00,
    costPrice: 2200.00,
    sku: "AF-SHO-FOR-01",
    barcode: "8941001004038",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Polish with natural beeswax cream. Use cedar shoe trees.",
    rating: 4.9,
    reviewCount: 38,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.footwear,
    sizes: ["40", "41", "42", "43", "44"]
  },
  {
    categorySlug: "casual-shoes",
    name: "Suede Leather Derby Casual Shoes",
    slug: "suede-leather-derby-casual-shoes",
    shortDescription: "Supple Italian suede with lightweight EVA cushioned outsole.",
    description: `<h3>Effortless Smart Walk</h3>
<p>Open lacing derby design that pairs impeccably with chinos or rolled denims for weekend travel.</p>`,
    basePrice: 4200.00,
    salePrice: 3350.00,
    costPrice: 1650.00,
    sku: "AF-SHO-CAS-01",
    barcode: "8941001004039",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Brush with dedicated suede brush. Apply water repellent spray.",
    rating: 4.8,
    reviewCount: 29,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.footwear,
    sizes: ["40", "41", "42", "43", "44"]
  },
  {
    categorySlug: "loafers",
    name: "Hand-Stitched Penny Suede Loafers",
    slug: "hand-stitched-penny-suede-loafers",
    shortDescription: "Sockless luxury with memory foam insole and genuine leather lining.",
    description: `<h3>Slip-On Elegance</h3>
<p>Classic penny strap saddle detailing with reinforced heel counter and rubber island sole for confident traction.</p>`,
    basePrice: 4500.00,
    salePrice: 3600.00,
    costPrice: 1750.00,
    sku: "AF-SHO-LOA-01",
    barcode: "8941001004040",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Suede cleaner only.",
    rating: 4.9,
    reviewCount: 51,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.footwear,
    sizes: ["40", "41", "42", "43", "44"]
  },
  {
    categorySlug: "sneakers",
    name: "Minimalist Low-Top Nappa Leather Sneakers",
    slug: "minimalist-low-top-nappa-leather-sneakers",
    shortDescription: "Clean Italian silhouette crafted from buttery soft full-grain white Nappa leather.",
    description: `<h3>The Everyday Luxury Sneaker</h3>
<p>Stitched rubber cupsole, waxed cotton laces, and plush leather calf lining for breathable all-day walking comfort.</p>`,
    basePrice: 4800.00,
    salePrice: 3850.00,
    costPrice: 1900.00,
    sku: "AF-SHO-SNK-01",
    barcode: "8941001004041",
    gender: "UNISEX",
    season: "All Season",
    careInstructions: "Wipe clean with damp cloth and leather conditioner.",
    rating: 5.0,
    reviewCount: 84,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.footwear,
    sizes: ["40", "41", "42", "43", "44"]
  },
  {
    categorySlug: "sandals-and-slippers",
    name: "Handcrafted Full-Grain Leather Slide Sandals",
    slug: "handcrafted-full-grain-leather-slide-sandals",
    shortDescription: "Ergonomic molded footbed wrapped in supple genuine leather.",
    description: `<h3>Summer Stride</h3>
<p>Thick cross-strap leather upper with shock-absorbing cork midsole. Ideal accompaniment for Panjabis and casual wear.</p>`,
    basePrice: 2200.00,
    salePrice: 1750.00,
    costPrice: 850.00,
    sku: "AF-SHO-SAN-01",
    barcode: "8941001004042",
    gender: "MEN",
    season: "Summer 2026",
    careInstructions: "Keep away from prolonged soaking.",
    rating: 4.8,
    reviewCount: 42,
    isFeatured: false,
    isNewArrival: false,
    images: IMAGES.footwear,
    sizes: ["40", "41", "42", "43", "44"]
  },

  // --- ACCESSORIES ---
  {
    categorySlug: "wallet",
    name: "Slim Bifold RFID-Shielded Full-Grain Leather Wallet",
    slug: "slim-bifold-rfid-shielded-full-grain-leather-wallet",
    shortDescription: "Vegetable-tanned cowhide leather with integrated RFID frequency protection.",
    description: `<h3>Pocket Perfection</h3>
<p>Holds 8 cards and full-length cash without bulging your suit pockets. Develops rich patina over time.</p>`,
    basePrice: 1650.00,
    salePrice: 1290.00,
    costPrice: 550.00,
    sku: "AF-ACC-WAL-01",
    barcode: "8941001004043",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Condition with leather balm yearly.",
    rating: 4.9,
    reviewCount: 63,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.accessories,
    sizes: ["Standard"]
  },
  {
    categorySlug: "cap",
    name: "Heritage Washed Cotton Dad Cap",
    slug: "heritage-washed-cotton-dad-cap",
    shortDescription: "6-panel vintage unconstructed baseball cap with brass buckle strap.",
    description: `<h3>Casual Cool</h3>
<p>Low profile curved visor, embroidered eyelets, and subtle tone-on-tone Anchor logo embroidery.</p>`,
    basePrice: 850.00,
    salePrice: 650.00,
    costPrice: 280.00,
    sku: "AF-ACC-CAP-01",
    barcode: "8941001004044",
    gender: "UNISEX",
    season: "All Season",
    careInstructions: "Spot clean only.",
    rating: 4.8,
    reviewCount: 39,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.accessories,
    sizes: ["Free Size"]
  },
  {
    categorySlug: "socks",
    name: "Mercerized Combed Cotton Dress Socks (Pack of 3)",
    slug: "mercerized-combed-cotton-dress-socks-pack-of-3",
    shortDescription: "Seamless hand-linked toe and reinforced heel in classic corporate colors.",
    description: `<h3>Invisible Comfort</h3>
<p>Stays up without binding calves. Engineered from lustrous breathable Scottish lisle cotton thread.</p>`,
    basePrice: 750.00,
    salePrice: 590.00,
    costPrice: 240.00,
    sku: "AF-ACC-SOX-01",
    barcode: "8941001004045",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash warm.",
    rating: 4.8,
    reviewCount: 47,
    isFeatured: false,
    isNewArrival: false,
    images: IMAGES.accessories,
    sizes: ["Free Size (40-45)"]
  },
  {
    categorySlug: "tie",
    name: "Pure Silk Jacquard Woven Necktie & Pocket Square Set",
    slug: "pure-silk-jacquard-woven-necktie-pocket-square-set",
    shortDescription: "Hand-rolled 8cm British width necktie woven in luxury 100% mulberry silk.",
    description: `<h3>The Diplomatic Touch</h3>
<p>Dense wool interlining that yields a dimpled, flawless four-in-hand knot every morning.</p>`,
    basePrice: 1850.00,
    salePrice: 1450.00,
    costPrice: 650.00,
    sku: "AF-ACC-TIE-01",
    barcode: "8941001004046",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Dry clean only.",
    rating: 4.9,
    reviewCount: 33,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.accessories,
    sizes: ["Standard"]
  },
  {
    categorySlug: "belt",
    name: "Italian Full-Grain Vegetable-Tanned Leather Dress Belt",
    slug: "italian-full-grain-vegetable-tanned-leather-dress-belt",
    shortDescription: "Solid brass buckle with satin nickel plating on 35mm full-grain leather.",
    description: `<h3>Timeless Craftsmanship</h3>
<p>Cut from single-piece hide without synthetic fillers. Beveled edges and burnished by hand.</p>`,
    basePrice: 1950.00,
    salePrice: 1550.00,
    costPrice: 720.00,
    sku: "AF-ACC-BLT-02",
    barcode: "8941001004047",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Wipe with leather conditioner.",
    rating: 4.9,
    reviewCount: 56,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.accessories,
    sizes: ["32", "34", "36", "38", "40"]
  },

  // --- ESSENTIALS ---
  {
    categorySlug: "handkerchief",
    name: "Egyptian Cotton Satin Border Handkerchief Set (Pack of 4)",
    slug: "egyptian-cotton-satin-border-handkerchief-set-pack-of-4",
    shortDescription: "Ultra-absorbent 100% fine cotton with hand-rolled hems.",
    description: `<h3>The Gentle Refinement</h3>
<p>Dignified white handkerchiefs accented with subtle woven satin stripes. Hypoallergenic and gentle on skin.</p>`,
    basePrice: 650.00,
    salePrice: 490.00,
    costPrice: 200.00,
    sku: "AF-ESS-HND-01",
    barcode: "8941001004048",
    gender: "UNISEX",
    season: "All Season",
    careInstructions: "Machine wash warm.",
    rating: 4.8,
    reviewCount: 28,
    isFeatured: false,
    isNewArrival: false,
    images: IMAGES.essentials,
    sizes: ["Standard (40x40cm)"]
  },
  {
    categorySlug: "innerwear",
    name: "MicroModal Ultra-Soft Crewneck Undershirt (Pack of 2)",
    slug: "micromodal-ultra-soft-crewneck-undershirt-pack-of-2",
    shortDescription: "Naturally breathable beechwood MicroModal fiber that stays invisible under shirts.",
    description: `<h3>Second-Skin Softness</h3>
<p>Designed to be 3x softer than cotton, absorbing moisture and preventing dress shirt sweat stains.</p>`,
    basePrice: 1250.00,
    salePrice: 990.00,
    costPrice: 450.00,
    sku: "AF-ESS-INN-01",
    barcode: "8941001004049",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash cold delicate.",
    rating: 4.9,
    reviewCount: 49,
    isFeatured: false,
    isNewArrival: true,
    images: IMAGES.essentials,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "undergarments",
    name: "Antimicrobial Seamless Boxer Briefs (Pack of 3)",
    slug: "antimicrobial-seamless-boxer-briefs-pack-of-3",
    shortDescription: "4-way stretch bamboo cotton with anti-chafing contour pouch.",
    description: `<h3>Supreme Daily Comfort</h3>
<p>Engineered without irritating tags. Wide non-roll plush waistband that never digs into skin.</p>`,
    basePrice: 1450.00,
    salePrice: 1190.00,
    costPrice: 520.00,
    sku: "AF-ESS-UND-01",
    barcode: "8941001004050",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash cold.",
    rating: 4.9,
    reviewCount: 67,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.essentials,
    sizes: ["S (30-32)", "M (32-34)", "L (34-36)", "XL (36-38)", "XXL (38-40)"]
  },

  // --- COLLECTIONS ---
  {
    categorySlug: "best-sellers",
    name: "Anchor Signature Gilded Crown Royal Panjabi",
    slug: "anchor-signature-gilded-crown-royal-panjabi",
    shortDescription: "Our #1 best-selling ceremonial silk panjabi with golden crest embroidery.",
    description: `<h3>The Anchor Icon</h3>
<p>Loved by over 1,500 grooms and distinguished guests across Bangladesh. Woven from supreme silk-viscose blend.</p>`,
    basePrice: 5400.00,
    salePrice: 4350.00,
    costPrice: 2200.00,
    sku: "AF-COL-BST-01",
    barcode: "8941001004051",
    gender: "MEN",
    season: "Festive 2026",
    careInstructions: "Dry clean only.",
    rating: 5.0,
    reviewCount: 142,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.panjabi,
    sizes: ["S (38)", "M (40)", "L (42)", "XL (44)", "XXL (46)"]
  },
  {
    categorySlug: "premium-collection",
    name: "Limited Edition Hand-Loomed Mulberry Silk Panjabi",
    slug: "limited-edition-hand-loomed-mulberry-silk-panjabi",
    shortDescription: "Only 100 units produced. Master-weaver certified mulberry silk.",
    description: `<h3>Collector's Masterpiece</h3>
<p>Hand-loomed in small batches in Rajshahi. Hand-polished horn buttons and gold thread borders.</p>`,
    basePrice: 7800.00,
    salePrice: 6500.00,
    costPrice: 3400.00,
    sku: "AF-COL-PRM-01",
    barcode: "8941001004052",
    gender: "MEN",
    season: "Festive 2026",
    careInstructions: "Professional dry clean only.",
    rating: 5.0,
    reviewCount: 26,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.panjabi,
    sizes: ["M (40)", "L (42)", "XL (44)", "XXL (46)"]
  },
  {
    categorySlug: "festive-collection",
    name: "Nocturne Velvet Embroidered Prince Coat",
    slug: "nocturne-velvet-embroidered-prince-coat",
    shortDescription: "Plush midnight velvet prince coat with intricate baroque bullion wire embroidery.",
    description: `<h3>Regal Evening Distinction</h3>
<p>A masterpiece of South Asian formal couture. Features tailored shoulder silhouette, custom monogram lining, and metallic crest buttons.</p>`,
    basePrice: 8500.00,
    salePrice: 6990.00,
    costPrice: 3800.00,
    sku: "AF-COL-FST-01",
    barcode: "8941001004053",
    gender: "MEN",
    season: "Festive 2026",
    careInstructions: "Specialist dry clean only.",
    rating: 5.0,
    reviewCount: 38,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.outerwear,
    sizes: ["38 (S)", "40 (M)", "42 (L)", "44 (XL)", "46 (XXL)"]
  },
  {
    categorySlug: "everyday-collection",
    name: "All-Day Comfort Stretch Pique Polo",
    slug: "all-day-comfort-stretch-pique-polo",
    shortDescription: "Moisture-wicking, anti-odor stretch polo built for non-stop city movement.",
    description: `<h3>Performance Daily Luxury</h3>
<p>Engineered for the demands of urban commuting and weekend relaxation. Never loses shape or color vibrancy.</p>`,
    basePrice: 1550.00,
    salePrice: 1250.00,
    costPrice: 580.00,
    sku: "AF-COL-EVR-01",
    barcode: "8941001004054",
    gender: "MEN",
    season: "All Season",
    careInstructions: "Machine wash warm.",
    rating: 4.8,
    reviewCount: 88,
    isFeatured: true,
    isNewArrival: false,
    images: IMAGES.polo,
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    categorySlug: "new-arrivals",
    name: "Autumn Dusk Modular Field Overshirt",
    slug: "autumn-dusk-modular-field-overshirt",
    shortDescription: "New arrival technical twill overshirt with utility bellows pockets.",
    description: `<h3>Fresh Season Drop</h3>
<p>Just released from the Anchor design atelier. Modern outdoor-inspired cut tailored for modern metropolitan living.</p>`,
    basePrice: 3100.00,
    salePrice: 2490.00,
    costPrice: 1200.00,
    sku: "AF-COL-NEW-01",
    barcode: "8941001004055",
    gender: "UNISEX",
    season: "Autumn 2026",
    careInstructions: "Machine wash cold.",
    rating: 4.9,
    reviewCount: 15,
    isFeatured: true,
    isNewArrival: true,
    images: IMAGES.outerwear,
    sizes: ["S", "M", "L", "XL", "XXL"]
  }
];

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log("Connected to PostgreSQL database successfully.");

  try {
    // Fetch all categories map
    const catRes = await client.query(`SELECT id, slug, name FROM categories;`);
    const categoryMap = new Map();
    for (const c of catRes.rows) {
      categoryMap.set(c.slug, c.id);
    }
    console.log(`Loaded ${categoryMap.size} categories from database.`);

    let insertedCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < PRODUCTS.length; i++) {
      const prod = PRODUCTS[i];
      const categoryId = categoryMap.get(prod.categorySlug);

      if (!categoryId) {
        console.warn(`Category not found for slug: ${prod.categorySlug}. Skipping.`);
        continue;
      }

      console.log(`[${i + 1}/${PRODUCTS.length}] Seeding: "${prod.name}" (category: ${prod.categorySlug})`);

      try {
        // Generate guaranteed unique 13-digit EAN barcode
        const uniqueBarcode = `8942000${String(10000 + i)}`;

        // 1. Check if product already exists by slug
        const checkRes = await client.query(`SELECT id FROM products WHERE slug = $1 LIMIT 1;`, [prod.slug]);
        let productId = null;

        if (checkRes.rows.length > 0) {
          productId = checkRes.rows[0].id;
          await client.query(
            `UPDATE products SET
              name = $1, description = $2, short_description = $3,
              base_price = $4, sale_price = $5, cost_price = $6,
              sku = $7, barcode = $8, gender = $9, season = $10,
              care_instructions = $11, is_featured = $12, is_new_arrival = $13,
              rating = $14, review_count = $15, image_url = $16,
              gallery_urls = $17, category_id = $18, updated_at = NOW()
            WHERE id = $19;`,
            [
              prod.name, prod.description, prod.shortDescription,
              prod.basePrice, prod.salePrice, prod.costPrice,
              prod.sku, uniqueBarcode, prod.gender, prod.season,
              prod.careInstructions, prod.isFeatured, prod.isNewArrival,
              prod.rating, prod.reviewCount, prod.images[0],
              prod.images, categoryId, productId
            ]
          );
          updatedCount++;
        } else {
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
              prod.name, prod.slug, prod.description, prod.shortDescription,
              prod.basePrice, prod.salePrice, prod.costPrice, prod.sku, uniqueBarcode,
              prod.gender, prod.season, prod.careInstructions,
              prod.isFeatured, prod.isNewArrival, prod.rating, prod.reviewCount,
              prod.images[0], prod.images, categoryId
            ]
          );
          productId = insertRes.rows[0].id;
          insertedCount++;
        }

      // 2. Link in product_categories join table
      await client.query(
        `INSERT INTO product_categories (product_id, category_id, assigned_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (product_id, category_id) DO NOTHING;`,
        [productId, categoryId]
      );

      // 3. Populate product_media
      await client.query(`DELETE FROM product_media WHERE product_id = $1;`, [productId]);
      for (let mIdx = 0; mIdx < prod.images.length; mIdx++) {
        await client.query(
          `INSERT INTO product_media (
            product_id, url, is_primary, display_order, media_type, created_at
          ) VALUES ($1, $2, $3, $4, 'IMAGE', NOW());`,
          [productId, prod.images[mIdx], mIdx === 0, mIdx]
        );
      }

      // 4. Create Variants with Inventory in Warehouse
      for (const size of prod.sizes) {
        const variantSku = `${prod.sku}-${size.replace(/[^a-zA-Z0-9]/g, "")}`;
        const attributes = JSON.stringify({ size });

        let variantId = null;
        const varRes = await client.query(`SELECT id FROM variants WHERE sku = $1 LIMIT 1;`, [variantSku]);

        if (varRes.rows.length > 0) {
          variantId = varRes.rows[0].id;
          await client.query(
            `UPDATE variants SET
              price_override = $1, sale_price = $2, cost_price = $3,
              attributes = $4, is_active = true, updated_at = NOW()
            WHERE id = $5;`,
            [prod.basePrice, prod.salePrice, prod.costPrice, attributes, variantId]
          );
        } else {
          const newVarRes = await client.query(
            `INSERT INTO variants (
              product_id, sku, price_override, sale_price, cost_price,
              attributes, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
            RETURNING id;`,
            [productId, variantSku, prod.basePrice, prod.salePrice, prod.costPrice, attributes]
          );
          variantId = newVarRes.rows[0].id;
        }

        // Add inventory level in central warehouse
        if (variantId && WAREHOUSE_ID) {
          await client.query(
            `INSERT INTO inventory_levels (
              variant_id, warehouse_id, quantity_available, quantity_reserved, reorder_point, created_at, updated_at
            ) VALUES ($1, $2, 50, 0, 5, NOW(), NOW())
            ON CONFLICT (variant_id, warehouse_id) DO UPDATE SET
              quantity_available = 50,
              updated_at = NOW();`,
            [variantId, WAREHOUSE_ID]
          );
        }
      }
      } catch (prodErr) {
        console.error(`  Error seeding product "${prod.name}":`, prodErr.message);
      }
    }

    console.log(`\n=================================================`);
    console.log(`SEED COMPLETED SUCCESSFULLY!`);
    console.log(`New Products Inserted: ${insertedCount}`);
    console.log(`Products Updated: ${updatedCount}`);
    console.log(`=================================================`);

  } catch (err) {
    console.error("Error during seeding:", err);
  } finally {
    await client.end();
  }
}

seed();
