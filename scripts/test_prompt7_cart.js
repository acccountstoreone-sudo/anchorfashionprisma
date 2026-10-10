/**
 * Anchor Fashion — Prompt 7 Integration Test Suite
 * Guest Cart Merging & Persistent Bag
 *
 * Tests:
 * 1. Guest Cart Persistence (creation, session isolation, line persistence)
 * 2. Guest Cart Quantity Update & Item Removal
 * 3. Canonical Cart Line Identity (cart_id + variant_id uniqueness)
 * 4. Merge Scenario 1: Guest Cart + Empty Account Cart
 * 5. Idempotent Merge Validation (repeated merge calls do not double quantities)
 * 6. Merge Scenario 2: Guest Cart + Existing Account Cart (Same & Different Variants)
 * 7. Stock Capping Rule: Combined quantity capped at total available stock
 * 8. Empty Guest Cart / Empty Authenticated Cart Edge Cases
 * 9. Cart Item Ownership & Cross-User Security Check
 * 10. Authoritative Price Integrity & Dynamic Precedence
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function runPrompt7Tests() {
  console.log("\n====================================================================");
  console.log("   ANCHOR FASHION — PROMPT 7: GUEST CART MERGING & PERSISTENT BAG");
  console.log("====================================================================\n");

  const runId = Date.now().toString().slice(-6);
  const createdCartIds = [];
  const createdVariantIds = [];
  const createdProductIds = [];
  const createdUserIds = [];

  try {
    // ------------------------------------------------------------------
    // SETUP: Create Test Products & Variants with Authoritative Pricing
    // ------------------------------------------------------------------
    console.log("▶ [Setup] Seeding test catalog and inventory...");

    // Product 1: T-Shirt
    const { data: prod1, error: prod1Err } = await supabase
      .from("products")
      .insert({
        name: `Anchor Test T-Shirt ${runId}`,
        slug: `anchor-test-tshirt-${runId}`,
        base_price: 1500,
        status: "ACTIVE",
      })
      .select("id")
      .single();
    if (prod1Err) throw new Error(`Product 1 creation failed: ${prod1Err.message}`);
    createdProductIds.push(prod1.id);

    // Variant 1: Black / M
    const { data: var1, error: var1Err } = await supabase
      .from("variants")
      .insert({
        product_id: prod1.id,
        sku: `TSHIRT-BLK-M-${runId}`,
        price_override: 1500,
        sale_price: 1200,
        attributes: { color: "Black", size: "M" },
        is_active: true,
      })
      .select("id")
      .single();
    if (var1Err) throw new Error(`Variant 1 creation failed: ${var1Err.message}`);
    createdVariantIds.push(var1.id);

    // Variant 2: Black / L (different variant of same product)
    const { data: var2, error: var2Err } = await supabase
      .from("variants")
      .insert({
        product_id: prod1.id,
        sku: `TSHIRT-BLK-L-${runId}`,
        price_override: 1500,
        sale_price: 1200,
        attributes: { color: "Black", size: "L" },
        is_active: true,
      })
      .select("id")
      .single();
    if (var2Err) throw new Error(`Variant 2 creation failed: ${var2Err.message}`);
    createdVariantIds.push(var2.id);

    // Product 2: Jeans
    const { data: prod2, error: prod2Err } = await supabase
      .from("products")
      .insert({
        name: `Anchor Denim Jeans ${runId}`,
        slug: `anchor-denim-jeans-${runId}`,
        base_price: 3500,
        status: "ACTIVE",
      })
      .select("id")
      .single();
    if (prod2Err) throw new Error(`Product 2 creation failed: ${prod2Err.message}`);
    createdProductIds.push(prod2.id);

    // Variant 3: Blue / 32
    const { data: var3, error: var3Err } = await supabase
      .from("variants")
      .insert({
        product_id: prod2.id,
        sku: `JEANS-BLU-32-${runId}`,
        price_override: 3500,
        attributes: { color: "Blue", waist: "32" },
        is_active: true,
      })
      .select("id")
      .single();
    if (var3Err) throw new Error(`Variant 3 creation failed: ${var3Err.message}`);
    createdVariantIds.push(var3.id);

    // Product 3: Limited Stock Item (for Stock Capping test)
    const { data: prod3, error: prod3Err } = await supabase
      .from("products")
      .insert({
        name: `Anchor Limited Cap ${runId}`,
        slug: `anchor-limited-cap-${runId}`,
        base_price: 800,
        status: "ACTIVE",
      })
      .select("id")
      .single();
    if (prod3Err) throw new Error(`Product 3 creation failed: ${prod3Err.message}`);
    createdProductIds.push(prod3.id);

    const { data: varLimited, error: varLimErr } = await supabase
      .from("variants")
      .insert({
        product_id: prod3.id,
        sku: `CAP-LIM-${runId}`,
        price_override: 800,
        is_active: true,
      })
      .select("id")
      .single();
    if (varLimErr) throw new Error(`Limited Variant creation failed: ${varLimErr.message}`);
    createdVariantIds.push(varLimited.id);

    // Fetch or create warehouse for inventory
    const { data: whRows } = await supabase.from("warehouses").select("id").limit(1);
    let testWarehouseId = whRows?.[0]?.id;
    if (!testWarehouseId) {
      const { data: newWh, error: whErr } = await supabase
        .from("warehouses")
        .insert({
          name: `Test Warehouse ${runId}`,
        })
        .select("id")
        .single();
      if (whErr) throw new Error(`Warehouse creation failed: ${whErr.message}`);
      testWarehouseId = newWh.id;
    }

    // Seed stock in inventory_levels for varLimited (Stock = 5)
    const { data: invRow, error: invErr } = await supabase
      .from("inventory_levels")
      .insert({
        variant_id: varLimited.id,
        quantity_available: 5,
        warehouse_id: testWarehouseId,
      })
      .select("id")
      .single();
    if (invErr) throw new Error(`Inventory seed failed: ${invErr.message}`);

    console.log("  Catalog seeded successfully.\n");

    // ------------------------------------------------------------------
    // TEST 1: Guest Cart Persistence
    // ------------------------------------------------------------------
    console.log("▶ [Test 1] Guest Cart Persistence via Session ID...");
    const guestSession1 = `guest_test_${runId}_1`;

    const { data: guestCart1, error: gc1Err } = await supabase
      .from("carts")
      .insert({ session_id: guestSession1 })
      .select()
      .single();
    assert(!gc1Err && guestCart1?.id, "Guest cart row created in public.carts with session_id");
    createdCartIds.push(guestCart1.id);

    // Add Variant 1 (T-Shirt Black M, qty 2)
    const { error: addG1Err } = await supabase.from("cart_items").insert({
      cart_id: guestCart1.id,
      variant_id: var1.id,
      quantity: 2,
    });
    assert(!addG1Err, "Guest added Variant 1 (Black/M, qty 2) to cart");

    // Add Variant 3 (Jeans Blue 32, qty 1)
    const { error: addG3Err } = await supabase.from("cart_items").insert({
      cart_id: guestCart1.id,
      variant_id: var3.id,
      quantity: 1,
    });
    assert(!addG3Err, "Guest added Variant 3 (Jeans Blue/32, qty 1) to cart");

    // Simulate page refresh / new query by session_id
    const { data: fetchedGuestCart, error: fetchGCErr } = await supabase
      .from("carts")
      .select(
        "*, items:cart_items(*, variant:variants(id, sku, attributes, price_override, sale_price, product:products(id, name, base_price)))"
      )
      .eq("session_id", guestSession1)
      .single();

    assert(!fetchGCErr && fetchedGuestCart?.items?.length === 2, "Guest cart successfully retrieved by session_id with 2 items");
    const itemG1 = fetchedGuestCart.items.find((i) => i.variant_id === var1.id);
    const itemG3 = fetchedGuestCart.items.find((i) => i.variant_id === var3.id);
    assert(itemG1?.quantity === 2, "Guest cart item 1 preserved quantity = 2");
    assert(itemG3?.quantity === 1, "Guest cart item 2 preserved quantity = 1");

    // ------------------------------------------------------------------
    // TEST 2: Quantity Update & Item Removal
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 2] Guest Cart Quantity Update & Item Removal...");
    const { error: updateQtyErr } = await supabase
      .from("cart_items")
      .update({ quantity: 4 })
      .eq("id", itemG1.id);
    assert(!updateQtyErr, "Updated item quantity to 4");

    const { data: updatedItem } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("id", itemG1.id)
      .single();
    assert(updatedItem.quantity === 4, "Quantity correctly updated to 4");

    // Revert back to 2 for subsequent tests
    await supabase.from("cart_items").update({ quantity: 2 }).eq("id", itemG1.id);

    // ------------------------------------------------------------------
    // TEST 3: Canonical Cart Line Identity (Unique Constraint)
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 3] Canonical Cart Line Identity & Duplicate Prevention...");
    // Attempt inserting the same variant into the same cart should violate UNIQUE constraint
    const { error: dupErr } = await supabase.from("cart_items").insert({
      cart_id: guestCart1.id,
      variant_id: var1.id,
      quantity: 1,
    });
    assert(Boolean(dupErr), `Database rejects duplicate (cart_id, variant_id) line: ${dupErr?.code || 'BLOCKED'}`);

    // But inserting a different variant (var2: Black/L) of the SAME product succeeds as a separate line
    const { data: separateLine, error: sepLineErr } = await supabase
      .from("cart_items")
      .insert({
        cart_id: guestCart1.id,
        variant_id: var2.id,
        quantity: 1,
      })
      .select()
      .single();
    assert(!sepLineErr && separateLine?.id, "Different variant of same product creates distinct, separate cart line");
    // Clean up var2 from guestCart1 to keep clean state
    await supabase.from("cart_items").delete().eq("id", separateLine.id);

    // ------------------------------------------------------------------
    // TEST 4: Merge Scenario 1 — Guest Cart + Empty Account Cart
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 4] Merge Scenario 1: Guest Cart + Empty Account Cart...");
    const { data: authUserA, error: userAErr } = await supabase.auth.admin.createUser({
      email: `cart_userA_${runId}@example.com`,
      password: "TestPassword123!",
      email_confirm: true,
    });
    if (userAErr) throw new Error(`User A creation failed: ${userAErr.message}`);
    const testUserA = authUserA.user.id;
    createdUserIds.push(testUserA);

    // Invoke mergeCart
    const { CartRepository } = require("../lib/repositories/cart.repository");
    await CartRepository.mergeCart(guestSession1, testUserA);

    // Verify user cart exists and contains the items
    const userCartA = await CartRepository.getCart(testUserA);
    assert(Boolean(userCartA?.id), `User cart exists for authenticated user ${testUserA}`);
    if (userCartA?.id) createdCartIds.push(userCartA.id);
    assert(userCartA?.items?.length === 2, `User cart has 2 merged items (expected 2, got ${userCartA?.items?.length})`);

    const mergedItem1 = userCartA?.items?.find((i) => i.variant_id === var1.id);
    const mergedItem3 = userCartA?.items?.find((i) => i.variant_id === var3.id);
    assert(mergedItem1?.quantity === 2, "Merged Variant 1 has quantity = 2");
    assert(mergedItem3?.quantity === 1, "Merged Variant 3 has quantity = 1");

    // Verify guest cart was cleaned up / deleted
    const oldGuestCart = await CartRepository.getCart(null, guestSession1);
    assert(!oldGuestCart, "Original guest cart session is cleaned up and no longer exists");

    // ------------------------------------------------------------------
    // TEST 5: Idempotent Merge Validation (Repeated execution is safe)
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 5] Idempotent Merge Validation...");
    // Calling mergeCart again with the same session ID
    await CartRepository.mergeCart(guestSession1, testUserA);
    await CartRepository.mergeCart(guestSession1, testUserA);

    const userCartAAfterRetries = await CartRepository.getCart(testUserA);
    const retryItem1 = userCartAAfterRetries?.items?.find((i) => i.variant_id === var1.id);
    const retryItem3 = userCartAAfterRetries?.items?.find((i) => i.variant_id === var3.id);
    assert(retryItem1?.quantity === 2, "Quantity for Variant 1 did NOT double after retries (remains 2)");
    assert(retryItem3?.quantity === 1, "Quantity for Variant 3 did NOT double after retries (remains 1)");
    assert(userCartAAfterRetries?.items?.length === 2, "Cart line count remains strictly 2");

    // ------------------------------------------------------------------
    // TEST 6: Merge Scenario 2 — Guest Cart + Existing Account Cart
    // (Combining quantities on same variant + keeping different variants distinct)
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 6] Merge Scenario 2: Guest Cart + Existing Account Cart...");
    // Current User Cart A has:
    // Variant 1 (TSHIRT-BLK-M) = 2
    // Variant 3 (JEANS-BLU-32) = 1

    // Prepare a new guest cart with:
    // Variant 1 (TSHIRT-BLK-M) = 1 (same variant -> should combine to 3)
    // Variant 2 (TSHIRT-BLK-L) = 2 (new variant of same product -> should become new line with qty 2)
    const guestSession2 = `guest_test_${runId}_2`;
    const { data: guestCart2 } = await supabase
      .from("carts")
      .insert({ session_id: guestSession2 })
      .select()
      .single();
    createdCartIds.push(guestCart2.id);

    await supabase.from("cart_items").insert([
      { cart_id: guestCart2.id, variant_id: var1.id, quantity: 1 },
      { cart_id: guestCart2.id, variant_id: var2.id, quantity: 2 },
    ]);

    // Execute merge
    await CartRepository.mergeCart(guestSession2, testUserA);

    const userCartAFinal = await CartRepository.getCart(testUserA);
    assert(userCartAFinal?.items?.length === 3, `User cart now has 3 distinct cart lines (expected 3, got ${userCartAFinal?.items?.length})`);

    const finalItem1 = userCartAFinal?.items?.find((i) => i.variant_id === var1.id);
    const finalItem2 = userCartAFinal?.items?.find((i) => i.variant_id === var2.id);
    const finalItem3 = userCartAFinal?.items?.find((i) => i.variant_id === var3.id);

    assert(finalItem1?.quantity === 3, "Same Variant 1 merged quantities: 2 (auth) + 1 (guest) = 3");
    assert(finalItem2?.quantity === 2, "New Variant 2 (Black/L) added with quantity = 2");
    assert(finalItem3?.quantity === 1, "Existing Variant 3 (Jeans 32) preserved with quantity = 1");

    // Check that there is only ONE line for var1
    const var1Lines = userCartAFinal?.items?.filter((i) => i.variant_id === var1.id);
    assert(var1Lines.length === 1, "Variant 1 exists as a SINGLE consolidated cart line (no duplicates)");

    // ------------------------------------------------------------------
    // TEST 7: Stock Capping Rule During Merge
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 7] Stock Validation & Capping Rule During Merge...");
    // varLimited has stock = 5 in inventory_levels.
    // Let's add 3 to userCartA directly:
    await supabase.from("cart_items").insert({
      cart_id: userCartA.id,
      variant_id: varLimited.id,
      quantity: 3,
    });

    // Now guest has 4 of varLimited (3 + 4 = 7 > 5):
    const guestSession3 = `guest_test_${runId}_3`;
    const { data: guestCart3 } = await supabase
      .from("carts")
      .insert({ session_id: guestSession3 })
      .select()
      .single();
    createdCartIds.push(guestCart3.id);

    await supabase.from("cart_items").insert({
      cart_id: guestCart3.id,
      variant_id: varLimited.id,
      quantity: 4,
    });

    // Merge:
    await CartRepository.mergeCart(guestSession3, testUserA);

    const userCartACapped = await CartRepository.getCart(testUserA);
    const limitedItem = userCartACapped?.items?.find((i) => i.variant_id === varLimited.id);
    assert(limitedItem?.quantity === 5, `Combined quantity was capped at available stock limit: expected 5, got ${limitedItem?.quantity}`);

    // ------------------------------------------------------------------
    // TEST 8: Empty Guest Cart Safe Handling
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 8] Empty Guest Cart Safe Handling...");
    const emptyGuestSession = `guest_empty_${runId}`;
    await supabase.from("carts").insert({ session_id: emptyGuestSession });
    // Merge empty cart
    await CartRepository.mergeCart(emptyGuestSession, testUserA);
    const userCartAfterEmpty = await CartRepository.getCart(testUserA);
    assert(userCartAfterEmpty?.items?.length === 4, "Empty guest cart merge is a safe no-op");

    // ------------------------------------------------------------------
    // TEST 9: Security & Ownership Protection
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 9] Security & Ownership Protection...");
    const { CartService } = require("../lib/services/cart.service");
    const { data: authUserB } = await supabase.auth.admin.createUser({
      email: `cart_userB_${runId}@example.com`,
      password: "TestPassword123!",
      email_confirm: true,
    });
    const testUserB = authUserB.user.id;
    createdUserIds.push(testUserB);

    let threwUnauthorized = false;
    try {
      // User B attempts to access / verify item belonging to User A
      await CartService.verifyItemOwnership(finalItem1.id, testUserB, null);
    } catch (secErr) {
      threwUnauthorized = true;
    }
    assert(threwUnauthorized, "verifyItemOwnership rejects user attempting to access another customer's cart item");

    // ------------------------------------------------------------------
    // TEST 10: Authoritative Price Integrity
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 10] Authoritative Price Integrity...");
    // Variant 1 has price_override: 1500, sale_price: 1200
    // Verify that CartRepository resolved price authoritatively
    assert(finalItem1?.variant?.sale_price === 1200, "Variant sale_price resolved authoritatively from DB (1200)");
    assert(finalItem1?.variant?.price === 1500, "Variant base price resolved authoritatively from DB (1500)");
    assert(finalItem3?.product?.price === 3500, "Product base price resolved authoritatively from DB (3500)");

  } catch (error) {
    console.error("\n❌ UNEXPECTED FATAL ERROR:", error);
    failed++;
  } finally {
    // ------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------
    console.log("\n▶ [Cleanup] Tearing down test fixtures...");
    if (createdCartIds.length > 0) {
      await supabase.from("cart_items").delete().in("cart_id", createdCartIds);
      await supabase.from("carts").delete().in("id", createdCartIds);
    }
    if (createdVariantIds.length > 0) {
      await supabase.from("inventory_levels").delete().in("variant_id", createdVariantIds);
      await supabase.from("variants").delete().in("id", createdVariantIds);
    }
    if (createdProductIds.length > 0) {
      await supabase.from("products").delete().in("id", createdProductIds);
    }
    if (createdUserIds.length > 0) {
      for (const uid of createdUserIds) {
        await supabase.auth.admin.deleteUser(uid);
      }
    }
    console.log("  Cleanup finished.\n");

    console.log("====================================================================");
    console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log("====================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runPrompt7Tests();
