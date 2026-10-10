const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(process.cwd());
let errors = 0;

const fileExistsWithCaseSync = (filepath) => {
  const dir = path.dirname(filepath);
  if (dir === '/' || dir === '.') return true;
  let filenames;
  try {
    filenames = fs.readdirSync(dir);
  } catch (e) {
    return false;
  }
  if (filenames.indexOf(path.basename(filepath)) === -1) {
    return false;
  }
  return fileExistsWithCaseSync(dir);
};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.') || importPath.startsWith('@/')) {
      // Resolve path
      let resolvedPath;
      if (importPath.startsWith('@/')) {
        resolvedPath = path.join(process.cwd(), importPath.substring(2));
      } else {
        resolvedPath = path.join(path.dirname(file), importPath);
      }
      
      // Try with .ts, .tsx, /index.ts, /index.tsx
      const extensions = ['.ts', '.tsx', '/index.ts', '/index.tsx', ''];
      let found = false;
      let matchedExt = '';
      for (const ext of extensions) {
        if (fs.existsSync(resolvedPath + ext)) {
          found = true;
          matchedExt = ext;
          break;
        }
      }
      
      if (found) {
        const fullPath = resolvedPath + matchedExt;
        if (!fileExistsWithCaseSync(fullPath)) {
          console.error(`Case sensitivity error in ${file}: Import '${importPath}' does not match file system casing.`);
          errors++;
        }
      }
    }
  }
});

if (errors === 0) {
  console.log("No case sensitivity issues found!");
} else {
  console.log(`Found ${errors} issues.`);
  process.exit(1);
}
