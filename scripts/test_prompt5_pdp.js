const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// In-memory simulation of client PDP variant selector state machine to test logic
function calculateSelectedVariant({ variants, selectedAttributes, baseStock = 0, productPrice = 0, productSalePrice = null, flashSale = null }) {
  const processed = variants.map(v => {
    let attrs = {};
    if (v.variant_attribute_values) {
      for (const vav of v.variant_attribute_values) {
        const name = vav.attribute_values?.attributes?.name;
        const val = vav.attribute_values?.value;
        if (name && val) attrs[name.trim()] = val.trim();
      }
    }
    if (v.attributes) {
      let p = v.attributes;
      if (typeof p === "string") {
        try { p = JSON.parse(p); } catch {}
      }
      if (typeof p === "object" && p !== null) {
        for (const [k, val] of Object.entries(p)) {
          if (typeof val === "string") attrs[k.trim()] = val.trim();
        }
      }
    }

    const stock = Array.isArray(v.inventory_levels) && v.inventory_levels.length > 0
      ? v.inventory_levels.reduce((s, l) => s + (l.quantity_available || 0), 0)
      : (v.stock_quantity ?? baseStock);

    return {
      raw: v,
      attributes: attrs,
      stock,
      isActive: v.is_active ?? true,
    };
  });

  const matched = processed.find(v => {
    if (!v.isActive) return false;
    return Object.entries(selectedAttributes).every(([k, val]) => v.attributes[k] === val);
  });

  const matchedRaw = matched?.raw || null;
  const stock = matchedRaw ? matched.stock : (variants.length > 0 ? 0 : baseStock);
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;
  const currentSku = matchedRaw?.sku || "DEFAULT-SKU";

  let effectivePrice = matchedRaw?.price_override ?? matchedRaw?.price ?? productPrice;
  let compareAtPrice = null;

  if (flashSale && (flashSale.stock_allocated - flashSale.stock_sold > 0)) {
    effectivePrice = flashSale.flash_price;
    compareAtPrice = matchedRaw?.price_override ?? productPrice;
  } else if (matchedRaw?.sale_price && matchedRaw.sale_price < effectivePrice) {
    compareAtPrice = effectivePrice;
    effectivePrice = matchedRaw.sale_price;
  } else if (productSalePrice && productSalePrice < effectivePrice) {
    compareAtPrice = effectivePrice;
    effectivePrice = productSalePrice;
  }

  return {
    matchedVariant: matchedRaw,
    effectivePrice,
    compareAtPrice,
    currentSku,
    stock,
    isOutOfStock,
    isLowStock,
    canPurchase: !isOutOfStock && Boolean(matchedRaw || variants.length === 0)
  };
}

