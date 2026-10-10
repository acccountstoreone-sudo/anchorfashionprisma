const fs = require('fs');
const path = require('path');
const p = path.join('tests/integration', 'returns.partial.test.ts');
let content = fs.readFileSync(p, 'utf8');

// replace await supabase.from with checking
let count = 0;
content = content.replace(/await supabase\.from\("([^"]+)"\)\.insert\(([^;]+)\);/g, (match, table, args) => {
    count++;
    return `const { error: err${count} } = await supabase.from("${table}").insert(${args});\n    if (err${count}) throw new Error("Insert failed on ${table}: " + err${count}.message);`;
});

fs.writeFileSync(p, content);
console.log('Done');
