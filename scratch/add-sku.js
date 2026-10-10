const fs = require('fs');
const files = ['returns.state-machine.test.ts', 'returns.idempotency.test.ts'];

files.forEach(f => {
  const p = 'tests/integration/' + f;
  let c = fs.readFileSync(p, 'utf8');
  
  // Add sku before product_name in order_items inserts
  c = c.replace(
    /(order_items[^)]*insert\([^}]+\{[^}]*order_id:[^,]+,)\s*(product_name:)/g,
    (match, before, after) => before + ' sku: `SKU-${Date.now()}-${Math.floor(Math.random()*9999)}`, ' + after
  );
  
  fs.writeFileSync(p, c);
  console.log('Checking ' + f + ':');
  console.log('  Has sku:', c.includes('sku'));
});
