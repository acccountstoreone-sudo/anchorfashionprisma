const fs = require('fs');
const path = require('path');
const dir = 'tests/integration';
fs.readdirSync(dir).filter(f => f.startsWith('returns.') && f.endsWith('.ts')).forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/branch_code:\s*`B-\$\{Date\.now\(\)\}-\$\{Math\.floor\(Math\.random\(\)\*1000\)\}`,\s*address:\s*"123 Test St",/g, '');
  
  // also fix the product_name issue
  content = content.replace(/product_name:\s*"Item 1"\s*\n/g, 'product_name: "Item 1", line_total: 200 }\n');
  fs.writeFileSync(p, content);
});
console.log('Done');
