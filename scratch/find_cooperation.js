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

async function findInvite() {
  const code = await get('https://static.readdy.ai/static/index-CFOUNqjx.js');
  let idx = 0;
  while ((idx = code.indexOf('cooperation', idx)) !== -1) {
    console.log('Match cooperation at', idx, ':\n', code.substring(Math.max(0, idx - 50), idx + 250));
    idx += 11;
  }
}

findInvite();
