const fs = require("fs");
const path = require("path");

const pngPath = path.join(__dirname, "..", "public", "icon.png");
if (!fs.existsSync(pngPath)) {
  console.error("public/icon.png not found!");
  process.exit(1);
}

const pngBuf = fs.readFileSync(pngPath);
console.log("Read public/icon.png, bytes:", pngBuf.length);

// Build a valid ICO wrapping the PNG data
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // 1 = ICO
icoHeader.writeUInt16LE(1, 4); // 1 image entry

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(0, 0); // 0 means 256 or custom
icoEntry.writeUInt8(0, 1); // height
icoEntry.writeUInt8(0, 2); // color count
icoEntry.writeUInt8(0, 3); // reserved
icoEntry.writeUInt16LE(1, 4); // color planes
icoEntry.writeUInt16LE(32, 6); // 32 bpp
icoEntry.writeUInt32LE(pngBuf.length, 8); // size of image
icoEntry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

const icoBuf = Buffer.concat([icoHeader, icoEntry, pngBuf]);

// Write to public/favicon.ico
fs.writeFileSync(path.join(__dirname, "..", "public", "favicon.ico"), icoBuf);
console.log("Wrote public/favicon.ico");

// Write to app/favicon.ico
fs.writeFileSync(path.join(__dirname, "..", "app", "favicon.ico"), icoBuf);
console.log("Wrote app/favicon.ico");

// Write apple-touch-icon.png
fs.writeFileSync(path.join(__dirname, "..", "public", "apple-touch-icon.png"), pngBuf);
console.log("Wrote public/apple-touch-icon.png");

// Write favicon-32x32.png and favicon-16x16.png
fs.writeFileSync(path.join(__dirname, "..", "public", "favicon-32x32.png"), pngBuf);
fs.writeFileSync(path.join(__dirname, "..", "public", "favicon-16x16.png"), pngBuf);
console.log("Wrote favicon png variants");

console.log("Favicon generation complete!");
