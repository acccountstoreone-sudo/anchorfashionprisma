const fs = require('fs');
const path = require('path');
const dir = 'tests/integration';
fs.readdirSync(dir).filter(f => f.startsWith('returns.') && f.endsWith('.ts')).forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/let\s+customerId\s*=\s*['"]86f2ca0e-6c38-4314-adf3-ff0cc88d7f6e['"];/g, "let customerId = 'bc067dfd-3df4-46ce-bb93-a6e8b603ee33';");
  fs.writeFileSync(p, content);
});
console.log('Done');
