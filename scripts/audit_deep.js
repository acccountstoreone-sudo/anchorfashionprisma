const fs = require('fs');
const path = require('path');

function runAudit() {
  console.log('===============================================================');
  console.log('       ANCHOR FASHION — DEEP SYSTEM & ROUTE AUDIT             ');
  console.log('===============================================================\n');

  // 1. Audit Admin Sidebar Routes
  const sidebarFile = path.resolve('features/admin/components/AdminSidebar.tsx');
  let adminHrefs = [];
  if (fs.existsSync(sidebarFile)) {
    const sidebarContent = fs.readFileSync(sidebarFile, 'utf-8');
    const matches = [...sidebarContent.matchAll(/href:\s*["'](\/admin[^"']*)["']/g)].map(m => m[1]);
    adminHrefs = [...new Set(matches)];
  }

  console.log(`--- [1] ADMIN SIDEBAR ROUTES (Total: ${adminHrefs.length}) ---`);
  const missingAdmin = [];
  const existingAdmin = [];

  for (const href of adminHrefs) {
    const sub = href === '/admin' ? '' : href.replace(/^\/admin\//, '');
    const pagePath = path.resolve('app/(admin)/admin', sub, 'page.tsx');
    if (fs.existsSync(pagePath)) {
      existingAdmin.push(href);
    } else {
      missingAdmin.push({ href, expectedPath: pagePath });
    }
  }

  console.log(`Existing Admin Pages: ${existingAdmin.length}`);
  console.log(`Missing Admin Pages (Falling back to [...slug] Coming Soon): ${missingAdmin.length}`);
  missingAdmin.forEach(m => console.log(`  ❌ ${m.href}`));

  // 2. Audit Customer Account Navigation
  const customerLayout = path.resolve('app/(customer)/account/layout.tsx');
  let customerHrefs = [];
  if (fs.existsSync(customerLayout)) {
    const content = fs.readFileSync(customerLayout, 'utf-8');
    const matches = [...content.matchAll(/href:\s*["'](\/account[^"']*)["']/g)].map(m => m[1]);
    customerHrefs = [...new Set(matches)];
  }

  console.log(`\n--- [2] CUSTOMER ACCOUNT ROUTES (Total: ${customerHrefs.length}) ---`);
  const missingCustomer = [];
  const existingCustomer = [];

  for (const href of customerHrefs) {
    const sub = href === '/account' ? '' : href.replace(/^\/account\//, '');
    const pagePath = path.resolve('app/(customer)/account', sub, 'page.tsx');
    if (fs.existsSync(pagePath)) {
      existingCustomer.push(href);
    } else {
      missingCustomer.push({ href, expectedPath: pagePath });
    }
  }
  console.log(`Existing Customer Pages: ${existingCustomer.length}`);
  console.log(`Missing Customer Pages: ${missingCustomer.length}`);
  missingCustomer.forEach(m => console.log(`  ❌ ${m.href}`));

  // 3. Scan for TODOs, FIXMEs, MOCKS, DUMMY across ts, tsx
  console.log('\n--- [3] SCANNING FOR MOCKS, STUBS, DUMMIES & TODOS ---');
  const indicators = ['TODO', 'FIXME', 'mock', 'dummy', 'coming soon', 'placeholder'];
  const results = {};
  indicators.forEach(i => results[i] = []);

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (['node_modules', '.next', '.git', 'docs', 'tests', 'scripts'].includes(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(full);
      } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
        const text = fs.readFileSync(full, 'utf-8');
        for (const ind of indicators) {
          const reg = new RegExp(`\\b${ind}\\b`, 'gi');
          const matches = text.match(reg);
          if (matches) {
            results[ind].push({ file: path.relative(process.cwd(), full), count: matches.length });
          }
        }
      }
    }
  }

  scanDir(path.resolve('app'));
  scanDir(path.resolve('components'));
  scanDir(path.resolve('features'));
  scanDir(path.resolve('services'));
  scanDir(path.resolve('repositories'));
  scanDir(path.resolve('actions'));
  scanDir(path.resolve('lib'));

  indicators.forEach(ind => {
    console.log(`Indicator "${ind}": found in ${results[ind].length} files.`);
    if (results[ind].length > 0 && results[ind].length <= 10) {
      results[ind].forEach(r => console.log(`   - ${r.file} (${r.count}x)`));
    } else if (results[ind].length > 10) {
      results[ind].slice(0, 10).forEach(r => console.log(`   - ${r.file} (${r.count}x)`));
      console.log(`   ... and ${results[ind].length - 10} more files`);
    }
  });

  // 4. Database tables vs Model/Repository coverage
  console.log('\n--- [4] DATABASE SCHEMA & TABLE DISCOVERY ---');
  const migrationDir = path.resolve('supabase/migrations');
  const tableSet = new Set();
  if (fs.existsSync(migrationDir)) {
    const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'));
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
      const matches = [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi)];
      for (const m of matches) {
        tableSet.add(m[1]);
      }
    }
  }
  const allTables = [...tableSet].sort();
  console.log(`Total Database Tables Defined in Migrations: ${allTables.length}`);
  console.log('Tables:', allTables.join(', '));
}

runAudit();
