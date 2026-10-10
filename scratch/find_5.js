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

async function findUsagesOf_5() {
  const code = await get('https://static.readdy.ai/static/index-CFOUNqjx.js');
  let idx = 0;
  while ((idx = code.indexOf('_5', idx)) !== -1) {
    const snippet = code.substring(Math.max(0, idx - 50), idx + 100);
    if (snippet.includes('get(') || snippet.includes('post(') || snippet.includes('fetch(') || snippet.includes('url:') || snippet.includes('http')) {
      console.log('Snippet at', idx, ':\n', snippet);
    }
    idx += 2;
  }
}

findUsagesOf_5();