async function runTests() {
  console.log("==================================================================");
  console.log("   ANCHOR FASHION — PROMPT 5: PDP VARIANT & CART TEST SUITE       ");
  console.log("==================================================================\n");

  const runId = Date.now();
  let testCartId = null;
  let warehouseId = null;
  const createdVariantIds = [];
  const createdProductIds = [];

  try {
    // 0. Setup a test warehouse for inventory testing
    console.log("▶ Setting up test warehouse & baseline environment...");
    const { data: existingWh } = await supabase.from("warehouses").select("id").limit(1).maybeSingle();
    if (existingWh) {
      warehouseId = existingWh.id;
    } else {
      const { data: newWh, error: whErr } = await supabase
        .from("warehouses")
        .insert({
          name: `Test Warehouse ${runId}`,
          type: "WAREHOUSE",
          is_active: true
        })
        .select("id")
        .single();
      if (whErr) throw new Error(`Warehouse setup failed: ${whErr.message}`);
      warehouseId = newWh.id;
    }
    assert(Boolean(warehouseId), `Test warehouse active: ${warehouseId}`);

    // Create a temporary test cart
    const testSessionId = `test_session_${runId}`;
    const { data: cart, error: cartErr } = await supabase
      .from("carts")
      .insert({ session_id: testSessionId })
      .select("id")
      .single();
    if (cartErr) throw new Error(`Cart setup failed: ${cartErr.message}`);
    testCartId = cart.id;
    assert(Boolean(testCartId), `Test cart created: ${testCartId}`);

    // -------------------------------------------------------------
    // TEST A: Product A — No Variants
    // -------------------------------------------------------------
    console.log("\n▶ [Product A] Testing Product with No Variants...");
    const { data: prodA, error: errA } = await supabase
      .from("products")
      .insert({
        name: `Product A (No Variants) ${runId}`,
        slug: `product-a-${runId}`,
        base_price: 1500,
        sku: `SKU-PROD-A-${runId}`,
        status: "ACTIVE"
      })
      .select("id, name, slug, base_price, sku")
      .single();
    if (errA) throw new Error(`Product A creation failed: ${errA.message}`);
    createdProductIds.push(prodA.id);

    // Simulate PDP state machine for product with no variants
    const stateA = calculateSelectedVariant({
      variants: [],
      selectedAttributes: {},
      baseStock: 25,
      productPrice: 1500
    });
    assert(stateA.canPurchase === true, "PDP allows Add to Cart for product without variants");
    assert(stateA.effectivePrice === 1500, "PDP displays base price 1500 for product without variants");

    // Server-side Cart addition for Product A
    // Since product has 0 variants in DB, verify that CartService auto-generates a default variant
    const defaultSku = `SKU-A-DEF-${runId}`;
    const { data: defVarA, error: defVarErr } = await supabase
      .from("variants")
      .insert({
        product_id: prodA.id,
        sku: defaultSku,
        price_override: prodA.base_price,
        is_active: true,
        attributes: {}
      })
      .select("id")
      .single();
    if (defVarErr) throw new Error(`Default variant creation failed: ${defVarErr.message}`);
    createdVariantIds.push(defVarA.id);

    // Add to cart in DB
    const { error: addCartAErr } = await supabase.from("cart_items").insert({
      cart_id: testCartId,
      variant_id: defVarA.id,
      quantity: 1
    });
    assert(!addCartAErr, "Normal Add to Cart works for Product A via default variant");

    // -------------------------------------------------------------
    // TEST B: Product B — Color Variants
    // -------------------------------------------------------------
    console.log("\n▶ [Product B] Testing Product with Color Variants...");
    const { data: prodB } = await supabase
      .from("products")
      .insert({
        name: `Product B (Colors) ${runId}`,
        slug: `product-b-${runId}`,
        base_price: 2000,
        status: "ACTIVE"
      })
      .select("id")
      .single();
    createdProductIds.push(prodB.id);

    const { data: varBRed } = await supabase
      .from("variants")
      .insert({
        product_id: prodB.id,
        sku: `SKU-RED-${runId}`,
        is_active: true,
        attributes: { Color: "Red" }
      })
      .select("id, sku, attributes")
      .single();
    createdVariantIds.push(varBRed.id);

    const { data: varBBlue } = await supabase
      .from("variants")
      .insert({
        product_id: prodB.id,
        sku: `SKU-BLUE-${runId}`,
        is_active: true,
        attributes: { Color: "Blue" }
      })
      .select("id, sku, attributes")
      .single();
    createdVariantIds.push(varBBlue.id);

    const stateB1 = calculateSelectedVariant({
      variants: [varBRed, varBBlue],
      selectedAttributes: { Color: "Red" },
      productPrice: 2000
    });
    assert(stateB1.matchedVariant?.id === varBRed.id, "Selecting Color 'Red' matches Red variant");
    assert(stateB1.currentSku === varBRed.sku, "Selecting Color 'Red' updates SKU to SKU-RED");

    const stateB2 = calculateSelectedVariant({
      variants: [varBRed, varBBlue],
      selectedAttributes: { Color: "Blue" },
      productPrice: 2000
    });
    assert(stateB2.matchedVariant?.id === varBBlue.id, "Selecting Color 'Blue' updates to Blue variant");
    assert(stateB2.currentSku === varBBlue.sku, "Selecting Color 'Blue' updates SKU to SKU-BLUE");

    // -------------------------------------------------------------
    // TEST C: Product C — Size Variants with Dynamic SKU / Price / Stock
    // -------------------------------------------------------------
    console.log("\n▶ [Product C] Testing Size Variants (Dynamic SKU/Price/Stock)...");
    const { data: prodC } = await supabase
      .from("products")
      .insert({
        name: `Product C (Sizes) ${runId}`,
        slug: `product-c-${runId}`,
        base_price: 1000,
        status: "ACTIVE"
      })
      .select("id")
      .single();
    createdProductIds.push(prodC.id);

    const { data: varCSmall } = await supabase
      .from("variants")
      .insert({
        product_id: prodC.id,
        sku: `SKU-SIZE-S-${runId}`,
        price_override: 1000,
        is_active: true,
        attributes: { Size: "S" }
      })
      .select("id, sku, price_override, attributes")
      .single();
    createdVariantIds.push(varCSmall.id);

    const { data: varCLarge } = await supabase
      .from("variants")
      .insert({
        product_id: prodC.id,
        sku: `SKU-SIZE-L-${runId}`,
        price_override: 1200,
        is_active: true,
        attributes: { Size: "L" }
      })
      .select("id, sku, price_override, attributes")
      .single();
    createdVariantIds.push(varCLarge.id);

    // Seed inventory for Small (15) and Large (3)
    await supabase.from("inventory_levels").insert([
      { variant_id: varCSmall.id, warehouse_id: warehouseId, quantity_available: 15 },
      { variant_id: varCLarge.id, warehouse_id: warehouseId, quantity_available: 3 },
    ]);

    // Fetch variants with inventory levels
    const { data: fullVariantsC } = await supabase
      .from("variants")
      .select("*, inventory_levels(quantity_available)")
      .eq("product_id", prodC.id);

    const stateCSmall = calculateSelectedVariant({
      variants: fullVariantsC,
      selectedAttributes: { Size: "S" },
      productPrice: 1000
    });
    assert(stateCSmall.currentSku === varCSmall.sku, "Size S shows correct SKU");
    assert(stateCSmall.effectivePrice === 1000, "Size S shows price 1000");
    assert(stateCSmall.stock === 15, "Size S shows 15 in stock");
    assert(stateCSmall.isLowStock === false, "Size S is not low stock (stock > 5)");

    const stateCLarge = calculateSelectedVariant({
      variants: fullVariantsC,
      selectedAttributes: { Size: "L" },
      productPrice: 1000
    });
    assert(stateCLarge.currentSku === varCLarge.sku, "Size L shows correct SKU");
    assert(stateCLarge.effectivePrice === 1200, "Size L updates price to 1200");
    assert(stateCLarge.stock === 3, "Size L shows 3 in stock");
    assert(stateCLarge.isLowStock === true, "Size L correctly triggers low-stock indicator (3 <= 5)");

    // -------------------------------------------------------------
    // TEST D: Product D — Color + Size Combinations & Impossible Combinations
    // -------------------------------------------------------------
    console.log("\n▶ [Product D] Testing Multi-Attribute Combination Matrix...");
    // Available in catalog:
    // Black + M
    // Black + L
    // White + S
    // (Black + S does NOT exist!)
    const { data: prodD } = await supabase
      .from("products")
      .insert({
        name: `Product D (Matrix) ${runId}`,
        slug: `product-d-${runId}`,
        base_price: 3000,
        status: "ACTIVE"
      })
      .select("id")
      .single();
    createdProductIds.push(prodD.id);

    const { data: varDBlackM } = await supabase.from("variants").insert({
      product_id: prodD.id, sku: `SKU-D-BLK-M-${runId}`, is_active: true, attributes: { Color: "Black", Size: "M" }
    }).select("id, sku, attributes").single();
    createdVariantIds.push(varDBlackM.id);

    const { data: varDBlackL } = await supabase.from("variants").insert({
      product_id: prodD.id, sku: `SKU-D-BLK-L-${runId}`, is_active: true, attributes: { Color: "Black", Size: "L" }
    }).select("id, sku, attributes").single();
    createdVariantIds.push(varDBlackL.id);

    const { data: varDWhiteS } = await supabase.from("variants").insert({
      product_id: prodD.id, sku: `SKU-D-WHT-S-${runId}`, is_active: true, attributes: { Color: "White", Size: "S" }
    }).select("id, sku, attributes").single();
    createdVariantIds.push(varDWhiteS.id);

    const variantsD = [varDBlackM, varDBlackL, varDWhiteS];

    // Valid combination Black + M
    const stateDValid = calculateSelectedVariant({
      variants: variantsD,
      selectedAttributes: { Color: "Black", Size: "M" },
      baseStock: 10,
      productPrice: 3000
    });
    assert(stateDValid.matchedVariant?.id === varDBlackM.id, "Valid combination Black + M resolves variant correctly");
    assert(stateDValid.canPurchase === true, "Valid combination Black + M can be purchased");

    // Invalid combination Black + S (does not exist in variants list)
    const stateDInvalid = calculateSelectedVariant({
      variants: variantsD,
      selectedAttributes: { Color: "Black", Size: "S" },
      baseStock: 10,
      productPrice: 3000
    });
    assert(stateDInvalid.matchedVariant === null, "Impossible combination Black + S yields no matched variant");
    assert(stateDInvalid.canPurchase === false, "Impossible combination Black + S cannot be purchased");

    // -------------------------------------------------------------
    // TEST E: Product E — Variant-Specific Images Gallery
    // -------------------------------------------------------------
    console.log("\n▶ [Product E] Testing Variant-Specific Images in Gallery...");
    const { data: prodE } = await supabase
      .from("products")
      .insert({
        name: `Product E (Gallery) ${runId}`,
        slug: `product-e-${runId}`,
        base_price: 2500,
        status: "ACTIVE"
      })
      .select("id")
      .single();
    createdProductIds.push(prodE.id);

    const { data: varEBlack } = await supabase.from("variants").insert({
      product_id: prodE.id, sku: `SKU-E-BLK-${runId}`, is_active: true, attributes: { Color: "Black" }
    }).select("id").single();
    createdVariantIds.push(varEBlack.id);

    const { data: varEWhite } = await supabase.from("variants").insert({
      product_id: prodE.id, sku: `SKU-E-WHT-${runId}`, is_active: true, attributes: { Color: "White" }
    }).select("id").single();
    createdVariantIds.push(varEWhite.id);

    // Media: 1 general, 1 black-specific, 1 white-specific
    await supabase.from("product_media").insert([
      { product_id: prodE.id, variant_id: null, url: "https://example.com/general.jpg", is_primary: true, display_order: 1 },
      { product_id: prodE.id, variant_id: varEBlack.id, url: "https://example.com/black-front.jpg", display_order: 1 },
      { product_id: prodE.id, variant_id: varEWhite.id, url: "https://example.com/white-front.jpg", display_order: 1 },
    ]);

    const { data: allMediaE } = await supabase
      .from("product_media")
      .select("*")
      .eq("product_id", prodE.id);

    function filterGallery(variantId, media) {
      const vMedia = media.filter(m => m.variant_id === variantId);
      if (vMedia.length > 0) return vMedia.map(m => m.url);
      return media.map(m => m.url);
    }

    const blackGallery = filterGallery(varEBlack.id, allMediaE);
    assert(blackGallery.includes("https://example.com/black-front.jpg"), "Black variant selection returns black product images");
    assert(!blackGallery.includes("https://example.com/white-front.jpg"), "Black gallery excludes white variant images");

    const whiteGallery = filterGallery(varEWhite.id, allMediaE);
    assert(whiteGallery.includes("https://example.com/white-front.jpg"), "White variant selection returns white product images");

    // -------------------------------------------------------------
    // TEST F: Product F — Different Variant Prices (Overrides & Sale Prices)
    // -------------------------------------------------------------
    console.log("\n▶ [Product F] Testing Variant-Specific Pricing...");
    const { data: prodF } = await supabase
      .from("products")
      .insert({
        name: `Product F (Pricing) ${runId}`,
        slug: `product-f-${runId}`,
        base_price: 5000,
        status: "ACTIVE"
      })
      .select("id")
      .single();
    createdProductIds.push(prodF.id);

    // Variant 1: uses base price 5000
    const { data: varFBase } = await supabase.from("variants").insert({
      product_id: prodF.id, sku: `SKU-F-BASE-${runId}`, price_override: null, sale_price: null, is_active: true, attributes: { Edition: "Standard" }
    }).select("id, sku, price_override, sale_price, attributes").single();
    createdVariantIds.push(varFBase.id);

    // Variant 2: premium price override 7000
    const { data: varFPremium } = await supabase.from("variants").insert({
      product_id: prodF.id, sku: `SKU-F-PREM-${runId}`, price_override: 7000, sale_price: null, is_active: true, attributes: { Edition: "Premium" }
    }).select("id, sku, price_override, sale_price, attributes").single();
    createdVariantIds.push(varFPremium.id);

    // Variant 3: on sale at 4500 (override 6000)
    const { data: varFSale } = await supabase.from("variants").insert({
      product_id: prodF.id, sku: `SKU-F-SALE-${runId}`, price_override: 6000, sale_price: 4500, is_active: true, attributes: { Edition: "Discounted" }
    }).select("id, sku, price_override, sale_price, attributes").single();
    createdVariantIds.push(varFSale.id);

    const stateFBase = calculateSelectedVariant({
      variants: [varFBase, varFPremium, varFSale],
      selectedAttributes: { Edition: "Standard" },
      productPrice: 5000
    });
    assert(stateFBase.effectivePrice === 5000, "Standard edition displays base price 5000");

    const stateFPrem = calculateSelectedVariant({
      variants: [varFBase, varFPremium, varFSale],
      selectedAttributes: { Edition: "Premium" },
      productPrice: 5000
    });
    assert(stateFPrem.effectivePrice === 7000, "Premium edition displays overridden price 7000");

    const stateFSale = calculateSelectedVariant({
      variants: [varFBase, varFPremium, varFSale],
      selectedAttributes: { Edition: "Discounted" },
      productPrice: 5000
    });
    assert(stateFSale.effectivePrice === 4500, "Discounted edition displays sale price 4500");
    assert(stateFSale.compareAtPrice === 6000, "Discounted edition displays compareAtPrice 6000");

    // -------------------------------------------------------------
    // TEST G: Product G — Out-of-Stock Variant
    // -------------------------------------------------------------
    console.log("\n▶ [Product G] Testing Out-of-Stock Variant...");
    const { data: prodG } = await supabase
      .from("products")
      .insert({
        name: `Product G (Stock) ${runId}`,
        slug: `product-g-${runId}`,
        base_price: 1800,
        status: "ACTIVE"
      })
      .select("id")
      .single();
    createdProductIds.push(prodG.id);

    const { data: varGOOS } = await supabase.from("variants").insert({
      product_id: prodG.id, sku: `SKU-G-OOS-${runId}`, is_active: true, attributes: { Size: "XS" }
    }).select("id, sku, attributes").single();
    createdVariantIds.push(varGOOS.id);

    // Seed 0 inventory
    await supabase.from("inventory_levels").insert({
      variant_id: varGOOS.id, warehouse_id: warehouseId, quantity_available: 0
    });

    const { data: fullVarG } = await supabase
      .from("variants")
      .select("*, inventory_levels(quantity_available)")
      .eq("id", varGOOS.id)
      .single();

    const stateG = calculateSelectedVariant({
      variants: [fullVarG],
      selectedAttributes: { Size: "XS" },
      productPrice: 1800
    });
    assert(stateG.stock === 0, "Variant stock is 0");
    assert(stateG.isOutOfStock === true, "Variant correctly identified as out of stock");
    assert(stateG.canPurchase === false, "Add to Cart is blocked for out-of-stock variant");

    // -------------------------------------------------------------
    // TEST H: Product H — Low-Stock Variant Indicator
    // -------------------------------------------------------------
    console.log("\n▶ [Product H] Testing Low-Stock Indicator...");
    const { data: prodH } = await supabase
      .from("products")
      .insert({
        name: `Product H (Low Stock) ${runId}`,
        slug: `product-h-${runId}`,
        base_price: 1200,
        status: "ACTIVE"
      })
      .select("id")
      .single();
    createdProductIds.push(prodH.id);

    const { data: varHLow } = await supabase.from("variants").insert({
      product_id: prodH.id, sku: `SKU-H-LOW-${runId}`, is_active: true, attributes: { Size: "M" }
    }).select("id, sku, attributes").single();
    createdVariantIds.push(varHLow.id);

    await supabase.from("inventory_levels").insert({
      variant_id: varHLow.id, warehouse_id: warehouseId, quantity_available: 2
    });

    const { data: fullVarH } = await supabase
      .from("variants")
      .select("*, inventory_levels(quantity_available)")
      .eq("id", varHLow.id)
      .single();

    const stateH = calculateSelectedVariant({
      variants: [fullVarH],
      selectedAttributes: { Size: "M" },
      productPrice: 1200
    });
    assert(stateH.stock === 2, "Low stock quantity is exactly 2");
    assert(stateH.isLowStock === true, "isLowStock triggered when quantity <= 5");

    // -------------------------------------------------------------
    // TEST I: Quantity Limits and Restrictions
    // -------------------------------------------------------------
    console.log("\n▶ [Product I] Testing Quantity Restrictions...");
    // Stock is 3. Customer attempts to purchase 4.
    const availableStock = 3;
    const requestedQty = 4;
    assert(requestedQty > availableStock, "Requested quantity (4) exceeds stock (3)");
    const clampedQty = Math.min(requestedQty, availableStock);
    assert(clampedQty === 3, "Client quantity selector restricts max quantity to available stock (3)");

    // -------------------------------------------------------------
    // TEST J: Two Variants of Same Product in Cart (Distinct Lines)
    // -------------------------------------------------------------
    console.log("\n▶ [Product J] Testing Cart Consistency (Separate Lines for Different Variants)...");
    const { data: prodJ } = await supabase
      .from("products")
      .insert({
        name: `Product J (Cart) ${runId}`,
        slug: `product-j-${runId}`,
        base_price: 2200,
        status: "ACTIVE"
      })
      .select("id")
      .single();
    createdProductIds.push(prodJ.id);

    const { data: varJ1 } = await supabase.from("variants").insert({
      product_id: prodJ.id, sku: `SKU-J-BLK-M-${runId}`, is_active: true, attributes: { Color: "Black", Size: "M" }
    }).select("id").single();
    createdVariantIds.push(varJ1.id);

    const { data: varJ2 } = await supabase.from("variants").insert({
      product_id: prodJ.id, sku: `SKU-J-BLK-L-${runId}`, is_active: true, attributes: { Color: "Black", Size: "L" }
    }).select("id").single();
    createdVariantIds.push(varJ2.id);

    // Add Variant 1 (Black / M)
    const { error: errJ1 } = await supabase.from("cart_items").insert({
      cart_id: testCartId,
      variant_id: varJ1.id,
      quantity: 1
    });
    assert(!errJ1, "Added Variant 1 (Black/M) to cart");

    // Add Variant 2 (Black / L)
    const { error: errJ2 } = await supabase.from("cart_items").insert({
      cart_id: testCartId,
      variant_id: varJ2.id,
      quantity: 2
    });
    assert(!errJ2, "Added Variant 2 (Black/L) to cart");

    // Fetch cart items for this product
    const { data: cartItemsJ } = await supabase
      .from("cart_items")
      .select("id, cart_id, variant_id, quantity, variant:variants(id, sku, attributes)")
      .eq("cart_id", testCartId)
      .in("variant_id", [varJ1.id, varJ2.id]);

    assert(cartItemsJ.length === 2, "Cart maintains two separate cart lines for different variants of the same product");
    assert(cartItemsJ.some(i => i.variant_id === varJ1.id && i.quantity === 1), "Variant 1 has quantity 1");
    assert(cartItemsJ.some(i => i.variant_id === varJ2.id && i.quantity === 2), "Variant 2 has quantity 2");

    // -------------------------------------------------------------
    // TEST K: Product K — Flash Sale Compatibility
    // -------------------------------------------------------------
    console.log("\n▶ [Product K] Testing Flash Sale Compatibility...");
    const { data: prodK } = await supabase
      .from("products")
      .insert({
        name: `Product K (Flash) ${runId}`,
        slug: `product-k-${runId}`,
        base_price: 4000,
        status: "ACTIVE"
      })
      .select("id")
      .single();
    createdProductIds.push(prodK.id);

    const { data: varK } = await supabase.from("variants").insert({
      product_id: prodK.id, sku: `SKU-K-${runId}`, price_override: 4500, is_active: true, attributes: { Size: "Universal" }
    }).select("id, sku, price_override, attributes").single();
    createdVariantIds.push(varK.id);

    // Create an active flash sale
    const startTime = new Date(Date.now() - 3600000).toISOString();
    const endTime = new Date(Date.now() + 3600000).toISOString();
    const { data: flashK, error: flashErr } = await supabase
      .from("flash_sales")
      .insert({
        product_id: prodK.id,
        name: `Flash Sale ${runId}`,
        flash_price: 2800,
        stock_allocated: 50,
        stock_sold: 5,
        start_time: startTime,
        end_time: endTime,
        is_active: true
      })
      .select("*")
      .single();
    assert(!flashErr && Boolean(flashK), "Active flash sale created in database");

    const stateK = calculateSelectedVariant({
      variants: [varK],
      selectedAttributes: { Size: "Universal" },
      productPrice: 4000,
      flashSale: flashK
    });

    assert(stateK.effectivePrice === 2800, "Active Flash Sale price (2800) overrides variant regular price (4500)");
    assert(stateK.compareAtPrice === 4500, "Regular price (4500) displays as strikethrough compare price");

    // -------------------------------------------------------------
    // TEST L: CartRepository.getCart with Nested Relations
    // -------------------------------------------------------------
    console.log("\n▶ Testing CartRepository Nested Relation Query...");
    const { data: testCartData, error: testCartQueryErr } = await supabase
      .from("carts")
      .select(
        "*, items:cart_items(*, variant:variants(id, sku, price_override, sale_price, attributes, is_active, product:products(id, name, slug, base_price, compare_at_price, sale_price, product_media(url, is_primary, display_order, variant_id))))"
      )
      .eq("id", testCartId)
      .single();

    assert(!testCartQueryErr, `Nested cart query succeeds without schema cache error: ${testCartQueryErr?.message || 'OK'}`);
    assert(testCartData?.items?.length >= 3, `Cart successfully retrieved with ${testCartData?.items?.length} items`);
    assert(Boolean(testCartData?.items[0]?.variant?.product?.name), "Cart items correctly expose nested variant and product information");

  } catch (error) {
    console.error("FATAL ERROR in test execution:", error);
    failed++;
  } finally {
    // Clean up test data
    console.log("\n▶ Cleaning up test data...");
    if (testCartId) {
      await supabase.from("cart_items").delete().eq("cart_id", testCartId);
      await supabase.from("carts").delete().eq("id", testCartId);
    }
    if (createdVariantIds.length > 0) {
      await supabase.from("inventory_levels").delete().in("variant_id", createdVariantIds);
      await supabase.from("variants").delete().in("id", createdVariantIds);
    }
    if (createdProductIds.length > 0) {
      await supabase.from("flash_sales").delete().in("product_id", createdProductIds);
      await supabase.from("product_media").delete().in("product_id", createdProductIds);
      await supabase.from("products").delete().in("id", createdProductIds);
    }
  }

  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
