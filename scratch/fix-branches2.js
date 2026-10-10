const fs = require('fs');
const path = require('path');
const dir = 'tests/integration';
fs.readdirSync(dir).filter(f => f.startsWith('returns.') && f.endsWith('.ts')).forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/branch_code:.*,/g, 'branch_code: `B-${Date.now()}-${Math.floor(Math.random()*1000)}`, address: "123 Test St",');
  fs.writeFileSync(p, content);
});
console.log('Done');
