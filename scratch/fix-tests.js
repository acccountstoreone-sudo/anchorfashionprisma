const fs = require('fs');
const path = require('path');
const dir = 'tests/integration';
fs.readdirSync(dir).filter(f => f.startsWith('returns.') && f.endsWith('.ts')).forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/await supabase\.from\(['"]profiles['"]\)\.insert\(\{[\s\S]*?\}\);/g, '');
  content = content.replace(/await supabase\.from\(['"]profiles['"]\)\.delete\(\)[\s\S]*?;/g, '');
  fs.writeFileSync(p, content);
});
console.log('Done');
