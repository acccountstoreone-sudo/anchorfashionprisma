const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        results = results.concat(walk(filePath));
      }
    } else {
      if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        results.push(filePath);
      }
    }
  });
  return results;
}

function checkFileCase(baseDir, relativePath) {
  // Check each part of the path against the actual directory listing
  const parts = relativePath.split(/[/\\]/);
  let currentPath = baseDir;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === '.' || part === '..') {
      currentPath = path.resolve(currentPath, part);
      continue;
    }
    
    // Read the directory contents
    let files;
    try {
      files = fs.readdirSync(currentPath);
    } catch (e) {
      return { ok: false, error: `Directory not found: ${currentPath}` };
    }
    
    // Check if the part exists exactly
    if (!files.includes(part)) {
      // Check if it exists with different casing
      const match = files.find(f => f.toLowerCase() === part.toLowerCase());
      if (match) {
        return { ok: false, error: `Case mismatch: "${part}" should be "${match}" in ${path.join(currentPath, part)}` };
      }
      // If we are looking for a module (no extension), try with extensions
      if (i === parts.length - 1) {
        const extMatch = files.find(f => f.toLowerCase().startsWith(part.toLowerCase() + '.'));
        if (extMatch && !extMatch.startsWith(part + '.')) {
            return { ok: false, error: `Case mismatch (extension): "${part}" should be "${extMatch}"` };
        }
      }
    }
    currentPath = path.join(currentPath, match || part);
  }
  return { ok: true };
}

const allFiles = walk(path.join(__dirname, '..'));
let hasErrors = false;

allFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  // Simple regex for imports
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const dir = path.dirname(filePath);
      // We don't check exact file existence because extensions can be omitted,
      // but we can check the directory and file prefix casing
      const parts = importPath.split(/[/\\]/);
      let currentPath = dir;
      for(let i=0; i<parts.length; i++) {
         let p = parts[i];
         if(p === '.' || p === '..') {
             currentPath = path.resolve(currentPath, p);
             continue;
         }
         try {
           const items = fs.readdirSync(currentPath);
           if (!items.includes(p)) {
              // try to find case insensitive
              const wrongCase = items.find(it => it.toLowerCase() === p.toLowerCase());
              if (wrongCase) {
                  console.log(`[ERROR] Case mismatch in ${filePath}`);
                  console.log(`  Import: ${importPath}`);
                  console.log(`  Expected: ${wrongCase} instead of ${p}`);
                  hasErrors = true;
                  break;
              } else if (i === parts.length - 1) {
                  // check if it's a file without extension
                  const fileMatch = items.find(it => {
                      const ext = path.extname(it);
                      const name = path.basename(it, ext);
                      return name.toLowerCase() === p.toLowerCase();
                  });
                  if (fileMatch) {
                      const correctName = path.basename(fileMatch, path.extname(fileMatch));
                      if (correctName !== p) {
                          console.log(`[ERROR] Case mismatch in ${filePath}`);
                          console.log(`  Import: ${importPath}`);
                          console.log(`  Expected: ${correctName} instead of ${p}`);
                          hasErrors = true;
                      }
                  }
              }
           }
           currentPath = path.join(currentPath, p);
         } catch(e) {}
      }
    }
  }
});

if (!hasErrors) {
  console.log("No case mismatches found!");
} else {
  process.exit(1);
}
