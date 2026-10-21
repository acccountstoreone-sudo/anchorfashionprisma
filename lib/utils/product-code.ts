import { prisma } from "../prisma";

/**
 * Standard Clothing Brand Product Code / Style Code Generator.
 * Creates short, clean, human-readable, and 100% unique style codes (e.g., AFPTS1, AFPJB1).
 *
 * Structure:
 * - Brand Prefix: "AF" (Anchor Fashion)
 * - Category / Style Acronym: e.g. "Polo T-Shirt" -> "PTS", "Panjabi" -> "PJB"
 * - Unique Integer Sequence: 1, 2, 3... (highest in database + 1)
 *
 * Examples:
 * - "Polo T-Shirt" -> AFPTS1
 * - "Royal Cotton Panjabi" -> AFPJB1
 * - "Denim Jeans" -> AFDJ1 (or AFDNM1)
 * - "Casual Shirt" -> AFCS1
 */

// Category acronym dictionary for fashion & clothing retail
const FASHION_ACRONYMS: Record<string, string> = {
  // Men & Women Tops
  polo: "PTS",
  "polo-t-shirt": "PTS",
  "polo-shirt": "PTS",
  "polo t-shirt": "PTS",
  "polo shirt": "PTS",
  "t-shirt": "TS",
  tshirt: "TS",
  tee: "TS",
  "drop-shoulder": "DST",
  "drop shoulder": "DST",
  panjabi: "PJB",
  punjabi: "PJB",
  kabli: "KBL",
  shirt: "SHT",
  "casual-shirt": "CS",
  "casual shirt": "CS",
  "formal-shirt": "FS",
  "formal shirt": "FS",
  kurti: "KRT",
  kameez: "KMZ",
  salwar: "SLW",
  saree: "SRE",
  shari: "SRE",
  hoodie: "HD",
  sweatshirt: "SWT",
  sweater: "SWT",
  jacket: "JKT",
  blazer: "BLZ",
  waistcoat: "WST",
  "co-ord": "CRD",

  // Bottoms
  jeans: "DJ",
  denim: "DJ",
  pants: "PNT",
  pant: "PNT",
  trouser: "TRS",
  trousers: "TRS",
  chino: "CHN",
  chinos: "CHN",
  cargo: "CRG",
  joggers: "JGR",
  shorts: "SHR",
  pajama: "PJM",
  pyjama: "PJM",
  leggings: "LGN",

  // Accessories & Essentials
  belt: "BLT",
  wallet: "WLT",
  shoe: "SH",
  shoes: "SH",
  sneaker: "SNK",
  sneakers: "SNK",
  loafers: "LFR",
  sandal: "SND",
  boxer: "BX",
  brief: "BRF",
  innerwear: "INW",
  perfume: "PRF",
  cap: "CAP",
};

/**
 * Derives a 2-4 letter uppercase acronym from category or product name.
 */
export function deriveAcronym(categoryOrName: string): string {
  if (!categoryOrName || !categoryOrName.trim()) return "PRD";

  const clean = categoryOrName.trim().toLowerCase();

  // 1. Direct dictionary lookup
  if (FASHION_ACRONYMS[clean]) {
    return FASHION_ACRONYMS[clean];
  }

  // 2. Check if any dictionary key is included in the string (e.g. "Men's Polo T-Shirt" includes "polo t-shirt")
  for (const [key, acronym] of Object.entries(FASHION_ACRONYMS)) {
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(clean)) {
      return acronym;
    }
  }

  // 3. Fallback: extract initials from words (ignoring common fluff words)
  const fluffWords = new Set(["men", "mens", "women", "womens", "boys", "girls", "kids", "the", "a", "an", "and", "of", "in", "for", "with", "premium", "luxury", "classic", "slim", "fit"]);
  const words = clean
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter((w) => w.length > 0);

  const significantWords = words.filter((w) => !fluffWords.has(w));
  const targetWords = significantWords.length > 0 ? significantWords : words;

  if (targetWords.length >= 2) {
    const initials = targetWords.slice(0, 3).map((w) => w[0].toUpperCase()).join("");
    if (initials.length >= 2) return initials;
  }

  if (targetWords.length === 1) {
    const word = targetWords[0];
    // Remove vowels after first letter to create a consonant-based short code
    const firstChar = word[0].toUpperCase();
    const restConsonants = word.slice(1).replace(/[aeiou]/gi, "").toUpperCase();
    const candidate = (firstChar + restConsonants).slice(0, 3);
    if (candidate.length >= 2) return candidate;
    return word.slice(0, 3).toUpperCase();
  }

  return "PRD";
}

/**
 * Generates the next short, unique product code (e.g., AFPTS1, AFPTS2).
 * Queries the database to guarantee uniqueness across products and variants.
 */
