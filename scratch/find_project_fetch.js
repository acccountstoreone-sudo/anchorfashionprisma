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

async function findProjectFetch() {
  const code = await get('https://static.readdy.ai/static/index-CFOUNqjx.js');
  let idx = 0;
  while ((idx = code.indexOf('/api/page_gen/project', idx)) !== -1) {
    console.log('Match at', idx, ':\n', code.substring(Math.max(0, idx - 50), idx + 250));
    idx += 25;
  }
}

findProjectFetch();
