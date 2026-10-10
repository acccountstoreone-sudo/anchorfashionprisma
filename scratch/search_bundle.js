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

async function findInBundle() {
  const code = await get('https://static.readdy.ai/static/index-CFOUNqjx.js');
  let pos = 0;
  while ((pos = code.indexOf('/project/:', pos)) !== -1) {
    console.log('Match at', pos, ':\n', code.substring(Math.max(0, pos - 150), pos + 300));
    pos += 10;
  }
  
  pos = 0;
  while ((pos = code.indexOf('project_id', pos)) !== -1) {
    console.log('project_id at', pos, ':\n', code.substring(Math.max(0, pos - 100), pos + 200));
    pos += 10;
    if (pos > 50000) break; // only first few
  }
}

findInBundle();
