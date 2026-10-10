const fs = require('fs');
const path = require('path');
const p = path.join('tests/integration', 'customer-wallet.test.ts');
let content = fs.readFileSync(p, 'utf8');
content = content.replace(/"usr-1"/g, '"bc067dfd-3df4-46ce-bb93-a6e8b603ee33"');
fs.writeFileSync(p, content);
console.log('Done');
