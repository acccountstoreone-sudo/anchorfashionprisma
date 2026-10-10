const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

let modifiedFiles = 0;

walkDir('app', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let code = fs.readFileSync(filePath, 'utf8');
    let originalCode = code;
    
    // Replace: const { id } = params; -> const { id } = await params;
    // But be careful, there could be different destructured variable names.
    // E.g. const { slug } = params; -> const { slug } = await params;
    // E.g. const { q } = searchParams; -> const { q } = await searchParams;

    code = code.replace(/const\s+\{([^}]+)\}\s*=\s*params\s*;/g, 'const {$1} = await params;');
    code = code.replace(/const\s+\{([^}]+)\}\s*=\s*searchParams\s*;/g, 'const {$1} = await searchParams;');
    
    // Also handle direct usage without destructuring: params.id -> (await params).id
    // But this is harder with regex, let's just see if we hit the destructured ones.
    
    // If it was already destructured inside the function signature: 
    // export default async function Page({ params: { id } }: { params: Promise<{id: string}> })
    // This pattern requires manual fix, but we didn't search for it.
    
    if (code !== originalCode) {
      fs.writeFileSync(filePath, code, 'utf8');
      modifiedFiles++;
      console.log("Added await in: " + filePath);
    }
  }
});

console.log("Modified " + modifiedFiles + " files to await params/searchParams");
