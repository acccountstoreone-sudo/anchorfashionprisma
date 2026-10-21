const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const scriptArg = process.argv[2];
if (!scriptArg) {
  console.error("Usage: node scripts/run-ts.js <path-to-typescript-script>");
  process.exit(1);
}

const targetFile = path.resolve(process.cwd(), scriptArg);
const jiti = require('jiti')(path.resolve('index.js'), {
  alias: {
    '@': path.resolve('.')
  }
});

// Execute the target script
jiti(targetFile);
