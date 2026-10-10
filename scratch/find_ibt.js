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

async function findIBt() {
  const code = await get('https://static.readdy.ai/static/index-CFOUNqjx.js');
  let idx = code.indexOf('IBt=');
  if (idx !== -1) {
    console.log('IBt at', idx, ':\n', code.substring(Math.max(0, idx - 50), idx + 200));
  }
}

findIBt();
