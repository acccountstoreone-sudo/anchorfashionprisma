const fs = require('fs');
const path = require('path');
const dir = 'tests/integration';
fs.readdirSync(dir).filter(f => f.startsWith('returns.') && f.endsWith('.ts')).forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/name:\s*['"](.*?)['"],?/g, 'name: "$1", branch_code: `B-${Date.now()}-${Math.floor(Math.random()*1000)}`,');
  fs.writeFileSync(p, content);
});
console.log('Done');
