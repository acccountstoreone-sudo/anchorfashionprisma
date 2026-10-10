const fs = require('fs');
const path = require('path');
const p = path.join('tests/integration', 'returns.security.test.ts');
let content = fs.readFileSync(p, 'utf8');

// I will just use replace_file_content tool to add error checking manually!
