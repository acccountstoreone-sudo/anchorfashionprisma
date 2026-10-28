# Anchor Fashion - Database & Automation Scripts

This directory contains automated database seeding, data migration, and enterprise quality assurance scripts for the Anchor Fashion e-commerce platform.

---

## 🚀 Key Scripts

### 1. Seeding All QA Roles & User Accounts
Seeds all 10 platform roles into PostgreSQL (`roles` and `profiles` tables) and links them with Neon Auth credentials:
```bash
npx tsx scripts/seed_all_qa_roles.ts
```
**Roles provisioned**:
- `SUPERADMIN`: `qa_superadmin@anchorfashion.com`
- `ADMIN`: `qa_admin@anchorfashion.com`
- `MANAGER`: `qa_manager@anchorfashion.com`
- `WAREHOUSE_MANAGER`: `qa_warehouse@anchorfashion.com`
- `MARKETING_MANAGER`: `qa_marketing_mgr@anchorfashion.com`
- `FINANCE_MANAGER`: `qa_finance_mgr@anchorfashion.com`
- `MARKETING`: `qa_marketing@anchorfashion.com`
- `STAFF`: `qa_staff@anchorfashion.com`
- `SUPPORT`: `qa_support@anchorfashion.com`
- `CUSTOMER`: `qa_customer@anchorfashion.com`
- **Default QA Password**: `Password123!`

---

### 2. Comprehensive QA & Security Test Suite
Executes end-to-end multi-role tests covering authentication, route authorization, RBAC boundary enforcement, catalog rendering, financial precision (subtotals, discounts, free shipping thresholds), and all Manager, Admin, and Customer subroutes:
```bash
npx tsx scripts/qa_full_suite.ts
```

---

### 3. Product Catalog Seeding
Populates the store catalog with 65+ rich apparel products, sizing variants, color options, and category taxonomy:
```bash
node scripts/seed_50_plus_products.js
node scripts/seed_marketing_content.js
node scripts/seed_rich_products.js
```

---

### 4. Database Category Synchronization
Synchronizes product entries with the `product_categories` relationship junction table:
```bash
npx tsx scripts/sync_categories.ts
```