export async function generateUniqueProductCode(
  productName: string,
  categoryNameOrSlug?: string,
  brandPrefix = "AF"
): Promise<string> {
  const brand = (brandPrefix || "AF").trim().toUpperCase();
  
  // Prefer category acronym if provided, else product name
  const acronym = deriveAcronym(categoryNameOrSlug || productName);
  const prefix = `${brand}${acronym}`; // e.g. "AFPTS"

  try {
    // Find all existing product SKUs that start with this prefix
    const [matchingProducts, matchingVariants] = await Promise.all([
      prisma.product.findMany({
        where: {
          sku: {
            startsWith: prefix,
            mode: "insensitive",
          },
        },
        select: { sku: true },
      }),
      prisma.variant.findMany({
        where: {
          sku: {
            startsWith: prefix,
            mode: "insensitive",
          },
        },
        select: { sku: true },
      }),
    ]);

    const existingSkus = new Set<string>();
    matchingProducts.forEach((p) => p.sku && existingSkus.add(p.sku.toUpperCase()));
    matchingVariants.forEach((v) => v.sku && existingSkus.add(v.sku.toUpperCase()));

    // Extract maximum existing integer suffix
    let maxNumber = 0;
    const regex = new RegExp(`^${prefix}(\\d+)$`, "i");

    for (const sku of existingSkus) {
      const match = sku.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    // Next unique number
    let nextNumber = maxNumber + 1;
    let candidate = `${prefix}${nextNumber}`;

    // Extra safety: loop until confirmed completely free
    while (existingSkus.has(candidate)) {
      nextNumber++;
      candidate = `${prefix}${nextNumber}`;
    }

    return candidate;
  } catch (err) {
    console.error("Error generating unique product code, falling back to random:", err);
    const fallbackRand = Math.floor(1 + Math.random() * 99);
    return `${prefix}${fallbackRand}`;
  }
}

const FASHION_COLOR_CODES: Record<string, string> = {
  black: "BLK",
  white: "WHT",
  navy: "NVY",
  "navy blue": "NB",
  maroon: "MRN",
  grey: "GRY",
  gray: "GRY",
  charcoal: "CHR",
  "charcoal grey": "CHG",
  olive: "OLV",
  "olive green": "OLV",
  green: "GRN",
  blue: "BLU",
  "sky blue": "SKB",
  red: "RED",
  beige: "BGE",
  brown: "BRN",
  yellow: "YLW",
  orange: "ORG",
  purple: "PRP",
  pink: "PNK",
};

/**
 * Generate a short, standardized variant SKU from the base product code.
 * Example: baseCode = "AFPTS1", color = "Black", size = "XL" -> "AFPTS1-BLK-XL"
 */
export function formatVariantSku(baseCode: string, color?: string, size?: string): string {
  const base = (baseCode || "AFPRD1").trim().toUpperCase();

  let colorCode = "";
  if (color?.trim()) {
    const cleanColor = color.trim().toLowerCase();
    colorCode =
      FASHION_COLOR_CODES[cleanColor] ||
      cleanColor.replace(/[^a-z0-9]/g, "").slice(0, 3).toUpperCase();
  }

  const sizeCode = size?.trim()
    ? size.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    : "";

  const parts = [base];
  if (colorCode) parts.push(colorCode);
  if (sizeCode) parts.push(sizeCode);

  return parts.join("-");
}

export const APPAREL_SIZE_SYSTEMS = [
  { id: "alpha", label: "👕 Tops (S-3XL)", sizes: ["S", "M", "L", "XL", "XXL", "3XL"] },
  { id: "waist", label: "👖 Bottoms (28-38)", sizes: ["28", "30", "32", "34", "36", "38"] },
  { id: "traditional", label: "🥻 Panjabi/Kurti (38-46)", sizes: ["38", "40", "42", "44", "46"] },
  { id: "footwear", label: "👟 Footwear (39-44)", sizes: ["39", "40", "41", "42", "43", "44"] },
  { id: "standard", label: "👜 Free Size", sizes: ["Free Size"] },
];

export function detectApparelSystemForCategory(categoryName: string): { systemId: string; defaultSizes: string[] } {
  const norm = (categoryName || "").toLowerCase();
  if (norm.match(/pant|bottom|trouser|jean|denim|boxer|short|jogger|chino/)) {
    return { systemId: "waist", defaultSizes: ["28", "30", "32", "34", "36"] };
  }
  if (norm.match(/panjabi|punjabi|kurti|kurta|sherwani|kameez|pajama|payjama/)) {
    return { systemId: "traditional", defaultSizes: ["38", "40", "42", "44"] };
  }
  if (norm.match(/shoe|sandal|sneaker|footwear|boot|loafer|slipper/)) {
    return { systemId: "footwear", defaultSizes: ["40", "41", "42", "43"] };
  }
  if (norm.match(/bag|cap|belt|accessory|wallet|tie|sunglass|watch/)) {
    return { systemId: "standard", defaultSizes: ["Free Size"] };
  }
  return { systemId: "alpha", defaultSizes: ["M", "L", "XL", "XXL"] };
}

export { generateEAN13Sync as generateEAN13Barcode } from "./barcode";
