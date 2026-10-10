const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'app');
const componentsDir = path.join(__dirname, '..', 'components');
const featuresDir = path.join(__dirname, '..', 'features');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find all instances of new Intl.NumberFormat(...)
  // We need to match the entire new Intl.NumberFormat(...).format(x)
  const regex = /new\s+Intl\.NumberFormat\([^)]*\)\.format\((.*?)\)/g;
  const regexWithOpts = /new\s+Intl\.NumberFormat\([^)]*,\s*\{[^}]*\}\s*\)\.format\((.*?)\)/g;
  
  let modified = false;
  
  const replacer = (match, p1) => {
    modified = true;
    return `formatCurrency(${p1})`;
  };

  content = content.replace(regexWithOpts, replacer);
  content = content.replace(regex, replacer);

  if (modified) {
    const hasImport = /import\s+.*\{[^}]*formatCurrency[^}]*\}.*from\s+['"]@\/lib\/utils['"];/.test(content) 
                      || content.includes('import { formatCurrency } from "@/lib/utils"');
                      
    if (!hasImport) {
      // Find the last import statement
      const imports = content.match(/^import .*$/gm);
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        content = content.replace(lastImport, `${lastImport}\nimport { formatCurrency } from "@/lib/utils";`);
      } else {
        content = `import { formatCurrency } from "@/lib/utils";\n${content}`;
      }
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated currency in ${filePath}`);
  }
}

function run() {
  const allFiles = [
    ...getAllFiles(appDir),
    ...getAllFiles(componentsDir),
    ...getAllFiles(featuresDir)
  ];

  allFiles.forEach(file => {
    try {
      processFile(file);
    } catch (e) {
      console.error(`Error processing ${file}`, e);
    }
  });
}

run();
