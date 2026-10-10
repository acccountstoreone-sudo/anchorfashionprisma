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
    
    // Fix params type signatures in page.tsx / layout.tsx
    // From: params: { id: string } or params: { slug: string }
    // To: params: Promise<{ id: string }> etc
    
    // Simple regex to find params: { ... } in the props interface
    code = code.replace(/params\s*:\s*\{\s*([a-zA-Z0-9_]+)\s*:\s*string\s*\}/g, 'params: Promise<{ $1: string }>');
    code = code.replace(/params\s*:\s*\{\s*([a-zA-Z0-9_]+)\s*\??:\s*string\s*\}/g, 'params: Promise<{ $1?: string }>');
    code = code.replace(/searchParams\s*:\s*\{\s*\[key:\s*string\]\s*:\s*string\s*\|\s*string\[\]\s*\|\s*undefined\s*\}/g, 'searchParams: Promise<{ [key: string]: string | string[] | undefined }>');
    code = code.replace(/searchParams\s*:\s*\{\s*q\?\:\s*string\s*\}/g, 'searchParams: Promise<{ q?: string }>');
    code = code.replace(/searchParams\s*:\s*\{\s*search\?\:\s*string;\s*page\?\:\s*string\s*\}/g, 'searchParams: Promise<{ search?: string; page?: string }>');
    
    // Also, we must await the params when used
    // const { id } = await params;
    // We can't automatically fix all await usages via regex easily if they just do { params: { id } }, 
    // but looking at earlier grep, most of them do: 
    // export default async function Page({ params }: { params: { id: string } }) {
    //   const { id } = await params; // I saw this in fulfill/page.tsx
    
    // Let's replace any `params.id` with `(await params).id`? No, if it's already destructured as `const { id } = await params;`, then changing the type is enough.
    
    if (code !== originalCode) {
      fs.writeFileSync(filePath, code, 'utf8');
      modifiedFiles++;
      console.log("Fixed types in: " + filePath);
    }
  }
});

console.log("Modified " + modifiedFiles + " files to use Promise for params/searchParams");
