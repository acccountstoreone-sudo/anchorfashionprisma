const { Client } = require('pg');
const dns = require('dns');
require('dotenv').config();

// Prefer IPv4 for stable DNS resolution
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function seed() {
  let client;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`Connecting to DB (Attempt ${attempts}/${maxAttempts})...`);
      client = new Client({
        connectionString: DATABASE_URL,
        connectionTimeoutMillis: 30000
      });
      await client.connect();
      console.log("Connected successfully to PostgreSQL!\n");
      break;
    } catch (e) {
      console.warn(`Connection attempt ${attempts} failed: ${e.message}`);
      if (attempts >= maxAttempts) throw e;
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  try {
    // 1. SEED BANNERS
    console.log("--- Seeding Banners ---");
    // Remove default or dummy banners to populate high quality demo banners
    await client.query("DELETE FROM banners WHERE title LIKE '%Test%' OR title LIKE '%Dummy%'");

    const banners = [
      {
        title: "Signature Festive Panjabi 2026",
        subtitle: "Elegance in Every Thread",
        description: "Handcrafted with premium jacquard, intricate embroidery, and Egyptian cotton fabrics.",
        cta_text: "Explore Collection",
        link_url: "/categories/panjabi",
        image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1600&q=85",
        alt_text: "Festive Panjabi Collection",
        placement: "HERO",
        display_order: 1,
        type: "hero",
        status: "active",
        is_active: true
      },
      {
        title: "The Luxury Formal Edit",
        subtitle: "Bespoke Cut Shirts & Tailored Trousers",
        description: "Command attention in the boardroom and evening galas with impeccable tailoring.",
        cta_text: "Shop Formals",
        link_url: "/categories/formal-shirt",
        image_url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1600&q=85",
        alt_text: "Formal Shirts and Suits",
        placement: "HERO",
        display_order: 2,
        type: "hero",
        status: "active",
        is_active: true
      },
      {
        title: "Contemporary Casuals & Polos",
        subtitle: "Drop Shoulder Polos & Oversized T-Shirts",
        description: "Urban aesthetics built for modern comfort and effortless everyday styling.",
        cta_text: "Discover Casuals",
        link_url: "/categories/polo",
        image_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1600&q=85",
        alt_text: "Casuals and Polo Shirts",
        placement: "HERO",
        display_order: 3,
        type: "hero",
        status: "active",
        is_active: true
      },
      {
        title: "Mid-Season Exclusive: Flat 20% OFF",
        subtitle: "Use code: ANCHOR20",
        description: "Applies across all premium menswear collections for a limited time.",
        cta_text: "Claim Discount",
        link_url: "/shop",
        image_url: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=1200&q=80",
        alt_text: "Mid-season offer banner",
        placement: "PROMO",
        display_order: 1,
        type: "promo",
        status: "active",
        is_active: true
      },
      {
        title: "Festive Gifting & Accessories",
        subtitle: "Italian Leather Wallets, Belts & Handcrafted Loafers",
        description: "The perfect curation for celebrating and gifting in refined luxury.",
        cta_text: "View Accessories",
        link_url: "/categories/accessories",
        image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1200&q=80",
        alt_text: "Leather accessories and belts",
        placement: "FEATURED",
        display_order: 2,
        type: "featured",
        status: "active",
        is_active: true
      }
    ];

    for (const b of banners) {
      await client.query(`
        INSERT INTO banners (title, subtitle, description, cta_text, link_url, image_url, alt_text, placement, display_order, type, status, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        ON CONFLICT DO NOTHING;
      `, [b.title, b.subtitle, b.description, b.cta_text, b.link_url, b.image_url, b.alt_text, b.placement, b.display_order, b.type, b.status, b.is_active]);
    }
    console.log(`✓ Seeded ${banners.length} promotional banners.`);

    // 2. SEED COUPONS
    console.log("\n--- Seeding Coupons ---");
    const coupons = [
      {
        code: "ANCHOR10",
        description: "10% off on all regular orders across the store",
        discount_type: "PERCENTAGE",
        discount_value: 10.00,
        min_order_amount: 1500.00,
        max_discount: 500.00,
        usage_limit: 500,
        is_active: true
      },
      {
        code: "FESTIVE25",
        description: "Special 25% discount on Festive Panjabi & Ethnic Wear",
        discount_type: "PERCENTAGE",
        discount_value: 25.00,
        min_order_amount: 3000.00,
        max_discount: 1500.00,
        usage_limit: 200,
        is_active: true
      },
      {
        code: "FIRSTBUY",
        description: "Flat ৳300 discount on your very first order",
        discount_type: "FIXED",
        discount_value: 300.00,
        min_order_amount: 2000.00,
        max_discount: 300.00,
        usage_limit: 1000,
        is_active: true
      },
      {
        code: "FREESHIP",
        description: "Free delivery nationwide on orders above ৳1,500",
        discount_type: "FIXED",
        discount_value: 120.00,
        min_order_amount: 1500.00,
        max_discount: 120.00,
        usage_limit: 2000,
        is_active: true
      },
      {
        code: "VIPCLUB",
        description: "Exclusive VIP Member flat ৳500 discount",
        discount_type: "FIXED",
        discount_value: 500.00,
        min_order_amount: 4000.00,
        max_discount: 500.00,
        usage_limit: 150,
        is_active: true
      },
      {
        code: "SHIRTVIBES",
        description: "15% off when buying 2 or more formal/casual shirts",
        discount_type: "PERCENTAGE",
        discount_value: 15.00,
        min_order_amount: 2200.00,
        max_discount: 800.00,
        usage_limit: 300,
        is_active: true
      }
    ];

    for (const c of coupons) {
      await client.query(`
        INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE 
        SET description = EXCLUDED.description,
            discount_type = EXCLUDED.discount_type,
            discount_value = EXCLUDED.discount_value,
            min_order_amount = EXCLUDED.min_order_amount,
            max_discount = EXCLUDED.max_discount,
            is_active = EXCLUDED.is_active;
      `, [c.code, c.description, c.discount_type, c.discount_value, c.min_order_amount, c.max_discount, c.usage_limit, c.is_active]);
    }
    console.log(`✓ Seeded ${coupons.length} promotional coupons.`);

    // 3. SEED PROMOTIONS
    console.log("\n--- Seeding Promotions ---");
    const promotionsList = [
      {
        title: "Mega Eid & Festive Bonanza",
        description: "Celebrate the season of joy with 20% off on all premium ethnic ensembles.",
        code: "EID2026",
        type: "PERCENTAGE",
        value: 20.00,
        is_active: true
      },
      {
        title: "Buy 2 Get 15% OFF on Luxury Shirts",
        description: "Upgrade your work wardrobe with 100% Giza cotton tailored shirts.",
        code: "SHIRT15",
        type: "PERCENTAGE",
        value: 15.00,
        is_active: true
      },
      {
        title: "Free Nationwide Express Shipping",
        description: "Zero delivery fees on all prepaid and bKash checkout orders over ৳2,000.",
        code: "FREEDELIVERY",
        type: "FIXED",
        value: 120.00,
        is_active: true
      },
      {
        title: "End of Season Clearance - Up to 40% OFF",
        description: "Special seasonal discounts on selected polo shirts, chinos and outerwear.",
        code: "CLEARANCE40",
        type: "PERCENTAGE",
        value: 40.00,
        is_active: true
      }
    ];

    for (const p of promotionsList) {
      await client.query(`
        INSERT INTO promotions (title, description, code, type, value, is_active, start_date, end_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW());
      `, [p.title, p.description, p.code, p.type, p.value, p.is_active]);
    }
    console.log(`✓ Seeded ${promotionsList.length} marketing promotions.`);

    // 4. SEED FLASH SALES
    console.log("\n--- Seeding Flash Sales ---");
    const flashSalesList = [
      {
        title: "Midnight Panjabi Flash Rush - 30% OFF",
        discount_percentage: 30,
        is_active: true
      },
      {
        title: "Weekend Polo Fest - 25% OFF",
        discount_percentage: 25,
        is_active: true
      },
      {
        title: "Flash Hour: Premium Denim & Chinos - 20% OFF",
        discount_percentage: 20,
        is_active: true
      }
    ];

    for (const fs of flashSalesList) {
      await client.query(`
        INSERT INTO flash_sales (title, discount_percentage, is_active, start_time, end_time, created_at)
        VALUES ($1, $2, $3, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '5 days', NOW());
      `, [fs.title, fs.discount_percentage, fs.is_active]);
    }
    console.log(`✓ Seeded ${flashSalesList.length} active flash sales.`);

    // 5. SEED ANNOUNCEMENTS
    console.log("\n--- Seeding Announcements ---");
    const announcementsList = [
      {
        title: "⚡ Flash Sale Live: Enjoy up to 30% OFF on all Festive Panjabis this week!",
        message: "Limited stock available. Hurry before sizes run out!",
        link: "/categories/panjabi",
        is_active: true
      },
      {
        title: "🚚 Free Nationwide Delivery on all orders over ৳2,000 across Bangladesh!",
        message: "No delivery charges applied at checkout for orders above ৳2,000.",
        link: "/shop",
        is_active: true
      },
      {
        title: "🎁 Welcome Bonus: Use code 'FIRSTBUY' for ৳300 OFF on your first purchase!",
        message: "Sign up and use coupon FIRSTBUY at checkout.",
        link: "/shop",
        is_active: true
      },
      {
        title: "✨ Anchor Fashion Flagship Stores: Visit us at Banani & Dhanmondi for custom fitting.",
        message: "Experience bespoke tailoring and private shopping lounges.",
        link: "/about",
        is_active: true
      }
    ];

    for (const a of announcementsList) {
      await client.query(`
        INSERT INTO announcements (title, message, link, is_active, created_at)
        VALUES ($1, $2, $3, $4, NOW());
      `, [a.title, a.message, a.link, a.is_active]);
    }
    console.log(`✓ Seeded ${announcementsList.length} top-bar announcements.`);

    // 6. SEED MARKETING CAMPAIGNS
    console.log("\n--- Seeding Marketing Campaigns ---");
    const campaignsList = [
      {
        name: "Festive Collection 2026 Email Blast",
        type: "email",
        subject: "✨ Introducing Anchor Fashion Festive '26: Handcrafted Royalty",
        content: "Welcome the festive season in style! Explore our new collection of royal panjabis, crafted with pure silk, jacquard motifs, and hand embroidery.",
        target_segment: "all",
        status: "sent"
      },
      {
        name: "VIP Exclusive SMS Flash Discount",
        type: "sms",
        subject: "VIP Flash Alert",
        content: "Dear VIP customer, enjoy a private 25% discount this weekend with code VIPCLUB. Shop online: anchorfashion.com",
        target_segment: "vip",
        status: "active"
      },
      {
        name: "Cart Abandonment Recovery Campaign",
        type: "email",
        subject: "Your selected items are waiting at Anchor Fashion",
        content: "Did you forget something? We've saved your items in cart. Complete your order today and use code ANCHOR10 for an additional 10% off!",
        target_segment: "abandoned_cart",
        status: "active"
      },
      {
        name: "Weekend Wardrobe Essentials Newsletter",
        type: "email",
        subject: "Redefine your everyday style with Anchor Polos & Chinos",
        content: "Discover breathable Pima cotton polos and tailored stretch chinos designed for effortless elegance all day.",
        target_segment: "subscribers",
        status: "scheduled"
      }
    ];

    for (const camp of campaignsList) {
      await client.query(`
        INSERT INTO marketing_campaigns (name, type, subject, content, target_segment, status, schedule_time, sent_at, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '2 days', NOW(), '{}'::jsonb, NOW(), NOW());
      `, [camp.name, camp.type, camp.subject, camp.content, camp.target_segment, camp.status]);
    }
    console.log(`✓ Seeded ${campaignsList.length} marketing campaigns.`);

    console.log("\n=======================================================");
    console.log("SUCCESS: All promotion and marketing demo data seeded!");
    console.log("=======================================================");

  } catch (err) {
    console.error("Error seeding marketing data:", err);
  } finally {
    if (client) await client.end();
  }
}

seed();
