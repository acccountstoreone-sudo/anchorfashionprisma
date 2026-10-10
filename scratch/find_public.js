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

async function findGuestToken() {
  const code = await get('https://static.readdy.ai/static/index-CFOUNqjx.js');
  let idx = 0;
  while ((idx = code.indexOf('/api/public/', idx)) !== -1) {
    console.log(code.substring(idx, idx + 60));
    idx += 12;
  }
}

findGuestToken();
