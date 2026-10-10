const fs = require('fs');
const path = require('path');

const gitFiles = fs.readFileSync('git-files.txt', 'utf8').split('\n').filter(Boolean);
const gitFilesSet = new Set(gitFiles.map(f => f.replace(/\\/g, '/')));

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

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.') || importPath.startsWith('@/')) {
      let resolvedPath;
      if (importPath.startsWith('@/')) {
        resolvedPath = importPath.substring(2);
      } else {
        const relativeToRoot = path.relative(process.cwd(), path.dirname(file));
        resolvedPath = path.join(relativeToRoot, importPath).replace(/\\/g, '/');
      }
      
      // We don't know the extension, but let's see if there is any file in gitFiles that matches this path case-insensitively
      // but fails case-sensitively.
      
      const possibleExtensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
      
      let foundInsensitive = false;
      let actualGitPath = '';
      
      for (const gitFile of gitFilesSet) {
        for (const ext of possibleExtensions) {
           if (gitFile.toLowerCase() === (resolvedPath + ext).toLowerCase()) {
             foundInsensitive = true;
             actualGitPath = gitFile;
             break;
           }
        }
        if (foundInsensitive) break;
      }
      
      if (foundInsensitive) {
        // Now check if it matches case-sensitively
        let foundSensitive = false;
        for (const ext of possibleExtensions) {
          if (gitFilesSet.has(resolvedPath + ext)) {
            foundSensitive = true;
            break;
          }
        }
        if (!foundSensitive) {
          console.error(`Case sensitivity error in ${file}: Import '${importPath}' expects '${actualGitPath}' but case doesn't match.`);
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
