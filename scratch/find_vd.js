const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

async function findExportVD() {
  const code = await get('https://static.readdy.ai/static/index-CFOUNqjx.js');
  let idx = code.indexOf('vD as');
  if (idx === -1) idx = code.indexOf('vD:');
  if (idx === -1) idx = code.indexOf(',vD,');
  if (idx === -1) idx = code.indexOf(' vD,');
  console.log('Match at', idx, ':\n', code.substring(Math.max(0, idx - 100), idx + 200));

  // Find where vD is assigned
  let assignIdx = code.indexOf('vD=');
  if (assignIdx !== -1) {
    console.log('Assign at', assignIdx, ':\n', code.substring(Math.max(0, assignIdx - 50), assignIdx + 150));
  }
}

findExportVD();
