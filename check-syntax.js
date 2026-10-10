const fs = require('fs');
const path = require('path');
const ts = require('typescript');

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

let hasError = false;

walkDir('app', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    const code = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Check for parse diagnostics
    const diagnostics = sourceFile.parseDiagnostics;
    if (diagnostics && diagnostics.length > 0) {
      console.log(`\nSyntax errors in ${filePath}:`);
      diagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
          const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          console.log(`  Line ${line + 1}, Col ${character + 1}: ${message}`);
        } else {
          console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
      });
      hasError = true;
    }
  }
});

if (!hasError) {
  console.log("No syntax errors found in app/ directory.");
}
