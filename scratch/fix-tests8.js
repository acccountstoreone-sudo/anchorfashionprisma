const fs = require('fs');
const path = require('path');
const dir = 'tests/integration';

fs.readdirSync(dir).filter(f => f.startsWith('returns.') && f.endsWith('.ts')).forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;

  // Add customer_id if missing
  if (content.includes('supabase.from("orders").insert') && !content.includes('customer_id:')) {
    console.log(`Fixing customer_id in ${f}`);
    content = content.replace(/order_number:\s*([^,]+),/g, 'order_number: $1, customer_id: customerId,');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(p, content);
  }
});
console.log('Done');
