const fs = require('fs');
const path = require('path');
const p = path.join('tests/integration', 'returns.security.test.ts');
let content = fs.readFileSync(p, 'utf8');
content = content.replace(/rejects\.toThrow\("Order not found"\);/g, 'rejects.toThrow("Order must be delivered before requesting a return.");');
fs.writeFileSync(p, content);
console.log('Done');
